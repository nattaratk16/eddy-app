# EDDY — ผู้ช่วยจัดตารางชีวิตด้วย AI

โปรเจกต์ Next.js สำหรับ Capstone/Senior Project สาขาวิศวกรรมคอมพิวเตอร์
สไตล์ **"Friendly 3D Pastel"** (ม่วงหลัก + พาสเทล, clay-morphism) พร้อมมาสคอต **Eddy**

ต่อ **PostgreSQL (Prisma)**, **Gemini API**, **Google OAuth/Calendar** และระบบอีเมล (**Resend**)
จริงทั้งหมดแล้ว ไม่ใช่ mock/prototype อีกต่อไป

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
4. **PostgreSQL** — วิธีง่ายสุดสำหรับมือใหม่: สมัครฟรีที่ https://neon.tech หรือ https://supabase.com
   แล้วคัดลอก connection string มาใส่ในไฟล์ `.env.local` (ไม่ต้องลง PostgreSQL บนเครื่องเอง)

---

## 2. เปิดโปรเจกต์และติดตั้งแพ็กเกจ

1. เปิดโฟลเดอร์โปรเจกต์ด้วย VS Code (File → Open Folder...)
2. เปิด Terminal ใน VS Code (กด `` Ctrl+` ``) แล้วรันคำสั่ง:
   ```
   npm install
   ```
   (`postinstall` จะรัน `prisma generate` ให้อัตโนมัติ ใช้เวลาประมาณ 1-3 นาที ขึ้นกับความเร็วอินเทอร์เน็ต)

3. คัดลอกไฟล์ตัวอย่าง environment variables:
   ```
   copy .env.example .env.local
   ```
   (Mac/Linux ใช้ `cp .env.example .env.local`)

   ระบบทั้งหมด (login/register, ปฏิทัน, สิ่งที่ต้องทำ, กลุ่ม, แชท Eddy, เชื่อม Google Calendar,
   ลืมรหัสผ่าน) ต่อกับฐานข้อมูล/API จริง จึงต้องใส่ค่าใน `.env.local` ให้ครบตามหัวข้อ 4-6
   ก่อนถึงจะใช้งานได้เต็มรูปแบบ — ใส่แค่ `DATABASE_URL` + `AUTH_SECRET` ก็เพียงพอสำหรับรันและ login
   ด้วยอีเมล/รหัสผ่านได้แล้ว ส่วนที่เหลือ (Gemini, Google OAuth, Resend) เป็น optional ตามฟีเจอร์ที่จะลองใช้

4. สั่งรันเว็บแอป:
   ```
   npm run dev
   ```
5. เปิดเบราว์เซอร์ไปที่ http://localhost:3000 — ระบบจะ redirect ไปหน้า `/login` ให้อัตโนมัติ

---

## 3. โครงสร้างโปรเจกต์

```
eddy-app/
├── auth.ts                        # ตั้งค่า NextAuth (Auth.js v5) — Credentials + Google, JWT session
├── middleware.ts                  # ป้องกันหน้ากลุ่ม (app) ไม่ให้เข้าถ้ายังไม่ login
├── app/
│   ├── login/, register/          # เข้าสู่ระบบ / สมัครสมาชิก
│   ├── forgot-password/, reset-password/  # ลืมรหัสผ่าน (ส่งอีเมลผ่าน Resend)
│   ├── onboarding/                # ตั้งค่าเริ่มต้นหลังสมัคร (เวลาทำงาน, ระยะโฟกัส ฯลฯ)
│   ├── privacy/                   # หน้านโยบายความเป็นส่วนตัว
│   ├── (app)/                     # กลุ่มหน้าที่ login แล้ว (มี Sidebar/Mobile nav ร่วมกัน)
│   │   ├── dashboard/             # ภาพรวม workload, burnout risk, สรุป AI
│   │   ├── calendar/              # ปฏิทิน + เชื่อมต่อ Google Calendar, งานที่เกิดซ้ำ
│   │   ├── todo/                  # สิ่งที่ต้องทำ, แตกงานย่อยด้วย AI, จัดลงปฏิทินอัตโนมัติ
│   │   ├── groups/                # กลุ่ม: งานร่วมกัน, แชร์ปฏิทิน, กระจายงานตาม workload
│   │   ├── profile/               # โปรไฟล์ผู้ใช้ (avatar, ทักษะ, บทบาท)
│   │   └── settings/              # ตั้งค่าบัญชี/โปรไฟล์/การทำงาน/ธีม, ลบบัญชี
│   └── api/
│       ├── auth/                  # register, forgot-password, reset-password, NextAuth handler
│       ├── chat/                  # แชทกับ Eddy (ต่อ Gemini จริง)
│       ├── ai/                    # วิเคราะห์กิจกรรม, สรุปรายสัปดาห์, insight เรื่อง workload
│       ├── tasks/, subtasks/      # งาน + แตกงานย่อยด้วย AI + จัดตารางอัตโนมัติ
│       ├── events/, categories/, recurring/  # กิจกรรม, หมวดหมู่, กิจกรรมที่เกิดซ้ำ
│       ├── groups/                # กลุ่ม, เชิญ/เข้าร่วมด้วยโค้ด, มอบหมายงาน, กระจายงานตาม workload
│       ├── google/calendar/       # เชื่อมต่อ/ยกเลิกเชื่อม Google Calendar (แยกจากบัญชี login)
│       └── profile/                # แก้ไขโปรไฟล์, เปลี่ยนรหัสผ่าน, ลบบัญชี
├── components/                    # Sidebar, ChatWidget, OnboardingWizard, Modal ต่างๆ ฯลฯ
├── lib/                           # gemini.ts, google.ts, priorityScore.ts, freeTime.ts,
│                                  #   groupWorkload.ts, rateLimit.ts, email.ts ฯลฯ (ลอจิกหลักของแอป)
├── prisma/schema.prisma           # โครงสร้างตาราง (User, Task, Subtask, Event, Group, GroupTask,
│                                  #   GoogleCalendarLink, ChatMessage, AiCache ฯลฯ)
├── tailwind.config.js             # สีม่วง + พาสเทล + clay shadow ทั้งหมดอยู่ที่นี่
└── .env.example                   # ตัวอย่างตัวแปร environment
```

---

## 4. การต่อ PostgreSQL จริง + ระบบ Login

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

**ถ้าต้องการ login ด้วย Google ด้วย** (นอกจาก email/password) ต้องตั้งค่าเพิ่ม:
1. สร้าง OAuth Client ที่ [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   (เพิ่ม redirect URI `http://localhost:3000/api/auth/callback/google` ตอน dev)
2. ใส่ `AUTH_GOOGLE_ID` และ `AUTH_GOOGLE_SECRET` ใน `.env.local`
   (ไม่ตั้งค่านี้ก็ไม่เป็นไร — ปุ่ม "เข้าสู่ระบบด้วย Google" แค่จะใช้งานไม่ได้ ส่วน login ด้วย email/password ปกติดี)

**การเชื่อมต่อ Google Calendar** (ในหน้าปฏิทิน) เป็นระบบแยกจากการ login — เชื่อม Google
account ไหนก็ได้ ไม่จำเป็นต้องเป็นอีเมลเดียวกับที่สมัคร EDDY ใช้ OAuth Client เดียวกับข้างบน
แต่ต้องเพิ่ม redirect URI อีกตัว: `http://localhost:3000/api/google/calendar/callback`

## 5. การต่อ Gemini API จริง

ใช้ขับเคลื่อนฟีเจอร์ AI หลักของแอป เช่น แตกงานใหญ่เป็นงานย่อย, แชทกับ Eddy, วิเคราะห์ภาพรวม
สัปดาห์ และ insight เรื่อง workload (`lib/gemini.ts`):

1. สร้าง API key ที่ https://aistudio.google.com/app/apikey
2. ใส่ค่าใน `.env.local`:
   ```
   GEMINI_API_KEY="ค่าที่ได้มา"
   ```
3. ถ้าไม่ได้ใส่ key (หรือเรียก Gemini แล้วพัง) ระบบจะ fallback ไปใช้ `lib/aiMock.ts`
   (ตรรกะแบบ rule-based ล้วน ไม่พึ่ง AI) แทน เพื่อไม่ให้ฟีเจอร์พังทั้งหมดตอน Gemini ใช้งานไม่ได้ชั่วคราว

## 6. การตั้งค่าอีเมล (Resend) — สำหรับฟีเจอร์ "ลืมรหัสผ่าน"

1. สมัครและสร้าง API key ที่ https://resend.com/api-keys (ต้อง verify โดเมนผู้ส่งก่อนถึงจะส่งอีเมล
   ออกนอกบัญชีตัวเองได้จริง)
2. ใส่ค่าใน `.env.local`:
   ```
   RESEND_API_KEY="ค่าที่ได้มา"
   ```
3. ถ้าไม่ได้ใส่ key ฟีเจอร์ "ลืมรหัสผ่าน" จะใช้งานไม่ได้ (ส่วนอื่นของระบบไม่ได้รับผลกระทบ)

---

## 7. จุดที่ออกแบบไว้ให้แก้ไขง่าย

- **สีและธีมทั้งหมด** ปรับได้ที่ `tailwind.config.js` (ส่วน `colors.eddy` และ `colors.pastel`)
- **มาสคอต Eddy** แก้ท่าทาง/สีได้ที่ `components/EddyMascot.tsx`
- **ลอจิกหลักของฟีเจอร์ AI/ตาราง** อยู่ใน `lib/` แยกเป็นไฟล์ตามหน้าที่ (เช่น `priorityScore.ts`,
  `freeTime.ts`, `groupWorkload.ts`) ไม่ปนกับโค้ด UI หรือ API route
