import Image from 'next/image';
import { getColorOption } from '@/lib/colors';
import { buildDicebearUrl } from '@/lib/avatar';
import type { PastelColor } from '@/lib/types';

interface UserAvatarProps {
  name: string;
  image?: string | null;
  avatarStyle?: string | null;
  avatarSeed?: string | null;
  avatarColor?: string | null;
  size: number;
  className?: string;
}

/**
 * ตัวแสดงอวาตาร์กลางที่ใช้ร่วมกันทุกจุด (Sidebar, หน้าโปรไฟล์, ฟอร์มตั้งค่า) กันแต่ละหน้าเขียน
 * if/else เลือก "จะโชว์อะไร" แยกกันเอง ซึ่งเคยทำให้อวาตาร์การ์ตูนที่ตั้งไว้ไม่โชว์ใน Sidebar เพราะ
 * Sidebar เช็คแค่ user.image อย่างเดียวมาตลอด
 *
 * ลำดับความสำคัญ: อวาตาร์การ์ตูน (เลือกเองตั้งใจ) > รูปจาก Google (ซิงก์อัตโนมัติ ไม่ใช่ตัวเลือกที่ตั้งใจเท่า)
 * > ตัวอักษรแรกของชื่อ (ไม่มีตัวเลือกอีโมจิแล้ว - เอาออกไปตั้งแต่เปลี่ยนมาใช้อวาตาร์การ์ตูนแทน)
 */
export default function UserAvatar({
  name,
  image,
  avatarStyle,
  avatarSeed,
  avatarColor,
  size,
  className = '',
}: UserAvatarProps) {
  const initial = (name || '?').charAt(0).toUpperCase();
  const baseClass = `flex-shrink-0 rounded-full object-cover ${className}`;

  if (avatarStyle && avatarSeed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- SVG จาก DiceBear เลี่ยง next/image เพื่อไม่ต้องเปิด dangerouslyAllowSVG
      <img
        src={buildDicebearUrl(avatarStyle, avatarSeed)}
        alt={name}
        width={size}
        height={size}
        className={baseClass}
        style={{ width: size, height: size }}
      />
    );
  }

  if (image) {
    return (
      <Image
        src={image}
        alt={name}
        width={size}
        height={size}
        className={baseClass}
        style={{ width: size, height: size }}
      />
    );
  }

  const color = getColorOption((avatarColor as PastelColor) || 'blue');
  const fontSize = Math.round(size * 0.4);
  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-full font-bold ${color.chipClass} ${className}`}
      style={{ width: size, height: size, fontSize }}
    >
      {initial}
    </div>
  );
}
