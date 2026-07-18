/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary navy/blue scale - the "EDDY" brand color (elegant, modern)
        eddy: {
          50: '#F3F7FC',
          100: '#E4EDF8',
          200: '#C6D9EF',
          300: '#9DBEE2',
          400: '#6B98CE',
          500: '#3D72B4',
          600: '#2C5690',
          700: '#204170',
          800: '#172E52',
          900: '#0D1C33',
        },
        // Pastel accent palette - functional (user-chosen category colors).
        // First 6 are original values, kept byte-for-byte so existing categories never recolor.
        // The 10 added ones were generated + CVD-validated with the dataviz skill to fill hue gaps.
        pastel: {
          pink: '#FFD3E2',
          'pink-dark': '#F7A9C4',
          yellow: '#FFF3B8',
          'yellow-dark': '#FFE183',
          mint: '#C8F7E0',
          'mint-dark': '#94EBC0',
          blue: '#D6EBFF',
          'blue-dark': '#A9D4FF',
          peach: '#FFE3D1',
          'peach-dark': '#FFC6A3',
          lilac: '#E5DBFF',
          'lilac-dark': '#C9B3FF',
          amber: '#FBE4C8',
          'amber-dark': '#E4A249',
          lime: '#E5ECCB',
          'lime-dark': '#ABBC54',
          olive: '#D9F0D3',
          'olive-dark': '#83C575',
          teal: '#C8F2E9',
          'teal-dark': '#2BCCB4',
          sky: '#C6F1F6',
          'sky-dark': '#00C8D8',
          indigo: '#DEE7FF',
          'indigo-dark': '#96ABFF',
          violet: '#F4DFFC',
          'violet-dark': '#D296E8',
          plum: '#FDDDF3',
          'plum-dark': '#E590CF',
          coral: '#FFDCDE',
          'coral-dark': '#F88D96',
          rose: '#FFDED4',
          'rose-dark': '#F89177',
        },
        // Sparing premium accent (mascot sparkle, small badges) - navy+gold reads elegant
        gold: {
          DEFAULT: '#C9A15A',
          light: '#E0BE7C',
        },
        ink: {
          DEFAULT: '#14202E',
          soft: '#47576B',
          muted: '#8593A3',
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
      },
      borderRadius: {
        clay: '20px',
        'clay-sm': '12px',
        'clay-lg': '28px',
      },
      boxShadow: {
        // Elegant soft elevation - refined "premium SaaS card" look (navy-tinted, low opacity)
        clay: '0 18px 40px -16px rgba(13, 28, 51, 0.18), 0 2px 8px rgba(13, 28, 51, 0.06)',
        'clay-sm': '0 8px 20px -10px rgba(13, 28, 51, 0.16), 0 1px 4px rgba(13, 28, 51, 0.05)',
        'clay-inset': 'inset 0 2px 6px rgba(13, 28, 51, 0.08)',
        'clay-pop': '0 24px 48px -12px rgba(13, 28, 51, 0.28)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-14px) rotate(3deg)' },
        },
        blink: {
          '0%, 90%, 100%': { transform: 'scaleY(1)' },
          '95%': { transform: 'scaleY(0.1)' },
        },
        pop: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        floatSlow: 'floatSlow 6s ease-in-out infinite',
        blink: 'blink 4s ease-in-out infinite',
        pop: 'pop 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
