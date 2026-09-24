# EDDY — ผู้ช่วยจัดตารางชีวิตด้วย AI

โปรเจกต์ Next.js สำหรับ Capstone/Senior Project สาขาวิศวกรรมคอมพิวเตอร์
สไตล์ **"Friendly 3D Pastel"** (ม่วงหลัก + พาสเทล) พร้อมมาสคอต **Eddy**
และโครงสร้างพร้อมต่อ **Gemini API** กับ **PostgreSQL** ในอนาคต

---

## 1. สิ่งที่ต้องติดตั้งก่อน (ทำครั้งเดียว)

1. **Node.js** เวอร์ชัน 18.18 ขึ้นไป (แนะนำ 20 LTS)
   ดาวน์โหลดที่ https://nodejs.org แล้วติดตั้งตามปกติ
   ตรวจสอบว่าติดตั้งสำเร็จด้วยคำสั่งใน Terminal:
   ```
   node -v
   npm -v
   ```
2. **VS Code** — ดาวน์โหลดที่ https://code.visualstudio.com
3. (แนะนำ) ติดตั้ง Extension ใน VS Code:
   - **ES7+ React/Redux/React-Native snippets**
   - **Tailwind CSS IntelliSense**
   - **Prisma** (สำหรับ syntax highlighting ไฟล์ `schema.prisma`)
4. (ถ้าต้องการต่อ Database จริง) ติดตั้ง **PostgreSQL**
   - วิธีง่ายสุดสำหรับมือใหม่: สมัครฟรีที่ https://neon.tech หรือ https://supabase.com
     แล้วคัดลอก connection string มาใส่ในไฟล์ `.env.local` (ไม่ต้องลง PostgreSQL บนเครื่องเอง)

---

## 2. เปิดโปรเจกต์และติดตั้งแพ็กเกจ

1. แตกไฟล์ zip ที่ได้รับ แล้วเปิดโฟลเดอร์ `eddy-app` ด้วย VS Code
   (File → Open Folder...)
2. เปิด Terminal ใน VS Code (กด `` Ctrl+` ``) แล้วรันคำสั่ง:
   ```
   npm install
   ```
   ขั้นตอนนี้จะติดตั้ง Next.js, React, Tailwind, Prisma และไลบรารีอื่นๆ ตามใน `package.json`
   (ใช้เวลาประมาณ 1-3 นาที ขึ้นกับความเร็วอินเทอร์เน็ต)

3. คัดลอกไฟล์ตัวอย่าง environment variables:
   ```
   cp .env.example .env.local
   ```
   (ถ้าใช้ Windows PowerShell: `copy .env.example .env.local`)

   ตอนนี้ระบบ login/register และหน้าปฏิทัน/สิ่งที่ต้องทำ **ต่อกับ PostgreSQL จริงแล้ว**
   (ผ่าน Prisma) จึงต้องใส่ `DATABASE_URL` และ `AUTH_SECRET` ก่อนถึงจะใช้งานได้ครบ
   (ดูหัวข้อ 4-5) ส่วนแชท Eddy ต่อกับ Gemini API จริงแล้วเช่นกัน (ต้องใส่ `GEMINI_API_KEY`
   ไม่งั้นจะได้แค่ข้อความ mock สำรองตอนเรียก Gemini ไม่สำเร็จ)

4. สั่งรันเว็บแอป:
   ```
   npm run dev
   ```
5. เปิดเบราว์เซอร์ไปที่ http://localhost:3000 — ระบบจะ redirect ไปหน้า `/login` ให้อัตโนมัติ

---

## 3. โครงสร้างโปรเจกต์

```
eddy-app/
├── auth.ts                          # ตั้งค่า NextAuth (Auth.js v5) — Credentials + JWT session
├── middleware.ts                    # ป้องกันหน้ากลุ่ม (app) ไม่ให้เข้าถ้ายังไม่ login
├── app/
│   ├── login/page.tsx               # หน้า Login (เรียก signIn() จริง)
│   ├── register/page.tsx            # หน้าสมัครสมาชิก (เรียก /api/auth/register)
│   ├── providers.tsx                # ครอบ SessionProvider ให้ทั้งแอป
│   ├── (app)/                       # กลุ่มหน้าที่ login แล้ว (มี Sidebar ร่วมกัน)
│   │   ├── layout.tsx               # Layout: เช็ค session, Sidebar + Mobile nav + ปุ่มแชท Eddy
│   │   ├── dashboard/page.tsx       # หน้า Dashboard (ดึงข้อมูลจริงผ่าน Prisma)
│   │   ├── calendar/page.tsx        # หน้าปฏิทิน (fetch จาก /api/categories, /api/events)
│   │   └── todo/page.tsx            # หน้า To-do list (fetch จาก /api/tasks)
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth route handler
│   │   ├── auth/register/route.ts       # สมัครสมาชิก (hash รหัสผ่านด้วย bcrypt)
│   │   ├── chat/route.ts                # API คุยกับ Eddy (mock → ต่อ Gemini ได้)
│   │   ├── tasks/[route.ts, [id]/route.ts]     # API งาน (ต่อ PostgreSQL จริงแล้ว)
│   │   ├── events/[route.ts, [id]/route.ts]    # API กิจกรรม (ต่อ PostgreSQL จริงแล้ว)
│   │   └── categories/[route.ts, [id]/route.ts] # API หมวดหมู่ (ต่อ PostgreSQL จริงแล้ว)
│   ├── layout.tsx                  # Root layout (โหลดฟอนต์ + Providers)
│   └── globals.css                 # CSS หลัก + clay-card utility
├── components/
│   ├── EddyMascot.tsx               # มาสคอตหลักของแบรนด์ (SVG)
│   ├── FloatingShapes.tsx           # บล็อกพาสเทลลอยตกแต่งพื้นหลัง
│   ├── Sidebar.tsx / MobileNav.tsx  # เมนูนำทาง (ปุ่ม logout เรียก signOut() จริง)
│   ├── Topbar.tsx                   # หัวข้อ + วันที่
│   ├── ChatWidget.tsx                # หน้าต่างแชท Eddy แบบลอย (FAB)
│   ├── Card.tsx / Button.tsx / Input.tsx
├── lib/
│   ├── gemini.ts                    # ฟังก์ชันเรียก Gemini API
│   ├── prisma.ts                    # Prisma client (สำหรับ PostgreSQL)
│   └── types.ts                     # TypeScript types: Task, CalendarEvent
├── prisma/schema.prisma             # โครงสร้างตาราง User, Task, Event, ChatMessage
├── tailwind.config.js               # สีม่วง + พาสเทล + clay shadow ทั้งหมดอยู่ที่นี่
└── .env.example                     # ตัวอย่างตัวแปร environment
```

---

## 4. การต่อ PostgreSQL จริง + ระบบ Login (จำเป็นก่อนใช้งานจริง)

ตอนนี้ **auth และทุก API route ต่อกับ Prisma/PostgreSQL จริงแล้ว** (ไม่ใช่ mock อีกต่อไป)
เหลือแค่เสียบ database ของคุณเอง:

1. เตรียม PostgreSQL (แนะนำสมัครฟรีที่ https://neon.tech หรือ https://supabase.com)
2. ใส่ `DATABASE_URL` ใน `.env.local`
3. สร้างค่า `AUTH_SECRET` แบบสุ่ม แล้วใส่ใน `.env.local`:
   ```
   npx auth secret
   ```
4. สร้างตารางจาก schema:
   ```
   npm run prisma:push
   npm run prisma:generate
   ```
5. รัน `npm run dev` แล้วไปที่ `/register` เพื่อสมัครสมาชิก จากนั้น login ที่ `/login`
   — ข้อมูล categories/events/tasks ที่เพิ่มจะถูกบันทึกลง PostgreSQL จริงและผูกกับบัญชีของคุณ

## 5. การต่อ Gemini API จริง (ขั้นตอนต่อไป)

1. สร้าง API key ที่ https://aistudio.google.com/app/apikey
2. ใส่ค่าใน `.env.local`:
   ```
   GEMINI_API_KEY="ค่าที่ได้มา"
   ```
3. เปิดไฟล์ `app/api/chat/route.ts` แล้วเปลี่ยนจากการสุ่ม `mockReplies`
   ไปเรียก `askEddy({ message })` จาก `lib/gemini.ts` (มีตัวอย่าง comment ไว้ในไฟล์แล้ว)
4. `lib/aiMock.ts` มีฟังก์ชันตรวจเวลาชนกัน/แนะนำหมวดหมู่แบบ rule-based ที่ใช้ในหน้าปฏิทินอยู่
   — ขั้นต่อไปคือแทนที่ด้วยการเรียก Gemini จริงเพื่อให้วิเคราะห์ตารางได้ฉลาดขึ้น

---

## 6. จุดที่ออกแบบไว้ให้แก้ไขง่าย

- **สีและธีมทั้งหมด** ปรับได้ที่ `tailwind.config.js` (ส่วน `colors.eddy` และ `colors.pastel`)
- **มาสคอต Eddy** แก้ท่าทาง/สีได้ที่ `components/EddyMascot.tsx`
- **ระบบ AI ตอนนี้** ยังเป็น rule-based mock (`lib/aiMock.ts`) และ chat reply แบบสุ่ม —
  รอต่อ Gemini จริงตามหัวข้อ 5

มีคำถามหรือต้องการให้ต่อเติมหน้าไหนเพิ่ม (เช่น หน้า Settings, Profile, ระบบแชร์หมวดหมู่/เพื่อน)
บอกมาได้เลย — โครงสร้างปัจจุบันรองรับการเพิ่มหน้าใหม่ได้ง่ายมาก

สิ่งที่ต้องการแน่ๆใน โปรเจคนี้

บทบาท Ai ใน EDDY
- Ai ใน webApp นี้จะปรับเปลี่ยนตาม พฤติกรรมของผู้ใช้งาน
แปลงข้อความ/คำพูดธรรมดาเป็นข้อมูลโครงสร้าง (วันที่, เวลา, หมวดหมู่)
วิเคราะห์ตารางที่มีอยู่แล้วหาช่องว่างที่เหมาะสม
จัดลำดับความสำคัญ/เร่งด่วน/ความยากของงาน
ให้คำแนะนำเชิงรุก เช่น เตือน, สรุป, เสนอทางเลือก

- Ai ในปฎิทิน
ตรวจสอบ overlap ระหว่างกิจกรรมที่กำลังจะเพิ่ม กับกิจกรรมเดิมในหมวดหมู่อื่น
แนะนำเวลาว่างที่เหมาะสม
ประเมินความหนาแน่นของวัน
เรียนรู้ pattern ของหมวดหมู่

- Ai ในแชท
ตอบคำถามทั่วไปเกี่ยวกับตารางชีวิตในแชท
แปลงข้อความภาษาธรรมดา → กิจกรรมปฏิทินหรือสิ่งที่ต้องการจะทำได้ เด้งการ์ดเสนอเพิ่มก่อน โดยใช้ภาษาคำพูดที่เข้าใจง่าย 
แจ้งเตือนเมื่อมีเวลากิจกรรมชนกันและปริมาณกิจกรรมในวันนั่นๆมีมากเกินไปและแนะนำเวลาว่าง วิเคราะห์ตารางที่มีอยู่แล้วหาช่องว่างที่เหมาะสม 
แบ่งจำแนกหรือเพิ่มหมวดหมู่จากการพิมพ์แชทได้  
สรุปภาพรวมสัปดาห์

- Ai ใน TodoList
สำหรับงานมีกำหนดเวลา (deadline-based):
แตกงานใหญ่เป็น subtask อัตโนมัติ (ถ้าผู้ใช้ไม่แตกเอง) โดยประเมินจาก scope ที่พิมพ์มา
คำนวณ Priority Score จาก 3 แกน: ความสำคัญ (importance), ความเร่งด่วน (urgency จาก deadline), ความยาก (effort/duration) — ใช้หลักการคล้าย Eisenhower Matrix ผสม weighted scoring
จัดวางงานย่อยลงปฏิทินอัตโนมัติถ้าผู้ใช้ไม่ระบุวัน โดยเช็คช่องว่างจากปฏิทินจริง
สำหรับงานไม่มีกำหนดเวลา (aspiration-based):
วิเคราะห์ว่าเมื่อไหร่ผู้ใช้มีเวลาว่างต่อเนื่อง เพื่อเสนอกิจกรรม

- AI ในการระบบเเชร์
เมื่อนัดหมายกิจกรรมร่วมกัน AI ต้องเช็คเวลาว่างของทุกคนที่เกี่ยวข้อง (เฉพาะหมวดหมู่ที่แชร์) แล้วเสนอช่วงที่ทุกคนว่างตรงกัน
- AI ต้องรู้ว่าหมวดหมู่ไหนถูกแชร์กับใคร เพื่อไม่แนะนำเวลาจาก private calendar ไปปนกับ shared context
- AI ช่วยกระจายงานย่อยให้สมาชิกตาม workload ปัจจุบันของแต่ละคน โดยดูจาก  จำนวนชั่วโมงงานที่ค้างอยู่ในปฏิทิน/to-do ของแต่ละคนในช่วงเวลาที่เกี่ยวข้อง/เวลาว่างจริงจากปฏิทิน Workload Score (คนนั้น) = (ชั่วโมงงานที่มีอยู่แล้ว / ชั่วโมงว่างทั้งหมดในช่วงเวลา)คนที่ score ต่ำสุด = มีพื้นที่ว่างมากสุด → ได้รับ subtask ใหม่ก่อน แต่ต้อง match กับ skill/effort ให้เหมาะด้วย ไม่ใช่ยัดให้คนว่างสุดอย่างเดียวระบบนี้ AI ควรทำหน้าที่แค่ "เสนอ" การกระจายงาน (draft assignment) แล้วให้เจ้าของโปรเจคหรือสมาชิกกดยืนยัน/ปรับเอง
