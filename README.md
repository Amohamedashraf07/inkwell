Inkwell

Inkwell is a digital library application where users can browse books, borrow or purchase them, manage their wishlist and cart, and view their library and order history.

The project originally stored data in the browser, but it now uses a Node.js + Express + MongoDB backend for persistent data storage.

Features

- User registration and login
- Secure password hashing with bcrypt
- JWT-based authentication
- Browse and manage books
- Borrowed books saved to My Library
- Persistent wishlist and shopping cart
- Purchase and order history
- Admin login and book management
- Admin user management
- Book reviews
- MongoDB database for persistent storage
- Google Books API for book cover images

Project Structure

inkwell/
├── frontend/
│   ├── index.html
│   └── script.js
│
├── backend/
│   ├── src/
│   │   ├── models/
│   │   ├── routes/
│   │   └── ...
│   ├── package.json
│   └── .env.example
│
└── README.md

Technologies Used

Frontend

- HTML
- CSS
- JavaScript

Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcrypt

API

- Google Books API
- REST API between the frontend and backend

Running the Project Locally

1. Requirements

Install:

- Node.js 18 or later
- MongoDB Atlas account or a local MongoDB installation

2. Configure MongoDB

Create a MongoDB Atlas cluster and copy the connection string.

Inside the "backend" folder:

npm install

Create a ".env" file based on ".env.example":

MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
CORS_ORIGIN=*

3. Add Demo Data

Run:

npm run seed

This adds sample books and demo accounts.

Admin

Username: admin123
Password: 12345

Reader

Username: user123
Password: 12345

4. Start the Backend

npm start

The API will run on:

http://localhost:5000

5. Start the Frontend

Open:

frontend/index.html

You can also use the Live Server extension in VS Code.

The frontend is configured to communicate with:

http://localhost:5000/api

Authentication

User passwords are not stored as plain text.

Passwords are hashed using bcrypt, and login sessions use JWT tokens.

This allows users to log in again without losing their account data.

Database

MongoDB stores the application's persistent data.

The main collections include:

- Users
- Books
- Orders
- Reviews

User-related data such as library items, wishlist items, and cart items are associated with the user's account.

Admin Features

The admin section allows authorized administrators to:

- Add books
- Edit books
- Remove books
- View registered users
- Manage user accounts
- View application statistics

Passwords are never displayed in the admin panel.

Deployment

The application can be deployed using:

- MongoDB Atlas — database
- Render — backend
- Netlify or Render Static Site — frontend

For deployment, update the frontend API URL to point to the deployed backend.

Example:

const API_BASE =
  window.INKWELL_API_BASE ||
  'https://your-backend-url.onrender.com/api';

Then configure the backend's "CORS_ORIGIN" with the deployed frontend URL.

Current Limitations

This project is currently intended as a learning/small-project application.

- Checkout uses a mock payment form.
- No real payment gateway is connected.
- Email verification is not implemented.
- Password reset is not implemented.
- Rate limiting is not currently implemented.

Real payment integration, email verification, password recovery, and additional security features can be added in future versions.

License

This project is for educational and development purposes.