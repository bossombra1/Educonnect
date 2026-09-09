/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        ink: '#17322d',
        paper: '#f5f7f4',
        moss: '#286457',
        mint: '#dcece4',
        line: '#d7e1dc',
        coral: '#b95e49',
      },
      boxShadow: { soft: '0 18px 60px rgba(28, 62, 53, 0.09)' },
    },
  },
  plugins: [],
};
