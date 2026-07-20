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
