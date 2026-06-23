module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    fontFamily: {
      sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
    },
    extend: {
      colors: {
        ink: '#0B1A14',
        forest: '#047857',
        leaf: '#059669',
        sun: '#F59E0B',
        mist: '#ECFDF5',
        sand: '#F6FAF8',
      },
      boxShadow: {
        soft: '0 20px 60px rgba(15, 23, 42, 0.12)',
        lift: '0 18px 40px rgba(15, 81, 50, 0.18)',
        card: '0 6px 22px -10px rgba(11,40,28,.14)',
        'card-hover': '0 12px 34px -14px rgba(11,40,28,.20)',
      },
      backgroundImage: {
        'hero-radial': 'radial-gradient(circle at top left, rgba(34, 197, 94, 0.18), transparent 30%), radial-gradient(circle at top right, rgba(245, 158, 11, 0.16), transparent 25%), linear-gradient(135deg, #08111d 0%, #123024 48%, #1b4332 100%)'
      }
    }
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')]
};
