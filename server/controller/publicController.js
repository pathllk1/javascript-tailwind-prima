// Handles public routes
exports.home = (req, res) => {
  res.render('pages/index', { title: 'Home' });
};

exports.about = (req, res) => {
  res.render('pages/about', { title: 'About Us' });
};

exports.contact = (req, res) => {
  res.render('pages/contact', { title: 'Contact Us' });
};

exports.contactPost = (req, res) => {
  // Simple POST handler
  const { name, email, message } = req.body;
  console.log('Contact form submitted:', { name, email, message });
  res.send('Thank you for your message!');
};
