'use client';

import Modal from './Modal';
import PrivacyPolicyContent from './PrivacyPolicyContent';

interface PrivacyPolicyModalProps {
  open: boolean;
  onClose: () => void;
}

// ป็อปอัปแสดงนโยบายความเป็นส่วนตัวตอนสมัครสมาชิก (ไม่ต้องเด้งออกไปหน้า /privacy ให้เสียโฟกัสฟอร์ม)
// เนื้อหาเดียวกับหน้า /privacy เป๊ะๆ (ใช้ PrivacyPolicyContent ร่วมกัน) - /privacy ยังเก็บไว้เป็น
// ลิงก์ตรงถาวรสำหรับกรอกใน Google OAuth consent screen ซึ่งต้องการ URL จริง ไม่ใช่ป็อปอัป
export default function PrivacyPolicyModal({ open, onClose }: PrivacyPolicyModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="นโยบายความเป็นส่วนตัว" maxWidth="max-w-xl">
      <PrivacyPolicyContent />
    </Modal>
  );
}
