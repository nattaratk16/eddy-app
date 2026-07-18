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
