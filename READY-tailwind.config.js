/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./index.html",
    "./main.jsx"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      }
    }
  },
  plugins: []
};

export default config;
