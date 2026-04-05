/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas:  '#080808',
        panel:   '#0f0f0f',
        surface: '#171717',
        border:  '#1e1e1e',
        muted:   '#3d3d3d',
        dim:     '#6a6a6a',
        primary: '#f0f0f0',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
