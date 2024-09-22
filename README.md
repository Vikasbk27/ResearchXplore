# ResearchXplore

## Overview
**ResearchXplore** is a platform designed to help users discover research papers across various fields. It allows users to register, log in, and explore a collection of papers with features for filtering by title, author, and domain. Additionally, users can like and review papers to provide feedback.

## Features
- **User Authentication**: Register and log in to access the platform
- **Explore and Search**: Find research papers by title, author, or domain
- **Like and Review**: Express your opinions on papers
- **User-Friendly Interface**: Dynamic filtering options for a seamless experience

## Getting Started

1. **Clone the Repository**
    ```bash
    git clone https://github.com/Vikasbk27/ResearchXplore.git
    ```

2. **Install Dependencies**
    ```bash
    npm install
    ```

3. **Setup Database**
   Ensure `database.db` is present in the root directory. This file holds the papers and users' data.

4. **Run the Application**
    ```bash
    node app.js
    ```
   The server will be running on [http://localhost:3000](http://localhost:3000).

5. **Access the Platform**
   Open a browser and navigate to [http://localhost:3000](http://localhost:3000). Register or log in to explore the platform.

## File Structure
- **app.js**: Main server file
- **public/**: Static assets (CSS, JS)
- **views/**: EJS templates for the frontend
- **node_modules/**: Project dependencies

## Technologies Used
- **Node.js**: Backend server
- **Express.js**: Web framework
- **SQLite3**: Database
- **EJS**: Embedded JavaScript templating
- **Bootstrap**: Frontend framework for UI design

## Important
- This is a local platform,users need to manually add papers and urls by registering and then logging in
- Login in,use navbar to access addpaper 
