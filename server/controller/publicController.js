// Handles public routes
exports.home = (req, res) => {
  // Check for success messages
  let successMessage = null;
  
  if (req.query.signup_success === 'true') {
    successMessage = 'Account created successfully! Welcome to our platform.';
  } else if (req.query.logout_success === 'true') {
    successMessage = 'You have been logged out successfully.';
  }
  
  res.render('pages/index', { 
    title: 'Home', 
    user: req.user || null,
    tokenExpiration: req.tokenExpiration || null,
    success: successMessage
  });
};

exports.about = (req, res) => {
  res.render('pages/about', { 
    title: 'About Us', 
    user: req.user || null,
    tokenExpiration: req.tokenExpiration || null,
    success: null
  });
};

exports.contact = (req, res) => {
  res.render('pages/contact', { 
    title: 'Contact Us', 
    user: req.user || null,
    tokenExpiration: req.tokenExpiration || null,
    success: null
  });
};

exports.contactPost = (req, res) => {
  // Simple POST handler
  const { name, email, message } = req.body;
  console.log('Contact form submitted:', { name, email, message });
  
  // Render the contact page with a success message
  res.render('pages/contact', {
    title: 'Contact Us',
    user: req.user || null,
    tokenExpiration: req.tokenExpiration || null,
    success: 'Thank you for your message! We will get back to you soon.',
    error: null
  });
};