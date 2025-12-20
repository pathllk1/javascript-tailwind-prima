const express = require('express');
const path = require('path');
const http = require('http');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const securityHeaders = require('./server/middleware/securityHeaders');
const cspNonce = require('./server/middleware/cspNonce');
const { inputSanitization } = require('./server/middleware/inputSanitization');
const { csrfTokenMiddleware } = require('./server/middleware/csrfMiddleware');
const { optionalAuth } = require('./server/middleware/authMiddleware');
const ajaxResponseMiddleware = require('./server/middleware/ajaxResponseMiddleware');
const socketService = require('./server/utils/socket');

// Import background updater for live stock data
const { startBackgroundUpdater } = require('./server/utils/live-stock/backgroundUpdater');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Socket.IO service
const io = socketService.initialize(server);

// Make io accessible in other files
app.set('io', io);

// CSP nonce middleware (must be before securityHeaders)
app.use(cspNonce);

// Security middleware
app.use(securityHeaders);

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Input sanitization middleware
app.use(inputSanitization);

// AJAX response middleware
app.use(ajaxResponseMiddleware);

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Serve Chart.js locally for strict CSP (same-origin)
app.use('/vendor/chartjs', express.static(path.join(__dirname, 'node_modules', 'chart.js', 'dist')));

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

// Start the background updater for live stock data
startBackgroundUpdater();

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('WebSocket server is running');
});