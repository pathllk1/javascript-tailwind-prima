const { hashPassword, comparePassword, generateAccessToken, generateRefreshToken, storeRefreshToken, verifyRefreshToken, removeRefreshToken } = require('../utils/authUtils');
const { prisma } = require('../../lib/prisma');

// Render login page
exports.loginPage = (req, res) => {
  // Check if there's a success message from signup
  const success = req.query.success === 'true' ? 'Account created successfully! You can now log in.' : null;
  res.render('pages/login', { title: 'Login', error: null, success });
};

// Handle login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.render('pages/login', { title: 'Login', error: 'Email and password are required', success: null });
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return res.render('pages/login', { title: 'Login', error: 'Invalid email or password', success: null });
    }
    
    // Check password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.render('pages/login', { title: 'Login', error: 'Invalid email or password', success: null });
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Store refresh token
    await storeRefreshToken(user.id, refreshToken);
    
    // Set cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    // Redirect to profile page after successful login
    res.redirect('/profile');
  } catch (error) {
    console.error('Login error:', error);
    res.render('pages/login', { title: 'Login', error: 'An error occurred during login', success: null });
  }
};

// Render signup page
exports.signupPage = (req, res) => {
  res.render('pages/signup', { title: 'Sign Up', error: null, success: null });
};

// Handle signup
exports.signup = async (req, res) => {
  try {
    const { name, uname, email, password } = req.body;
    
    // Validate input
    if (!name || !uname || !email || !password) {
      return res.render('pages/signup', { title: 'Sign Up', error: 'All fields are required', success: null });
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.render('pages/signup', { title: 'Sign Up', error: 'User with this email already exists', success: null });
    }
    
    // Check if username is taken
    const existingUsername = await prisma.user.findUnique({
      where: { uname }
    });
    
    if (existingUsername) {
      return res.render('pages/signup', { title: 'Sign Up', error: 'Username is already taken', success: null });
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        uname,
        email,
        password: hashedPassword
      }
    });
    
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Store refresh token
    await storeRefreshToken(user.id, refreshToken);
    
    // Set cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    // Redirect to home page with success message
    res.redirect('/?signup_success=true');
  } catch (error) {
    console.error('Signup error:', error);
    res.render('pages/signup', { title: 'Sign Up', error: 'An error occurred during signup', success: null });
  }
};

// Handle logout
exports.logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      // Remove refresh token from database
      await removeRefreshToken(refreshToken);
    }
    
    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    
    // Redirect to home page with success message
    res.redirect('/?logout_success=true');
  } catch (error) {
    console.error('Logout error:', error);
    res.redirect('/');
  }
};

// Refresh token
exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token not provided' });
    }
    
    // Verify refresh token
    const decoded = await verifyRefreshToken(refreshToken);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Generate new access token
    const newAccessToken = generateAccessToken(user);
    
    // Set new access token cookie
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    // Send JSON response with new expiration time
    const newExpiration = Date.now() + (15 * 60 * 1000); // 15 minutes from now
    return res.json({ 
      message: 'Token refreshed successfully',
      expiration: newExpiration
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    if (error.message === 'NOT_FOUND') {
      return res.status(401).json({ message: 'Refresh token not found.' });
    } else if (error.message === 'EXPIRED') {
      return res.status(401).json({ message: 'Refresh token has expired.' });
    } else {
      return res.status(401).json({ message: 'Invalid refresh token.' });
    }
  }
};