/*
 * Authentication Test Script
 * 
 * This script tests the authentication utilities.
 */

const { hashPassword, comparePassword, generateAccessToken, generateRefreshToken } = require('./server/utils/authUtils');

async function testAuth() {
  try {
    console.log('Testing authentication utilities...\n');
    
    // Test password hashing
    const password = 'mySecurePassword123';
    console.log(`Original password: ${password}`);
    
    const hashedPassword = await hashPassword(password);
    console.log(`Hashed password: ${hashedPassword}\n`);
    
    // Test password comparison
    const isMatch = await comparePassword(password, hashedPassword);
    console.log(`Password match: ${isMatch}`);
    
    const isWrongMatch = await comparePassword('wrongPassword', hashedPassword);
    console.log(`Wrong password match: ${isWrongMatch}\n`);
    
    // Test token generation
    const user = {
      id: 1,
      email: 'test@example.com',
      uname: 'testuser'
    };
    
    const accessToken = generateAccessToken(user);
    console.log(`Access token: ${accessToken}\n`);
    
    const refreshToken = generateRefreshToken(user);
    console.log(`Refresh token: ${refreshToken}\n`);
    
    console.log('Authentication tests completed successfully!');
    
  } catch (error) {
    console.error('Error during authentication tests:', error);
  }
}

// Run the test function
testAuth();