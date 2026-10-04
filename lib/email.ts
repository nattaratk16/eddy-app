/**
 * lib/email.ts
 * --------------------------------------------------------------
 * ตัวช่วยส่งอีเมลผ่าน Resend (ยังไม่มีระบบส่งอีเมลในโปรเจกต์มาก่อน - เพิ่มเข้ามาสำหรับฟีเจอร์
 * "ลืมรหัสผ่าน" โดยเฉพาะ) คืนค่า/throw ตามผลจริง ไม่ fallback เงียบๆ เหมือน lib/gemini.ts เพราะ
 * การส่งอีเมลล้มเหลวที่นี่ควรให้ผู้เรียก (route) รู้แล้วจัดการเอง ไม่ใช่ทำเหมือนสำเร็จ
 *
 * HTML เขียนแบบ table-based + inline style ล้วน (ไม่ใช้ flexbox/grid/CSS class ภายนอก) เพราะอีเมล
 * ไคลเอนต์จำนวนมาก (โดยเฉพาะ Outlook desktop) รองรับ CSS สมัยใหม่ได้จำกัดมาก รูปภาพอ้างอิงด้วย URL
 * เต็มไปที่โดเมนจริงเสมอ (ไฟล์ local ใช้ไม่ได้ในอีเมล)
 * --------------------------------------------------------------
 */
import { Resend } from 'resend';

// ต้องเป็นโดเมนที่ยืนยันแล้วใน Resend dashboard ถึงจะส่งออกนอกบัญชีตัวเองได้จริง
const EMAIL_FROM = 'EDDY <noreply@eddyth.online>';
const SITE_URL = 'https://www.eddyth.online';

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('ยังไม่ได้ตั้งค่า RESEND_API_KEY ใน .env.local');
  return new Resend(apiKey);
}

function passwordResetEmailHtml(resetUrl: string): string {
  // ตัวอักษรที่มองไม่เห็น (zero-width + nbsp) ต่อท้าย preheader - กัน Gmail/Outlook ดึงข้อความ
  // ที่มองเห็นได้ถัดไป (เช่น "EDDY" ในป้ายวงกลม) มาต่อท้าย preview snippet ในกล่องขาเข้าโดยไม่ตั้งใจ
  const preheaderPadding = '‌ '.repeat(80);
  // จุดสีเล็กๆ ประดับรอบมาสคอต (inline-block ธรรมดา ไม่ใช้ position:absolute เพราะอีเมลไคลเอนต์
  // หลายตัวโดยเฉพาะ Outlook desktop ไม่รองรับ - ขยับตำแหน่งด้วย margin/vertical-align แทน)
  const confetti = [
    { color: '#FFC24B', size: 10, mt: 6 },
    { color: '#FF8FB1', size: 7, mt: 18 },
    { color: '#6FE3C8', size: 9, mt: 2 },
    { color: '#8FBAFB', size: 8, mt: 14 },
    { color: '#C9A6FF', size: 11, mt: 8 },
  ].map(
    (c) =>
      `<span style="display: inline-block; width: ${c.size}px; height: ${c.size}px; margin: 0 5px; margin-top: ${c.mt}px; border-radius: 50%; background-color: ${c.color};"></span>`,
  );

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>รีเซ็ตรหัสผ่าน EDDY</title>
</head>
<body style="margin: 0; padding: 0; background-color: #E9F4FD; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif;">
  <!-- preheader: ข้อความที่ Gmail/Outlook/Apple Mail ใช้โชว์เป็น preview snippet ในกล่องขาเข้า
       (มองไม่เห็นในตัวอีเมลเอง) - ไม่ใส่ไว้ snippet จะไปหยิบข้อความอื่นที่เจอก่อนมาโชว์แทน ทำให้
       ดูจากกล่องขาเข้าอย่างเดียวไม่รู้ว่าอีเมลนี้เกี่ยวกับอะไร ต้องเปิดเข้ามาก่อนถึงจะรู้ -->
  <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all;">
    มีคำขอเปลี่ยนรหัสผ่านสำหรับบัญชี EDDY ของคุณ เปิดอีเมลนี้เพื่อตั้งรหัสผ่านใหม่${preheaderPadding}
  </div>
  <!-- พื้นหลังฟ้าไล่เฉดแบบเดียวกับฝั่งภาพประกอบของหน้า login/register (components/auth/AuthLayout.tsx) -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #CDE7FB 0%, #E9F4FD 55%, #F3F9FF 100%); background-color: #E9F4FD; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- รูปทรงพาสเทลลอยเหนือการ์ด (เวอร์ชันนิ่งของ SkyBackground.tsx - อีเมลไคลเอนต์ไม่รองรับ position:absolute/animation) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 0 4px;">
          <tr>
            <td width="33%" align="left" style="padding-left: 8px;">
              <span style="display: inline-block; width: 22px; height: 22px; border-radius: 7px; background-color: #FFE49C; transform: rotate(12deg);"></span>
            </td>
            <td width="34%" align="center">
              <span style="font-size: 20px; line-height: 1;">✦</span>
            </td>
            <td width="33%" align="right" style="padding-right: 14px;">
              <span style="display: inline-block; width: 16px; height: 16px; border-radius: 50%; background-color: #FFC2D6;"></span>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 28px; overflow: hidden; box-shadow: 0 20px 48px -12px rgba(31,39,51,0.18);">
          <!-- หัวข้อ: แบนเนอร์ไล่เฉดสดใส (น้ำเงิน-ฟ้า) ตัดกับพื้นขาวของการ์ด + confetti จุดสีรอบมาสคอต -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #D2E6FE 0%, #8FBAFB 55%, #64D7FF 100%); background-color: #8FBAFB; padding: 36px 24px 28px;">
              <div>${confetti.slice(0, 2).join('')}</div>
              <img src="${SITE_URL}/mascot/eddy-duo-wave-still.png" alt="EDDY" width="140" style="display: block; width: 140px; height: auto; margin: 4px auto 10px;" />
              <div>${confetti.slice(2).join('')}</div>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 14px auto 0;">
                <tr>
                  <td style="background-color: #ffffff; border-radius: 999px; padding: 6px 18px;">
                    <span style="font-size: 13px; font-weight: 800; color: #0A5DEB; letter-spacing: 0.02em;">EDDY</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- เนื้อหา -->
          <tr>
            <td style="padding: 36px 32px 28px; color: #1F2733;">
              <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 800; text-align: center; letter-spacing: -0.02em;">รีเซ็ตรหัสผ่านของคุณ</h1>
              <p style="margin: 0 0 28px; font-size: 14px; line-height: 1.7; color: #4B5563; text-align: center;">
                มีคำขอรีเซ็ตรหัสผ่านสำหรับบัญชี EDDY ของคุณ ถ้าเป็นคุณเอง กดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่ได้เลย
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 20px;">
                <tr>
                  <td align="center" style="border-radius: 999px; background: linear-gradient(90deg, #0A5DEB 0%, #0E7FA8 100%); background-color: #0A5DEB; box-shadow: 0 10px 24px -8px rgba(10,93,235,0.55);">
                    <a href="${resetUrl}"
                       style="display: inline-block; padding: 15px 40px; font-size: 15px; font-weight: 800; color: #ffffff; text-decoration: none; border-radius: 999px;">
                      ตั้งรหัสผ่านใหม่
                    </a>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 24px;">
                <tr>
                  <td style="border-radius: 999px; background-color: #ECFBFF; padding: 6px 16px;">
                    <span style="font-size: 12px; font-weight: 700; color: #0B7099;">ลิงก์นี้ใช้ได้ 1 ชั่วโมง และใช้ได้ครั้งเดียว</span>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #9CA3AF; text-align: center;">
                ปุ่มกดไม่ได้? คัดลอกลิงก์นี้ไปวางในเบราว์เซอร์: <br />
                <a href="${resetUrl}" style="color: #0A5DEB; word-break: break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- เส้นคั่น + คำเตือน -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <div style="border-top: 1px dashed #E2E6EC; padding-top: 18px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #9CA3AF; text-align: center;">
                  ถ้าไม่ใช่คุณที่ขอ สามารถเพิกเฉยต่ออีเมลนี้ได้เลย รหัสผ่านเดิมของคุณจะยังใช้งานได้ตามปกติ
                </p>
              </div>
            </td>
          </tr>
        </table>

        <!-- รูปทรงพาสเทลลอยใต้การ์ด (คู่กับแถวด้านบน) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 10px 0 0;">
          <tr>
            <td width="33%" align="left" style="padding-left: 18px;">
              <span style="display: inline-block; width: 14px; height: 14px; border-radius: 50%; background-color: #B9E8D4;"></span>
            </td>
            <td width="34%" align="center">
              <span style="font-size: 16px; line-height: 1;">✦</span>
            </td>
            <td width="33%" align="right" style="padding-right: 10px;">
              <span style="display: inline-block; width: 18px; height: 18px; border-radius: 6px; background-color: #C9B3FF; transform: rotate(-8deg);"></span>
            </td>
          </tr>
        </table>

        <p style="margin: 18px 0 0; font-size: 12px; color: #AFB6C0; text-align: center;">EDDY — ผู้ช่วยจัดตารางชีวิตของคุณ</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function passwordResetEmailText(resetUrl: string): string {
  return [
    'รีเซ็ตรหัสผ่านของคุณ',
    '',
    'มีคำขอรีเซ็ตรหัสผ่านสำหรับบัญชี EDDY ของคุณ ถ้าเป็นคุณเอง เปิดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่:',
    resetUrl,
    '',
    'ลิงก์นี้ใช้ได้ภายใน 1 ชั่วโมง และใช้ได้ครั้งเดียวเท่านั้น',
    'ถ้าไม่ใช่คุณที่ขอ สามารถเพิกเฉยต่ออีเมลนี้ได้เลย รหัสผ่านเดิมของคุณจะยังใช้งานได้ตามปกติ',
  ].join('\n');
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: 'รีเซ็ตรหัสผ่าน EDDY',
    html: passwordResetEmailHtml(resetUrl),
    text: passwordResetEmailText(resetUrl),
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
