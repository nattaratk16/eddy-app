import type { CategoryKind } from './categoryKind';

export type TaskPriority = 'low' | 'medium' | 'high';

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  /** วัน/เวลาที่เอ็ดดี้เสนอให้ทำงานย่อยนี้ (ผู้ใช้แก้เองได้) - undefined = ยังไม่ได้วางแผน */
  plannedDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  estimatedMinutes?: number;
  /** ขั้นตอนนี้ถูกวางลงปฏิทินแล้วหรือยัง (มี event ของตัวเอง) */
  onCalendar?: boolean;
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
  priority: TaskPriority;
  dueDate?: string; // ISO date string
  /** เวลาส่งของวันกำหนดส่ง "HH:mm" (ไม่บังคับ) - ไม่ใส่ = หมุดกำหนดส่งเป็นกิจกรรมทั้งวัน */
  dueTime?: string;
  /** วันที่เริ่มลงมือ (ค่าเริ่มต้น = วันที่เพิ่มงาน) - ขอบล่างของช่วงที่ใช้กระจายงานย่อย */
  startDate?: string; // YYYY-MM-DD
  category?: string;
  subtasks?: Subtask[];
  estimatedMinutes?: number; // ใช้คำนวณ Priority Score - ไม่บังคับกรอก
  /** ช่วงเวลาที่เอ็ดดี้จัดงานนี้ลงปฏิทินให้แล้ว (undefined = ยังไม่ได้ลงปฏิทิน) */
  scheduled?: TaskSchedule;
  /** หมุด "วันต้องส่ง" ในปฏิทิน (คนละใบกับ scheduled ที่เป็นช่วงลงมือทำ) */
  deadlineOnCalendar?: boolean;
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
  /** "academic" | "non_academic" - เดาจากชื่อตอนสร้าง แก้เองได้ ใช้แยกภาระงานในกราฟภาระงานกลุ่ม */
  kind?: CategoryKind;
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
  /** สีเฉพาะของ event นี้ (ทับสีหมวดหมู่) - ใช้กับงานจาก To-do ให้แต่ละงานมีสีของตัวเอง */
  color?: PastelColor;
  /** มาจาก To-do List (กำหนดส่งงาน) ไม่ใช่กิจกรรมที่สร้างเองในปฏิทิน */
  fromTask?: boolean;
  /**
   * true = หมุดวันต้องส่ง ไม่ใช่ช่วงเวลาที่ต้องลงมือทำจริง (ระยะเวลา 0 นาที)
   * ต้องเรนเดอร์ต่างจาก event/งานจริงเสมอ (ไอคอนธง ไม่ใช่กล่องทึบ) และไม่นับเป็นเวลาไม่ว่าง
   */
  isDeadline?: boolean;
  /** แหล่งที่มา: 'google' = จาก Google Calendar, 'recurring' = จาก Loop ชีวิต (อ่านอย่างเดียว แก้ไม่ได้ในปฏิทินปกติ) */
  source?: 'google' | 'recurring';
}

/** Loop ชีวิต - กิจกรรมประจำที่ซ้ำทุกสัปดาห์ */
export interface RecurringEventInfo {
  id: string;
  title: string;
  /** รหัสวิชา (ถ้า Loop นี้เป็นคาบเรียน) */
  courseCode?: string | null;
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
  /** เจ้าของงาน (assignment.assignedToUserId) ติ๊กว่าเสร็จแล้ว - คนอื่นดูได้อย่างเดียว */
  done: boolean;
  completedAt?: string | null;
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
