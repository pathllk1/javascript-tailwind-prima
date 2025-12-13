const jwt = require('jsonwebtoken');
const { jwtSecret, jwtRefreshSecret } = require('../config/authConfig');
const { verifyRefreshToken } = require('../utils/authUtils');
const { prisma } = require('../../lib/prisma');

// Authentication middleware
const authenticate = async (req, res, next) => {
  // Get token from cookies first, then from header
  let token = req.cookies.accessToken;
  
  if (!token) {
    // Fallback to authorization header
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  }
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }
  
  try {
    // Verify access token
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    // Add token expiration time to request for template use
    req.tokenExpiration = decoded.exp * 1000; // Convert to milliseconds
    next();
  } catch (error) {
    // If access token is expired, try to refresh it
    if (error.name === 'TokenExpiredError') {
      // Try to refresh the token using refresh token from cookies
      const refreshToken = req.cookies.refreshToken;
      
      if (!refreshToken) {
        return res.status(401).json({ message: 'Access token expired and no refresh token provided.' });
      }
      
      try {
        // Verify refresh token
        const refreshDecoded = await verifyRefreshToken(refreshToken);
        
        // Find user
        const user = await prisma.user.findUnique({
          where: { id: refreshDecoded.id }
        });
        
        if (!user) {
          return res.status(401).json({ message: 'User not found.' });
        }
        
        // Generate new access token
        const newAccessToken = jwt.sign(
          { id: user.id, email: user.email, uname: user.uname, createdAt: user.createdAt },
          jwtSecret,
          { expiresIn: '15m' } // 15 minutes
        );
        
        // Set new access token cookie
        res.cookie('accessToken', newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 15 * 60 * 1000 // 15 minutes
        });
        
        // Set user in request and continue
        req.user = user;
        // Add token expiration time to request for template use
        const newDecoded = jwt.decode(newAccessToken);
        req.tokenExpiration = newDecoded.exp * 1000; // Convert to milliseconds
        next();
      } catch (refreshError) {
        // If refresh fails, treat as unauthenticated
        req.user = null;
        req.tokenExpiration = null;
        return next();
      }
    } else {
      res.status(400).json({ message: 'Invalid token.' });
    }
  }
};

// Optional authentication middleware (for pages that can be viewed by both authenticated and unauthenticated users)
const optionalAuth = async (req, res, next) => {
  // Get token from cookies first, then from header
  let token = req.cookies.accessToken;
  
  if (!token) {
    // Fallback to authorization header
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  }
  
  if (!token) {
    req.user = null;
    req.tokenExpiration = null;
    return next();
  }
  
  try {
    // Verify access token
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    // Add token expiration time to request for template use
    req.tokenExpiration = decoded.exp * 1000; // Convert to milliseconds
    next();
  } catch (error) {
    // If access token is expired, try to refresh it
    if (error.name === 'TokenExpiredError') {
      // Try to refresh the token using refresh token from cookies
      const refreshToken = req.cookies.refreshToken;
      
      if (!refreshToken) {
        req.user = null;
        req.tokenExpiration = null;
        return next();
      }
      
      try {
        // Verify refresh token
        const refreshDecoded = await verifyRefreshToken(refreshToken);
        
        // Find user
        const user = await prisma.user.findUnique({
          where: { id: refreshDecoded.id }
        });
        
        if (!user) {
          req.user = null;
          req.tokenExpiration = null;
          return next();
        }
        
        // Generate new access token
        const newAccessToken = jwt.sign(
          { id: user.id, email: user.email, uname: user.uname, createdAt: user.createdAt },
          jwtSecret,
          { expiresIn: '15m' } // 15 minutes
        );
        
        // Set new access token cookie
        res.cookie('accessToken', newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 15 * 60 * 1000 // 15 minutes
        });
        
        // Set user in request and continue
        req.user = user;
        // Add token expiration time to request for template use
        const newDecoded = jwt.decode(newAccessToken);
        req.tokenExpiration = newDecoded.exp * 1000; // Convert to milliseconds
        next();
      } catch (refreshError) {
        // If refresh fails, treat as unauthenticated
        req.user = null;
        req.tokenExpiration = null;
        return next();
      }
    } else {
      req.user = null;
      req.tokenExpiration = null;
      next();
    }
  }
};

module.exports = {
  authenticate,
  optionalAuth
};