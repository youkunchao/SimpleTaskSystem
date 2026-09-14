/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        kid: ['"Comic Sans MS"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      colors: {
        kid: {
          yellow: '#FFD93D',
          orange: '#FF8C42',
          pink: '#FF6B9D',
          purple: '#A78BFA',
          blue: '#60A5FA',
          green: '#34D399',
          bg: '#FFF8E7',
        },
      },
    },
  },
  plugins: [],
};
