const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jwtSecret, jwtRefreshSecret, accessTokenExpiry, refreshTokenExpiry } = require('../config/authConfig');
const { prisma } = require('../../lib/prisma');

// Hash password
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Generate access token
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, uname: user.uname, createdAt: user.createdAt },
    jwtSecret,
    { expiresIn: accessTokenExpiry }
  );
};

// Generate refresh token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, uname: user.uname, createdAt: user.createdAt },
    jwtRefreshSecret,
    { expiresIn: refreshTokenExpiry }
  );
};

// Store refresh token in database
const storeRefreshToken = async (userId, refreshToken) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
  
  return await prisma.token.create({
    data: {
      refreshToken,
      expiresAt,
      userId
    }
  });
};

// Verify refresh token
const verifyRefreshToken = async (refreshToken) => {
  try {
    // Check if token exists in database
    const storedToken = await prisma.token.findUnique({
      where: { refreshToken }
    });
    
    if (!storedToken) {
      throw new Error('NOT_FOUND');
    }
    
    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      // Delete expired token
      await prisma.token.delete({
        where: { id: storedToken.id }
      });
      throw new Error('EXPIRED');
    }
    
    // Verify token signature
    const decoded = jwt.verify(refreshToken, jwtRefreshSecret);
    return decoded;
  } catch (error) {
    // Re-throw specific errors so middleware can handle them appropriately
    if (error.message === 'NOT_FOUND' || error.message === 'EXPIRED') {
      throw error;
    }
    throw new Error('INVALID_SIGNATURE');
  }
};

// Remove refresh token
const removeRefreshToken = async (refreshToken) => {
  return await prisma.token.deleteMany({
    where: { refreshToken }
  });
};

module.exports = {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  verifyRefreshToken,
  removeRefreshToken
};