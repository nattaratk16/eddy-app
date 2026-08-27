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
        // ธีม Genie: eddy 50–300 = ฟ้าอ่อน (พื้นผิว/เส้นขอบ/hover), 400–900 = น้ำเงินแบรนด์ (accent)
        eddy: {
          50: '#EEF5FC',
          100: '#E1ECF8',
          200: '#CBDFF2',
          300: '#A9C8E8',
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
        // Accent (indigo/violet) - จับคู่กับ eddy blue สำหรับไล่เฉด gradient แบบพรีเมียม
        accent: {
          50: '#EEF0FE',
          100: '#E0E3FD',
          200: '#C7CCFB',
          300: '#A5ADF7',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
        },
        // Sparing premium accent (mascot sparkle, small badges) - navy+gold reads elegant
        gold: {
          DEFAULT: '#C9A15A',
          light: '#E0BE7C',
        },
        // ธีม Genie: ตัวอักษรดำอมฟ้าเย็น (cool near-black) เข้ากับพื้นฟ้า
        ink: {
          DEFAULT: '#1F2733',
          soft: '#566072',
          muted: '#8A97A8',
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
      },
      // สเกลตัวอักษรมาตรฐาน (role-based) — ใช้ text-h1/h2/h3/body/caption แทนการสุ่ม text-xs/sm/lg
      // ผูก line-height + น้ำหนัก + letter-spacing มาให้ในตัว เพื่อให้ทุกหน้าสมดุลเป็นชุดเดียวกัน
      fontSize: {
        display: ['2.75rem', { lineHeight: '1.08', fontWeight: '700', letterSpacing: '-0.025em' }],
        h1: ['2rem', { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-0.02em' }],
        h2: ['1.5rem', { lineHeight: '1.25', fontWeight: '700', letterSpacing: '-0.01em' }],
        h3: ['1.1875rem', { lineHeight: '1.35', fontWeight: '600' }],
        'body-lg': ['1.0625rem', { lineHeight: '1.65' }],
        body: ['0.9375rem', { lineHeight: '1.6' }],
        caption: ['0.8125rem', { lineHeight: '1.5' }],
        micro: ['0.6875rem', { lineHeight: '1.45', letterSpacing: '0.01em' }],
      },
      borderRadius: {
        clay: '18px',
        'clay-sm': '12px',
        'clay-lg': '26px',
      },
      boxShadow: {
        // ธีม Genie: การ์ดลอยนุ่มๆ เงาอมฟ้าเบาๆ (ไม่แบนแบบ Notion)
        clay: '0 6px 20px -8px rgba(59, 110, 180, 0.18), 0 1px 3px rgba(31, 39, 51, 0.04)',
        'clay-sm': '0 2px 8px -3px rgba(59, 110, 180, 0.14), 0 1px 2px rgba(31, 39, 51, 0.04)',
        'clay-inset': 'inset 0 1px 2px rgba(31, 39, 51, 0.04)',
        'clay-pop': '0 20px 48px -12px rgba(31, 39, 51, 0.24), 0 4px 12px -6px rgba(59, 110, 180, 0.18)',
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
        // เอนทรานซ์: เลื่อนขึ้น + จางเข้า (ใช้ทำ stagger ตอนหน้าโหลด)
        fadeInUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        // จุดเวลาปัจจุบันในปฏิทิน - เต้นเบาๆ
        pulseDot: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.35)', opacity: '0.7' },
        },
        // พื้นหลังแสงเรืองพาสเทลลอยไหว (glow blobs) - นุ่ม สว่าง โปร่ง
        blobA: { '0%,100%': { transform: 'translate(0,0) scale(1)' }, '50%': { transform: 'translate(6%,4%) scale(1.18)' } },
        blobB: { '0%,100%': { transform: 'translate(0,0) scale(1.1)' }, '50%': { transform: 'translate(-7%,3%) scale(0.92)' } },
        blobC: { '0%,100%': { transform: 'translate(0,0) scale(1.05)' }, '50%': { transform: 'translate(5%,-4%) scale(1.22)' } },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        floatSlow: 'floatSlow 6s ease-in-out infinite',
        blink: 'blink 4s ease-in-out infinite',
        pop: 'pop 0.25s ease-out',
        'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fadeIn 0.4s ease-out both',
        'scale-in': 'scaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        'blob-a': 'blobA 22s ease-in-out infinite',
        'blob-b': 'blobB 28s ease-in-out infinite',
        'blob-c': 'blobC 25s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
