import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3370FF',
        background: '#F7F8FA',
        danger: '#FF4D4F',
        success: '#52C41A',
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
}

export default config
