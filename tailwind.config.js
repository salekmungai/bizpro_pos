/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './public/**/*.html',          // To include all HTML files in the public directory
    './src/**/*.{js,jsx,ts,tsx}',  // For JavaScript or TypeScript files in the src directory
    './views/**/*.ejs',           // Include all HTML files in the views directory
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          500: '#f97316', // Ensure this exists
        },
      },
    },
  },
  plugins: [],
}
