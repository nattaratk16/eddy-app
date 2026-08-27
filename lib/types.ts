export type TaskPriority = 'low' | 'medium' | 'high';

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
  priority: TaskPriority;
  dueDate?: string; // ISO date string
  category?: string;
  subtasks?: Subtask[];
  estimatedMinutes?: number; // ใช้คำนวณ Priority Score - ไม่บังคับกรอก
  /** ช่วงเวลาที่เอ็ดดี้จัดงานนี้ลงปฏิทินให้แล้ว (undefined = ยังไม่ได้ลงปฏิทิน) */
  scheduled?: TaskSchedule;
}

/** งานใน To-do ที่ถูกวางลงปฏิทินแล้ว - ชี้ไปที่ event ที่สร้างขึ้น */
export interface TaskSchedule {
  eventId: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
}

// สีพาสเทลที่เลือกได้สำหรับหมวดหมู่ปฏิทิน
export type PastelColor =
  | 'pink'
  | 'yellow'
  | 'mint'
  | 'blue'
  | 'peach'
  | 'lilac'
  | 'amber'
  | 'lime'
  | 'olive'
  | 'teal'
  | 'sky'
  | 'indigo'
  | 'violet'
  | 'plum'
  | 'coral'
  | 'rose';

export interface CalendarCategory {
  id: string;
  name: string;
  color: PastelColor;
  /** อนาคต: ใช้ตอนทำระบบแชร์ - หมวดหมู่นี้แชร์ให้คนอื่นเห็นอยู่หรือไม่ */
  shared?: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date string (YYYY-MM-DD)
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  location?: string;
  description?: string;
  categoryId: string; // อ้างอิงไปยัง CalendarCategory.id
  /** มาจาก To-do List (กำหนดส่งงาน) ไม่ใช่กิจกรรมที่สร้างเองในปฏิทิน */
  fromTask?: boolean;
  /** แหล่งที่มา: 'google' = จาก Google Calendar, 'recurring' = จาก Loop ชีวิต (อ่านอย่างเดียว แก้ไม่ได้ในปฏิทินปกติ) */
  source?: 'google' | 'recurring';
}

/** Loop ชีวิต - กิจกรรมประจำที่ซ้ำทุกสัปดาห์ */
export interface RecurringEventInfo {
  id: string;
  title: string;
  days: number[]; // [1,2,3,4,5] วันในสัปดาห์ (0=อาทิตย์)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  categoryId?: string | null;
  endDate?: string | null; // YYYY-MM-DD (null = ตลอดไป)
}

export interface ChatMessagePayload {
  message: string;
}

/** มุมมองปฏิทิน: วัน / สัปดาห์ / เดือน (สไตล์ Google/Apple Calendar) */
export type CalendarView = 'day' | 'week' | 'month';

// ---------- เฟส 3: ระบบกลุ่ม ----------
export type GroupRole = 'owner' | 'member';
export type GroupMemberStatus = 'pending' | 'accepted' | 'declined';

export interface GroupMemberInfo {
  id: string;
  userId: string;
  name: string;
  email: string;
  image?: string | null;
  role: GroupRole;
  status: GroupMemberStatus;
  showEventTitles: boolean;
  isMe: boolean;
}

export interface GroupInfo {
  id: string;
  name: string;
  description?: string | null;
  color: PastelColor;
  ownerId: string;
  isOwner: boolean;
  memberCount: number; // จำนวนสมาชิกที่รับคำเชิญแล้ว
  members?: GroupMemberInfo[]; // ใส่มาเฉพาะตอนดูรายละเอียดกลุ่ม
  taskCount?: number; // จำนวนงานกลุ่มทั้งหมด (มาเฉพาะตอนดึงรายการกลุ่ม)
  waitingForMeCount?: number; // งานที่มอบหมายให้ฉันและรอฉันกดยืนยัน
  joinCode?: string | null; // รหัสให้เพื่อนเข้าร่วมกลุ่มเอง
  memberAvatars?: { name: string; image: string | null }[]; // รูปสมาชิกไม่กี่คนแรก ใช้โชว์บนการ์ด
}

/** งานของกลุ่ม + ผลการมอบหมาย (เฟส 3c) */
export interface GroupAssignmentInfo {
  id: string;
  assignedToUserId: string;
  assignedToName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: 'suggested' | 'approved' | 'rejected';
  isMine: boolean; // งานนี้ถูกมอบหมายให้ฉัน
}

export interface GroupTaskInfo {
  id: string;
  title: string;
  description?: string | null;
  estimatedMinutes: number;
  dueDate?: string | null; // YYYY-MM-DD
  createdById: string;
  assignment?: GroupAssignmentInfo | null;
}

/** คำเชิญเข้ากลุ่มที่รอเราตอบรับ */
export interface GroupInvitation {
  id: string; // id ของ GroupMember (แถวคำเชิญ)
  groupId: string;
  groupName: string;
  groupColor: PastelColor;
  memberCount: number;
  invitedByName?: string | null;
}
