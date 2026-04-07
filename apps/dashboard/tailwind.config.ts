import type { Config } from 'tailwindcss';
import path from 'path';

const root = path.resolve(__dirname);

export default {
  content: [
    path.join(root, 'index.html'),
    path.join(root, 'src/**/*.{ts,tsx}'),
  ],
  theme: {
    extend: {
      colors: {
        telivity: {
          teal: '#06bdb4',
          'dark-teal': '#00a692',
          'light-teal': '#2cd1b9',
          orange: '#f2641b',
          'orange-lt': '#ff7d36',
          yellow: '#eec517',
          'deep-blue': '#016491',
          purple: '#5838c0',
          navy: '#23273d',
          slate: '#444863',
          'light-grey': '#f0f0f6',
          'mid-grey': '#bbbbc4',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'Arial', 'Helvetica', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
