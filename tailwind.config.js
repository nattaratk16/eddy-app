/** @type {import('tailwindcss').Config} */
module.exports = {
  // โหมดมืดสั่งด้วยคลาส .dark บน <html> (ตั้งค่าโดย ThemeScript ใน app/layout.tsx)
  darkMode: 'class',
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
        // ค่าจริงอยู่ที่ตัวแปร CSS ใน app/globals.css (ชุดสว่าง :root / ชุดมืด .dark)
        // เขียนเป็น rgb(var(--x) / <alpha-value>) เพื่อให้คลาสแบบ text-ink-muted/70 ยังใช้ได้
        eddy: {
          50: 'rgb(var(--c-eddy-50) / <alpha-value>)',
          100: 'rgb(var(--c-eddy-100) / <alpha-value>)',
          200: 'rgb(var(--c-eddy-200) / <alpha-value>)',
          300: 'rgb(var(--c-eddy-300) / <alpha-value>)',
          400: 'rgb(var(--c-eddy-400) / <alpha-value>)',
          500: 'rgb(var(--c-eddy-500) / <alpha-value>)',
          600: 'rgb(var(--c-eddy-600) / <alpha-value>)',
          700: 'rgb(var(--c-eddy-700) / <alpha-value>)',
          800: 'rgb(var(--c-eddy-800) / <alpha-value>)',
          900: 'rgb(var(--c-eddy-900) / <alpha-value>)',
        },
        // พื้นการ์ด - เดิมเขียน bg-white ตรงๆ แต่ bg-white ต้องแยกจาก text-white
        // (text-white บนปุ่มสีต้องขาวเสมอ ส่วนพื้นการ์ดต้องมืดลงในโหมดมืด)
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        // พื้นทึบคอนทราสต์สูง (tooltip กราฟ, ปุ่มเน้น, ฟองแชทของผู้ใช้) - เดิมคือ bg-ink
        // โหมดมืดไม่ได้พลิกเป็นสีอ่อน แต่เป็น "พื้นมืดที่ยกระดับขึ้น" เพื่อให้ text-white ยังอ่านออก
        inverse: 'rgb(var(--c-inverse) / <alpha-value>)',
        // ตัวอักษรบนชิปพาสเทล - ชิปเป็นพื้นสว่างเสมอทั้งสองโหมด สีนี้จึงไม่พลิกตาม
        'chip-ink': '#0C3F9E',
        // Pastel accent palette - functional (user-chosen category colors).
        // First 6 are original values, kept byte-for-byte so existing categories never recolor.
        // The next 10 were generated + CVD-validated with the dataviz skill to fill hue gaps.
        //
        // The last 8 (mustard..wine) were added once the first 16 had saturated the hue circle:
        // measured in OKLCH they all sit on one thin ring (L 0.91-0.96, C 0.03-0.08), which is why
        // blue/indigo are only ΔE 1.4 apart and peach/amber, coral/rose, violet/plum, lime/olive
        // are all under 2. Another hue at that lightness would have landed on top of a neighbour,
        // so the 8 open a second axis instead - lightness:
        //   soft (L 0.80) - still pastel, keeps `text-eddy-700` on the chip (contrast 4.8-5.3)
        //   deep (L 0.53) - needs `text-white` on the chip instead (contrast 5.0-5.8)
        // Every one is >= ΔE 10 from all 16 originals and from each other, and the worst pair in
        // the full 24 is still the pre-existing blue/indigo, i.e. nothing got harder to tell apart.
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
          // -- ชั้นอ่อน (L 0.80) - เข้มกว่า 16 สีแรกหนึ่งขั้น แต่ยังใช้ตัวอักษร eddy-700 ได้ --
          mustard: '#DABB50',
          'mustard-dark': '#A18300',
          azure: '#7BC6FF',
          'azure-dark': '#018ED6',
          jade: '#66D7A2',
          'jade-dark': '#009F6A',
          orchid: '#E7A0ED',
          'orchid-dark': '#B65CBF',
          // -- ชั้นเข้ม (L 0.53) - ต้องใช้ตัวอักษรสีขาวบนพื้นนี้ (eddy-700 คอนทราสต์ไม่ผ่าน) --
          bronze: '#896500',
          'bronze-dark': '#715200',
          grape: '#7353BE',
          'grape-dark': '#613BAB',
          pine: '#007C7A',
          'pine-dark': '#006664',
          wine: '#B43858',
          'wine-dark': '#9F1644',
        },
        // สีรอง - ฟ้าสว่าง #64D7FF จากพาเลต ใช้คู่กับ eddy blue ทำ gradient (น้ำเงิน -> ฟ้า)
        accent: {
          50: 'rgb(var(--c-accent-50) / <alpha-value>)',
          100: 'rgb(var(--c-accent-100) / <alpha-value>)',
          200: 'rgb(var(--c-accent-200) / <alpha-value>)',
          300: 'rgb(var(--c-accent-300) / <alpha-value>)',
          400: 'rgb(var(--c-accent-400) / <alpha-value>)',
          500: 'rgb(var(--c-accent-500) / <alpha-value>)',
          600: 'rgb(var(--c-accent-600) / <alpha-value>)',
          700: 'rgb(var(--c-accent-700) / <alpha-value>)',
        },
        // ระดับภาระงาน (Workload Score) - เขียว = ยังว่าง, ส้ม = เริ่มแน่น, แดง = แน่นมาก
        // ผ่าน validator ของ dataviz skill ครบทุกข้อ (lightness band / chroma / CVD / contrast >= 3:1)
        // อย่าเพิ่มเฉดกลางเองโดยไม่รันเช็คใหม่ - เขียว->เหลือง->ส้ม->แดง 4 ขั้นตกเช็ค CVD ทุกชุดที่ลอง
        load: {
          free: '#22A45D',
          tight: '#F0682B',
          full: '#C81E24',
        },
        // Academic vs Non-Academic ในกราฟภาระงานกลุ่ม (WorkloadPanel) - คนละความหมายกับ `load` ข้างบน
        // (load = ระดับความแน่นของตาราง, kind = ประเภทของงานที่ครองเวลานั้น) เลยตั้งใจเลือกคู่สีคนละโทน
        // ผ่าน validator ของ dataviz skill ครบทุกข้อ (lightness band / chroma / CVD ΔE 18.2 / contrast >= 3:1)
        kind: {
          academic: '#4C6FE0',
          nonAcademic: '#E85D75',
        },
        // กราฟวงกลม Eisenhower วันนี้ (สำคัญ vs ไม่สำคัญ ของงานด่วน) - คนละความหมายกับ load/kind ข้างบน
        // ผ่าน validator ของ dataviz skill ครบทุกข้อ (chroma >= 0.1 / CVD ΔE 31-32 / contrast >= 3:1)
        eisenhower: {
          important: '#8544E0',
          routine: '#C46F1E',
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
          // เฉดเพิ่มเติมที่คุมคอนทราสต์ให้อ่านออกจริง
          red: '#D92D20',        // ตัวอักษรขาวบนพื้นนี้ 4.83:1 ผ่าน AA
          green: '#2FB344',      // ตัวอักษรเข้มบนพื้นนี้ 5.48:1 ผ่าน AA
          'orange-ink': '#D95B14', // ส้มเข้มพอที่จะใช้เป็นตัวอักษรบนพื้นฟ้าอ่อนได้ (3.17:1)
        },
        // ตัวอักษรหลัก/รอง/จาง - พลิกเป็นโทนสว่างในโหมดมืด (ดู globals.css)
        ink: {
          DEFAULT: 'rgb(var(--c-ink) / <alpha-value>)',
          soft: 'rgb(var(--c-ink-soft) / <alpha-value>)',
          muted: 'rgb(var(--c-ink-muted) / <alpha-value>)',
        },
      },
      fontFamily: {
        // display กับ body เป็น IBM Plex Sans Thai ตระกูลเดียวกัน (ต่างกันแค่น้ำหนัก
        // ซึ่งกำหนดไว้ใน fontSize role tokens ด้านล่างอยู่แล้ว) จึงชี้มาที่ตัวแปรเดียว
        // เพื่อไม่ต้องโหลดไฟล์ฟอนต์ซ้ำสองชุด
        display: ['var(--font-body)'],
        body: ['var(--font-body)'],
        // ฟอนต์กลมมนสำหรับโลโก้/หัวเรื่องหน้าแรก
        brand: ['var(--font-brand)', 'var(--font-body)'],
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
