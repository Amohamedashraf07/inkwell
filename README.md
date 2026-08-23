# Inkwell — now with a real database

Your app used to store everything (accounts, passwords, library, cart, orders) in
the browser's memory — so it all vanished on refresh. It's now backed by a real
**Node.js + Express + MongoDB** API, so:

- Login IDs and passwords are stored for real (passwords are encrypted, never
  stored as plain text)
- Everything a reader borrows or buys is saved in **My Library**
- Every purchase is saved in **Order history**
- Wishlist and cart persist across logins and page reloads
- The Admin desk manages real books and real user accounts

Nothing about the look of your site changed — `index.html`'s design is untouched.
Only the "brain" (`script.js` + a new `backend/` folder) changed.

```
inkwell/
├── frontend/
│   ├── index.html      ← your original design, unchanged
│   └── script.js        ← talks to the API instead of fake in-memory data
├── backend/              ← the new Node.js/Express/MongoDB server
└── README.md             ← you are here
```

---

## 1. Run it on your own computer first

You'll need [Node.js](https://nodejs.org) (v18+) installed, and a MongoDB
database. Easiest option: a **free MongoDB Atlas cluster** (no install needed).

### 1a. Get a free database (MongoDB Atlas)
1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account.
2. Create a free "M0" cluster (takes ~2 minutes).
3. Under **Database Access**, add a database user with a username/password.
4. Under **Network Access**, click "Allow access from anywhere" (0.0.0.0/0) —
   fine for a small project like this.
5. Click **Connect → Drivers**, copy the connection string. It looks like:
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   Add `inkwell` as the database name right before the `?`:
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/inkwell?retryWrites=true&w=majority`

### 1b. Configure and start the backend
```bash
cd backend
npm install
cp .env.example .env
```
Open `.env` and paste in your MongoDB connection string as `MONGODB_URI`.
Set `JWT_SECRET` to any long random string (this signs login sessions).

Load the starter book catalog + two demo accounts:
```bash
npm run seed
```
This creates:
- **Admin login:** `admin123` / `12345` (use the "Admin Login" tab)
- **Reader login:** `user123` / `12345` (use the "User Login" tab)

Start the server:
```bash
npm start
```
You should see `Inkwell API listening on port 5000`.

### 1c. Open the frontend
Open `frontend/index.html` directly in your browser (or serve it with any
static file server / the "Live Server" VS Code extension). It's already
pointed at `http://localhost:5000/api` by default, so it should just work.

Try logging in with `admin123` / `12345` or `user123` / `12345`, or create a
new account from "Create account."

---

## 2. Put it online for real (free hosting)

Once it works locally, here's the simplest free path: **Render** for the
backend (and you're already on Atlas for the database), and any static host
for the frontend.

### 2a. Deploy the backend to Render
1. Push the `inkwell` folder to a GitHub repo.
2. Go to https://render.com, sign up, click **New → Web Service**, connect
   your repo, and set:
   - **Root directory:** `backend`
   - **Build command:** `npm install`
   - **Start command:** `npm start`
3. Under **Environment**, add the same variables from your `.env`:
   `MONGODB_URI`, `JWT_SECRET`, and set `CORS_ORIGIN` to your frontend's URL
   once you know it (step 2b) — you can update this after.
4. Deploy. Render gives you a URL like `https://inkwell-api.onrender.com`.
5. Run the seed command once, from your own machine, pointed at the live
   database (or add a temporary "Shell" run of `npm run seed` in Render's
   dashboard).

*Free-tier note: Render's free web services "sleep" after inactivity, so the
first request after a quiet period can take ~30–50 seconds to wake up. That's
normal, not a bug.*

### 2b. Deploy the frontend
Any static host works — easiest is **Netlify** or **Render's Static Site**:
1. Before deploying, open `frontend/script.js` and change the very first
   real line of code:
   ```js
   const API_BASE = window.INKWELL_API_BASE || 'http://localhost:5000/api';
   ```
   to point at your live backend:
   ```js
   const API_BASE = window.INKWELL_API_BASE || 'https://inkwell-api.onrender.com/api';
   ```
2. Drag the `frontend` folder into https://app.netlify.com/drop (no account
   needed for a quick test), or connect the repo the same way as the backend.
3. Once you have your frontend's URL, go back to Render → your backend →
   Environment → set `CORS_ORIGIN` to that exact URL, and redeploy the
   backend, so the browser is allowed to call your API.

That's it — you now have a hosted app with a real database.

---

## What changed under the hood

- **Auth:** JWT tokens (30-day sessions), passwords hashed with bcrypt —
  never stored or shown in plain text (the admin "Manage Users" table used
  to reveal raw passwords; it no longer can, by design — use Edit to set a
  new one instead).
- **Data model:** Books, Users (with embedded library/wishlist/cart),
  Orders, and Reviews are separate MongoDB collections — see
  `backend/src/models/`.
- **API:** documented by the route files in `backend/src/routes/` — auth,
  books, library, wishlist, cart, orders, reviews, users, stats.
- Book cover art is still auto-fetched from the free Google Books API,
  same as before.

## Honest limitations

- Checkout is still a **mock payment form** — no real card processor is
  connected. Wiring up real payments (Stripe, etc.) is a separate step I'm
  happy to help with if you want it.
- This is a solid learning/small-project setup, not a hardened
  production system (rate limiting, email verification, and password-reset
  flows aren't included).
