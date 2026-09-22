Inkwell 📚

Inkwell is a digital library web application that allows users to browse books, borrow or purchase them, manage their wishlist and cart, and keep track of their library and orders.

The application uses a Node.js + Express.js backend with MongoDB to store user and application data permanently.

Features

- User registration and login
- Secure password hashing
- Browse books
- Borrow books
- My Library
- Wishlist
- Shopping cart
- Order history
- Book reviews
- Admin dashboard
- Book management
- User management
- Persistent data using MongoDB

Tech Stack

- HTML
- CSS
- JavaScript
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcrypt
- Google Books API

Project Structure

Inkwell/
│
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
├── .gitignore
└── README.md

How to Run

1. Clone the repository

git clone <your-repository-url>
cd Inkwell

2. Install backend dependencies

cd backend
npm install

3. Configure environment variables

Create a ".env" file inside the "backend" folder:

MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
CORS_ORIGIN=*

4. Seed the database

npm run seed

5. Start the backend

npm start

The backend will run on:

http://localhost:5000

6. Open the frontend

Open "frontend/index.html" in your browser, or use VS Code Live Server.

Demo Accounts

Admin

Username: admin123
Password: 12345

User

Username: user123
Password: 12345

Security

Passwords are hashed using bcrypt and are never stored as plain text.

Authentication is handled using JWT tokens.

Note

The checkout system currently uses a mock payment form for demonstration purposes. No real payment is processed.

Future Improvements

- Real payment gateway
- Email verification
- Password reset
- Improved security and rate limiting
- Production deployment

---

Developed as a learning project for building a full-stack digital library application.