# Components Guide

## Overview
This guide explains how to use the reusable components created for the application. These components help maintain consistency across the UI and reduce code duplication.

## Component Directory
All reusable components are located in the `views/components/` directory. Each component is an EJS partial that can be included in any page template.

## Available Components

### 1. Alert Component
Displays styled alert messages with different types.

**Usage:**
```ejs
<%- include('../components/alert', {type: 'success', message: 'Operation completed successfully!', dismissible: true}) %>
```

**Parameters:**
- `type`: 'success', 'error', 'warning', 'info' (default: 'info')
- `message`: The message to display
- `dismissible`: boolean to show close button (default: false)

### 2. Button Component
Creates consistent buttons with various styles and sizes.

**Usage:**
```ejs
<%- include('../components/button', {type: 'primary', size: 'medium', text: 'Submit', submit: true}) %>
```

**Parameters:**
- `type`: 'primary', 'secondary', 'danger', 'success' (default: 'primary')
- `size`: 'small', 'medium', 'large' (default: 'medium')
- `href`: URL for link button (optional)
- `submit`: boolean for submit button (default: false)
- `disabled`: boolean (default: false)
- `classes`: additional CSS classes (optional)
- `id`: element ID (optional)
- `text`: button text (required)

### 3. Card Component
Provides a consistent container for content with optional header and footer.

**Usage:**
```ejs
<%- include('../components/card', {title: 'User Profile', children: '<p>User details go here</p>'}) %>
```

**Parameters:**
- `title`: Card title (optional)
- `footer`: Card footer content (optional)
- `classes`: additional CSS classes (optional)
- `id`: element ID (optional)
- `children`: Card content (required)

**Note:** The `children` parameter should be a string containing HTML content. For complex content with nested components, it's recommended to create separate template files.

### 4. Form Field Component
Creates consistent form inputs with labels and error handling.

**Usage:**
```ejs
<%- include('../components/formField', {name: 'email', label: 'Email Address', type: 'email', required: true, error: errorMessage}) %>
```

**Parameters:**
- `name`: Field name (required)
- `label`: Field label (optional)
- `type`: Input type (text, email, password, etc.) (default: 'text')
- `placeholder`: Placeholder text (optional)
- `value`: Field value (optional)
- `error`: Error message (optional)
- `required`: Boolean for required field (default: false)
- `classes`: Additional classes (optional)

### 5. Navbar Component
Provides consistent navigation bar with user authentication status.

**Usage:**
```ejs
<%- include('../components/navbar', {user: user, tokenExpiration: tokenExpiration}) %>
```

**Parameters:**
- `user`: User object (optional)
- `tokenExpiration`: Token expiration timestamp (optional)

### 6. Footer Component
Displays consistent footer across all pages.

**Usage:**
```ejs
<%- include('../components/footer') %>
```

**Parameters:** None

### 7. Modal Component
Creates overlay dialogs for additional content or actions.

**Usage:**
```ejs
<%- include('../components/modal', {id: 'confirmModal', title: 'Confirm Action', children: '<p>Are you sure?</p>'}) %>
```

**Parameters:**
- `id`: Modal ID (required)
- `title`: Modal title (optional)
- `closable`: Boolean to show/hide close button (default: true)
- `classes`: Additional classes (optional)
- `children`: Modal content (required)

**Note:** For complex modal content with nested components, create separate template files and include them as strings.

### 8. Breadcrumb Component
Shows navigation hierarchy for better UX.

**Usage:**
```ejs
<%- include('../components/breadcrumb', {items: [{text: 'Home', href: '/'}, {text: 'Profile', href: '/profile'}]}) %>
```

**Parameters:**
- `items`: Array of breadcrumb items [{text, href}] (required)

## Implementation Examples

### Using Components in Pages
To use components in your page templates:

```ejs
<%- include('../layout/header') %>

<div class="max-w-4xl mx-auto p-4">
  <%- include('../components/breadcrumb', {items: [{text: 'Home', href: '/'}, {text: 'Profile', href: '/profile'}]}) %>
  
  <div class="bg-white rounded-lg shadow-md overflow-hidden">
    <div class="px-6 py-4 border-b border-gray-200">
      <h3 class="text-lg font-medium text-gray-900">User Profile</h3>
    </div>
    <div class="p-6">
      <div class="space-y-4">
        <p>Welcome, <%= user.name %>!</p>
        <%- include('../components/button', {type: 'primary', text: 'Edit Profile', href: '/settings'}) %>
      </div>
    </div>
  </div>
</div>

<%- include('../components/footer') %>
```

### Handling Complex Content
For components that require complex content with nested components, create separate template files:

1. Create a template file (e.g., `views/templates/profile-content.ejs`):
```ejs
<div class="space-y-4">
  <p>Welcome, <%= user.name %>!</p>
  <%- include('../components/button', {type: 'primary', text: 'Edit Profile', href: '/settings'}) %>
  <%- include('../components/button', {type: 'secondary', text: 'View Orders', href: '/orders'}) %>
</div>
```

2. Include it in your main template:
```ejs
<%- include('../components/card', {title: 'User Profile', children: include('../templates/profile-content')}) %>
```

## Styling and Customization

### Adding Custom Classes
Most components accept additional CSS classes through the `classes` parameter:

```ejs
<%- include('../components/button', {
  type: 'primary',
  text: 'Custom Button',
  classes: 'mt-4 w-full md:w-auto'
}) %>
```

### Component CSS
Components use Tailwind CSS classes for styling. If you need to customize the appearance, you can:

1. Pass additional classes via the `classes` parameter
2. Modify the component file directly
3. Add custom CSS in your main stylesheet

## JavaScript Integration

Some components require JavaScript for full functionality:

### Alert Dismissal
Alerts with `dismissible: true` can be closed with JavaScript:

```javascript
// Auto-hide alerts after 5 seconds
document.addEventListener('DOMContentLoaded', function() {
  const alerts = document.querySelectorAll('.alert-dismissible');
  alerts.forEach(alert => {
    setTimeout(() => {
      alert.style.opacity = '0';
      setTimeout(() => {
        alert.remove();
      }, 300);
    }, 5000);
  });
});
```

### Modal Functionality
Modals require JavaScript to show/hide:

```javascript
// Show modal
document.getElementById('openModalButton').addEventListener('click', function() {
  document.getElementById('myModal').classList.remove('hidden');
});

// Hide modal
document.querySelectorAll('.close-modal').forEach(button => {
  button.addEventListener('click', function() {
    const modalId = this.getAttribute('data-modal');
    document.getElementById(modalId).classList.add('hidden');
  });
});
```

## Best Practices

### Component Reusability
1. Keep components generic and reusable
2. Use parameters to customize behavior
3. Document all parameters clearly
4. Provide sensible defaults

### Performance Considerations
1. Only include components when needed
2. Avoid deeply nested components
3. Minimize logic within components
4. Use EJS includes instead of embedding HTML

### Accessibility
1. Use semantic HTML elements
2. Include proper ARIA attributes
3. Ensure keyboard navigation
4. Provide sufficient color contrast

## Troubleshooting

### Common Issues
1. **Component not rendering**: Check that the path is correct and all required parameters are passed
2. **Styling issues**: Verify Tailwind classes are correct and not conflicting
3. **JavaScript not working**: Ensure the component's JavaScript is included in the page
4. **EJS Syntax Errors**: When nesting components, ensure proper syntax and avoid complex multiline strings

### Debugging Tips
1. Use browser developer tools to inspect component HTML
2. Check the console for JavaScript errors
3. Verify parameter values are being passed correctly
4. Test components in isolation

### EJS Syntax Considerations
When working with components that contain other components:

1. **Avoid complex multiline strings**: Instead of passing complex HTML as a string parameter, create separate template files
2. **Proper nesting**: Ensure all EJS tags are properly opened and closed
3. **Parameter passing**: Make sure all required parameters are provided to components

## Extending Components

### Creating New Components
To create a new component:

1. Create a new `.ejs` file in `views/components/`
2. Add a comment block documenting parameters
3. Implement the component logic
4. Test in various contexts

### Example Component Template
```ejs
<%#
Component Name
Description of what this component does
Parameters:
- param1: description (required/optional, default)
- param2: description (required/optional, default)
%>

<% const param1 = typeof param1 !== 'undefined' ? param1 : 'default'; %>
<% const param2 = typeof param2 !== 'undefined' ? param2 : ''; %>

<div class="component-base-class <%= param2 %>">
  <%= param1 %>
</div>
```

## Conclusion
These reusable components help maintain consistency and reduce development time. By following the patterns established in these components, you can create additional reusable UI elements for your application. Remember to test components thoroughly and follow the best practices outlined in this guide.