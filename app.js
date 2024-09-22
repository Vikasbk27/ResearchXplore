const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Session setup
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true
}));

// Middleware to add session to locals
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

// Database setup
const db = new sqlite3.Database('database.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        password TEXT,
        interests TEXT,
        domain TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS papers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        author TEXT,
        field TEXT,
        url TEXT
    )`);
});
db.run(`CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paper_id INTEGER,
    user_id INTEGER,
    rating INTEGER,
    review TEXT,
    FOREIGN KEY (paper_id) REFERENCES papers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
)`);


// Routes
app.get('/', (req, res) => {
    db.all(`
      SELECT p.*, AVG(r.rating) AS avg_rating
      FROM papers p
      JOIN reviews r ON p.id = r.paper_id
      GROUP BY p.id
      ORDER BY avg_rating DESC
      LIMIT 6
    `, (err, rows) => {
      if (err) {
        return res.send('Error fetching papers');
      }
      res.render('index', { papers: rows });
    });
  });

app.post('/review', (req, res) => {
    const { paperId, rating, review } = req.body;
    const userId = req.session.user.id;
    db.run(`INSERT INTO reviews (paper_id, user_id, rating, review) VALUES (?, ?, ?, ?)`, paperId, userId, rating, review, (err) => {
        if (err) {
            return res.status(500).send('Error submitting review');
        }
        res.redirect('/dashboard');
    });
});


app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) {
            return res.send('Error fetching user');
        }
        if (!row) {
            return res.render('login', { error: 'Invalid username or password' });
        }
        bcrypt.compare(password, row.password, (err, result) => {
            if (result) {
                req.session.user = row;
                res.redirect('/dashboard');
            } else {
                res.render('login', { error: 'Invalid username or password' });
            }
        });
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send('Error logging out');
        }
        res.redirect('/');
    });
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    const { username, password, interests, domain } = req.body;

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.*[0-9])(?=.*[a-z]).{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.redirect('/register'); 
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(`INSERT INTO users (username, password, interests, domain) VALUES (?, ?, ?, ?)`, [username, hashedPassword, interests, domain], (err) => {
        if (!err) {
            res.redirect('/login');
        } else {
            res.redirect('/register');
        }
    });
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    const interests = req.session.user.interests.split(',').map(interest => interest.trim());
    db.all(`SELECT * FROM papers WHERE ${interests.map(interest => `field LIKE?`).join(' OR ')}`, interests.map(interest => `%${interest}%`), (err, rows) => {
        if (err) {
            return res.send('Error fetching papers');
        }
        const paperPromises = rows.map((paper) => {
            return new Promise((resolve, reject) => {
                db.all(`SELECT * FROM reviews WHERE paper_id =?`, paper.id, (err, reviews) => {
                    if (err) {
                        reject(err);
                    } else {
                        paper.reviews = reviews;
                        resolve(paper);
                    }
                });
            });
        });
        Promise.all(paperPromises).then((papersWithReviews) => {
            // Calculate statistics
            const paperCount = {};
            interests.forEach(interest => {
                paperCount[interest] = rows.filter(paper => paper.field.includes(interest)).length;
            });
            res.render('dashboard', { researchPapers: papersWithReviews, paperStats: paperCount });
        }).catch((err) => {
            console.error(err);
            res.send('Error fetching papers');
        });
    });
});

app.post('/review', (req, res) => {
    const { paperId, rating, review } = req.body;
    const userId = req.session.user.id;
    db.run(`INSERT INTO reviews (paper_id, user_id, rating, review) VALUES (?, ?, ?, ?)`, paperId, userId, rating, review, (err) => {
        if (err) {
            return res.status(500).send('Error submitting review');
        }
        res.redirect('/dashboard');
    });
});


app.get('/search', (req, res) => {
    res.render('search');
});

app.post('/search', (req, res) => {
    const { query, filter } = req.body;
    let sql = 'SELECT * FROM papers WHERE ';
    if (filter === 'title') {
        sql += 'title LIKE ?';
    } else if (filter === 'author') {
        sql += 'author LIKE ?';
    } else if (filter === 'url') {
        sql += 'url LIKE ?';
    } else {
        sql += 'title LIKE ? OR author LIKE ? OR url LIKE ?';
    }
    const params = [`%${query}%`];
    if (filter === 'all') {
        params.push(`%${query}%`, `%${query}%`);
    }
    db.all(sql, params, (err, rows) => {
        if (err) {
            res.send('Error fetching search results');
        } else {
            res.render('searchResults', { query, results: rows });
        }
    });
});

app.get('/addPaper', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('addPaper');
});

app.post('/addPaper', (req, res) => {
    const { title, author, field, url } = req.body;
    db.run(`INSERT INTO papers (title, author, field, url) VALUES (?, ?, ?, ?)`, [title, author, field, url], (err) => {
        if (!err) {
            res.redirect('/dashboard');
        } else {
            res.send('Error adding paper');
        }
    });
});

app.get('/profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('profile', { user: req.session.user });
});

app.post('/profile', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    const { username, password, interests, domain } = req.body;

    const userId = req.session.user.id;

    let sql = `UPDATE users SET username = ?, interests = ?, domain = ? WHERE id = ?`;
    let params = [username, interests, domain, userId];

    if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        sql = `UPDATE users SET username = ?, password = ?, interests = ?, domain = ? WHERE id = ?`;
        params = [username, hashedPassword, interests, domain, userId];
    }

    db.run(sql, params, (err) => {
        if (!err) {
            req.session.user.username = username;
            req.session.user.interests = interests;
            req.session.user.domain = domain;
            res.redirect('/profile');
        } else {
            res.send('Error updating profile');
        }
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
