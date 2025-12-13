const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { csrfTokenMiddleware } = require('./server/middleware/csrfMiddleware');
const { optionalAuth } = require('./server/middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Apply optional authentication middleware to all routes
// This allows us to access user info in views without requiring authentication
app.use(optionalAuth);

// Public routes (no authentication required)
const publicRoutes = require('./server/routes/publicRoutes');
app.use('/', publicRoutes);

// Authentication routes (with CSRF protection)
const authRoutes = require('./server/routes/authRoutes');
app.use('/auth', authRoutes);

// Protected routes (require authentication and have CSRF protection)
const protectedRoutes = require('./server/routes/protectedRoutes');
app.use('/', protectedRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});