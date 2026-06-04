module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B1320',
        forest: '#0F5132',
        leaf: '#2F855A',
        sun: '#F59E0B',
        mist: '#EAF3EE',
        sand: '#F8F6F0'
      },
      boxShadow: {
        soft: '0 20px 60px rgba(15, 23, 42, 0.12)',
        lift: '0 18px 40px rgba(15, 81, 50, 0.18)'
      },
      backgroundImage: {
        'hero-radial': 'radial-gradient(circle at top left, rgba(34, 197, 94, 0.18), transparent 30%), radial-gradient(circle at top right, rgba(245, 158, 11, 0.16), transparent 25%), linear-gradient(135deg, #08111d 0%, #123024 48%, #1b4332 100%)'
      }
    }
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')]
};