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
        // สีแบรนด์หลัก - ไล่จาก #0A5DEB ในพาเลตของมาสคอต
        // 50–300 = ฟ้าอ่อน (พื้นผิว/เส้นขอบ/hover), 400–900 = น้ำเงินแบรนด์ (ปุ่ม/ตัวอักษรเน้น)
        eddy: {
          50: '#EFF5FF',
          100: '#DCE8FE',
          200: '#BDD5FD',
          300: '#8FBAFB',
          400: '#5A97F6',
          500: '#0A5DEB', // สีหลักจากพาเลต
          600: '#0A4CC4',
          700: '#0C3F9E',
          800: '#0F357E',
          900: '#0F2A5F',
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
        // สีรอง - ฟ้าสว่าง #64D7FF จากพาเลต ใช้คู่กับ eddy blue ทำ gradient (น้ำเงิน -> ฟ้า)
        accent: {
          50: '#ECFBFF',
          100: '#D5F5FF',
          200: '#AEECFF',
          300: '#64D7FF', // สีฟ้าสว่างจากพาเลต
          400: '#2FC2F2',
          // 500 ถูกใช้เป็นปลาย gradient ของปุ่มที่มีตัวอักษรสีขาว (from-eddy-500 to-accent-500)
          // จึงต้องเข้มพอให้ตัวอักษรขาวอ่านออก - #0E7FA8 ให้คอนทราสต์ 4.55:1 ผ่านเกณฑ์ WCAG AA
          // (ฟ้าสว่าง #64D7FF จากพาเลตอยู่ที่ระดับ 300 ใช้เป็นพื้น/ไฮไลต์แทน)
          500: '#0E7FA8',
          600: '#0B7099',
          700: '#0D6B8E',
        },
        // ระดับภาระงาน (Workload Score) - เขียว = ยังว่าง, ส้ม = เริ่มแน่น, แดง = แน่นมาก
        // ผ่าน validator ของ dataviz skill ครบทุกข้อ (lightness band / chroma / CVD / contrast >= 3:1)
        // อย่าเพิ่มเฉดกลางเองโดยไม่รันเช็คใหม่ - เขียว->เหลือง->ส้ม->แดง 4 ขั้นตกเช็ค CVD ทุกชุดที่ลอง
        load: {
          free: '#22A45D',
          tight: '#F0682B',
          full: '#C81E24',
        },
        // สีเสริมจากพาเลตมาสคอต - ใช้เป็นจุดเน้นเล็กๆ (ป้าย, ไฮไลต์, ประกายมาสคอต)
        // ชื่อ gold คงไว้เพราะมีที่เรียกใช้อยู่ แต่ค่าจริงเป็นเหลืองของมาสคอตแล้ว
        gold: {
          DEFAULT: '#FED926',
          light: '#FFE875',
        },
        // สีแบรนด์รองจากพาเลตเดียวกัน (เหลือง/ส้ม/ส้มแดง/ชมพู)
        brand: {
          yellow: '#FED926',
          orange: '#FD823F',
          coral: '#F04017',
          pink: '#FF8FB6',
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
        // ฟอนต์กลมมนสำหรับโลโก้/หัวเรื่องหน้าแรก
        brand: ['var(--font-brand)', 'var(--font-display)'],
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
        clay: '0 6px 20px -8px rgba(10, 93, 235, 0.16), 0 1px 3px rgba(31, 39, 51, 0.04)',
        'clay-sm': '0 2px 8px -3px rgba(10, 93, 235, 0.12), 0 1px 2px rgba(31, 39, 51, 0.04)',
        'clay-inset': 'inset 0 1px 2px rgba(31, 39, 51, 0.04)',
        'clay-pop': '0 20px 48px -12px rgba(31, 39, 51, 0.24), 0 4px 12px -6px rgba(10, 93, 235, 0.16)',
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
        // มาสคอตตอนดีใจ - เด้งช้ากว่า animate-bounce ของ tailwind ที่เร็วเกินไปสำหรับภาพใหญ่
        bounceSlow: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12%)' },
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
        'bounce-slow': 'bounceSlow 1.6s ease-in-out infinite',
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
