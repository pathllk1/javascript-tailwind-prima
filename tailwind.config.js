/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.ejs",
    "./public/js/**/*.js"
  ],
  theme: {
    extend: {
      // Extend the default theme here
      colors: {
        // Example custom colors
        // 'brand-blue': '#1DA1F2',
        // 'brand-purple': '#794CFF',
      },
      spacing: {
        // Example custom spacing
        // '18': '4.5rem',
        // '88': '22rem',
      }
    },
  },
  plugins: [
    // Add plugins here
    // require('@tailwindcss/forms'),
    // require('@tailwindcss/typography'),
  ],
}