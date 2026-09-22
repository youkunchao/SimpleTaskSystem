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
          // 统一正文墨色（替代散落的 #3a2a1a 棕字，偏暖不脏）
          ink: '#3B3355',
          // 深海军蓝：用于浅底高对比正文
          navy: '#26415E',
        },
      },
      borderRadius: {
        // 儿童友好的大圆角语义令牌
        kid: '1.25rem',
        blob: '1.75rem',
      },
      boxShadow: {
        // 柔和弥散阴影，替代生硬的默认阴影
        kid: '0 10px 30px -12px rgba(60, 50, 90, 0.28)',
        'kid-lg': '0 18px 40px -16px rgba(60, 50, 90, 0.35)',
        // 立体卡通按钮的厚度
        'kid-3d': '0 5px 0 0 rgba(0, 0, 0, 0.18)',
      },
    },
  },
  plugins: [],
};
