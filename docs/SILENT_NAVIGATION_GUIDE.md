# Silent Navigation System Documentation

## Overview
The Silent Navigation System enables AJAX-based page transitions without full page reloads, providing a smooth, seamless user experience similar to Single Page Applications (SPAs).

## How It Works

### 1. **Client-Side Navigation Handler** (`silent-navigation.js`)
- Intercepts all click events on navigation links
- Fetches pages via AJAX instead of full page reload
- Updates the DOM with new content
- Manages browser history using History API
- Shows loading indicator during navigation
- Implements lazy loading with hover-based prefetching

### 2. **Server-Side AJAX Support** (`ajaxResponseMiddleware.js`)
- Detects AJAX requests via `X-Requested-With: XMLHttpRequest` header
- Returns full HTML (client extracts the main content)
- Maintains full session and authentication support

## Features

✅ **Smooth Transitions**
- Fade in/out animations during page changes
- Loading indicator (blue gradient progress bar)
- Smooth scroll to top

✅ **Smart Navigation**
- Automatic link interception
- Preserves browser history
- Handles back/forward buttons correctly
- Prevents double navigation

✅ **Security**
- Works with existing authentication
- Maintains session integrity
- Preserves CSRF protection

✅ **Performance Enhancement**
- **Lazy Loading** - Preloads pages on hover for instant navigation
- **Cache Management** - Stores prefetched pages for immediate display
- **Smart Prefetching** - Automatically cancels prefetch on mouseout

✅ **Compatibility**
- Works with all existing EJS templates
- No template changes required
- Progressive enhancement (falls back to full reload if needed)

## Configuration

### Links That Skip Silent Navigation
The system automatically skips navigation for:
1. **External Links** - `href.startsWith('http')` or `href.startsWith('//')`
2. **Anchor Links** - `href.startsWith('#')`
3. **Auth Routes** - `/auth/login`, `/auth/logout`, `/auth/signup`
4. **Excel Route** - `/excel` (file downloads)
5. **Manual Skip** - Links with `data-no-navigate` attribute

### Lazy Loading Configuration
The lazy loading feature has the following configurable options:
- **Hover Delay**: 50ms (configurable in the SilentNavigator class)
- **Cache Size**: Unlimited (managed by JavaScript Map with automatic cleanup)
- **Cache Strategy**: Pages are removed from cache when navigated to

### Example: Skip Navigation for Specific Link
```html
<a href="/some-page" data-no-navigate>Skip Silent Navigation</a>
```

## Events

### Page Changed Event
Listen for page changes in your scripts:

```javascript
window.addEventListener('page-changed', (e) => {
  const { url } = e.detail;
  console.log('Page changed to:', url);
  // Re-initialize any custom scripts
});
```

## Re-initialization Hooks

The system automatically re-initializes:
- **Timer** - Token expiration timer
- **Dropdown Menu** - User menu dropdown
- **Auth** - Authentication-related functionality
- **Custom Scripts** - Via `page-changed` event

### Add Custom Re-initialization
```javascript
window.addEventListener('page-changed', (e) => {
  // Your custom re-initialization code
  initializeMyCustomFeature();
});
```

## Performance Benefits

1. **Reduced Bandwidth** - Only content changes, not entire HTML/CSS/JS
2. **Faster Transitions** - No script re-execution, no style recalculation
3. **Better UX** - Seamless transitions, loading indicator feedback
4. **Preserved State** - Session, cookies, and scroll position handling
5. **Preemptive Loading** - Pages load on hover, resulting in instant navigation

## Troubleshooting

### Scripts Not Executing After Navigation
Add a listener for the `page-changed` event:
```javascript
window.addEventListener('page-changed', () => {
  // Re-initialize your script
  myScript.init();
});
```

### Form Submissions Still Full Page Reload
Form submissions (POST/PUT/DELETE) intentionally cause full reloads for security. This is by design. For SPA-like forms, you'd need to add form interception separately.

### Logout Not Working
Logout and auth routes automatically skip silent navigation, so they work as expected.

### Styling Issues After Navigation
Clear any CSS transitions/animations that might interfere:
```css
main {
  transition: opacity 0.3s ease;
}
```

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- IE 11: ⚠️ Requires polyfills for fetch and Promise

## Future Enhancements

1. ~~**Lazy Loading** - Load links on hover~~ (IMPLEMENTED)
2. **Cache Management** - Advanced cache eviction policies
3. **Prefetch** - Configurable prefetch strategies
4. **Form Interception** - AJAX form submissions
5. **State Management** - Better state persistence

## Example: Custom Script Re-initialization

```javascript
// In your custom script
class MyFeature {
  init() {
    // Initialize functionality
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Setup your listeners
  }
}

const myFeature = new MyFeature();

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    myFeature.init();
  });
} else {
  myFeature.init();
}

// Re-initialize after silent navigation
window.addEventListener('page-changed', () => {
  myFeature.init();
});
```

## Disable Silent Navigation Globally

To disable the feature, comment out or remove the script from `header.ejs`:

```html
<!-- <script src="/js/silent-navigation.js" defer></script> -->
```

## API Reference

### SilentNavigator Class

**Constructor**
```javascript
const navigator = new SilentNavigator();
```

**Methods**
- `navigateTo(url)` - Navigate to a URL
- `showLoadingState()` - Display loading indicator
- `hideLoadingState()` - Hide loading indicator
- `initializePageScripts()` - Re-initialize all page scripts
- `handlePopState(e)` - Handle browser back/forward
- `prefetchPage(url)` - Preload a page for instant navigation
- `handleLinkHover(e)` - Handle mouseover events for lazy loading
- `handleLinkHoverEnd(e)` - Handle mouseout events for lazy loading

**Properties**
- `currentUrl` - Current page URL
- `isNavigating` - Navigation in progress flag
- `prefetchCache` - Map storing prefetched pages
- `hoverTimers` - Map storing hover timeout IDs
- `hoverDelay` - Delay in ms before prefetching (default: 50ms)