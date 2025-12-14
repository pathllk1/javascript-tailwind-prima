/**
 * AJAX Response Middleware
 * Sends only the main content for AJAX requests instead of full HTML
 */

function ajaxResponseMiddleware(req, res, next) {
  // Store the original render function
  const originalRender = res.render;

  // Override render to handle AJAX requests
  res.render = function(view, options, callback) {
    // Check if this is an AJAX request
    const isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest';

    if (isAjax) {
      // For AJAX requests, render normally but the client will extract the main content
      originalRender.call(this, view, options, callback);
    } else {
      // For normal requests, render as usual
      originalRender.call(this, view, options, callback);
    }
  };

  next();
}

module.exports = ajaxResponseMiddleware;
