/**
 * lib/taskCalendar.ts
 * --------------------------------------------------------------
 * ตัวช่วยซิงก์ระหว่าง To-do กับปฏิทิน
 *
 * มี event 3 ชนิดที่เกิดจากหน้า To-do:
 *   1. event ของ "งานหลัก"      -> Task.scheduledEventId    (ช่วงลงมือทำ)
 *   2. event ของ "ขั้นตอนย่อย"  -> Subtask.scheduledEventId (ช่วงลงมือทำรายขั้น)
 *   3. หมุด "วันต้องส่ง"        -> Task.deadlineEventId     (ไม่ใช่ช่วงทำงาน แค่หมุดเตือน)
 *
 * ทั้งคู่ใช้หมวดหมู่ปฏิทินเดียวกันคือ "สิ่งที่ต้องทำ" เพื่อให้ผู้ใช้กรองดูได้ทีเดียว
 * --------------------------------------------------------------
 */
import { prisma } from './prisma';
import { colorForTask } from './colors';
import type { Prisma } from '@prisma/client';

type DbClient = typeof prisma | Prisma.TransactionClient;

export const TASK_CATEGORY_NAME = 'สิ่งที่ต้องทำ';
export const TASK_CATEGORY_COLOR = 'lilac';

/** หมวดหมู่ปฏิทินสำหรับงานจาก To-do (สร้างครั้งแรกครั้งเดียวต่อผู้ใช้) */
export async function ensureTaskCategory(userId: string): Promise<string> {
  const existing = await prisma.category.findFirst({ where: { userId, name: TASK_CATEGORY_NAME } });
  if (existing) return existing.id;
  const created = await prisma.category.create({
    data: { userId, name: TASK_CATEGORY_NAME, color: TASK_CATEGORY_COLOR },
  });
  return created.id;
}

/** ค่าเริ่มต้นเมื่อขั้นตอนย่อยมีวันแต่ไม่ได้ระบุเวลา */
const DEFAULT_START = '09:00';
const DEFAULT_DURATION_MIN = 60;

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = Math.min(23 * 60 + 59, h * 60 + m + minutes);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * งานที่เคยลงปฏิทินไว้เป็นก้อนเดียว แล้วมาแตกเป็นขั้นตอนย่อยทีหลัง
 * ต้องเอา event ของ "งานหลัก" ออก ไม่งั้นปฏิทินจะมีทั้งก้อนใหญ่และก้อนย่อยซ้อนกัน
 * (ขั้นตอนย่อยแทนงานหลักไปแล้ว)
 *
 * เรียกจาก syncSubtaskEvent เพราะเป็นจุดที่ทุกเส้นทางผ่าน ไม่ว่าจะมาจากการแตกงาน
 * หรือผู้ใช้กำหนดเวลาขั้นตอนเองทีละข้อ
 */
async function dropParentEvent(taskId: string, userId: string): Promise<void> {
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { scheduledEventId: true } });
  if (!task?.scheduledEventId) return;
  await prisma.event.deleteMany({ where: { id: task.scheduledEventId, userId } });
  await prisma.task.updateMany({ where: { id: taskId, userId }, data: { scheduledEventId: null } });
}

/**
 * ซิงก์ขั้นตอนย่อยหนึ่งข้อกับปฏิทิน
 *
 *   มี plannedDate  -> สร้าง event ใหม่ หรืออัปเดตใบเดิมให้ตรงกับแผนล่าสุด
 *   ไม่มี plannedDate -> ลบ event ทิ้ง (ผู้ใช้ล้างวันออก = เอาออกจากปฏิทิน)
 *
 * คืน id ของ event ที่ผูกอยู่ (null = ไม่ได้อยู่บนปฏิทินแล้ว)
 */
export async function syncSubtaskEvent(subtaskId: string, userId: string): Promise<string | null> {
  return syncSubtaskEventCore(subtaskId, userId, {});
}

/**
 * แกนจริงของ syncSubtaskEvent — รับ categoryId/dropParent มาจากภายนอกได้ (ไม่บังคับ)
 *
 * ทำไมต้องแยก: syncAllSubtaskEvents เดิมเรียก syncSubtaskEvent วนลูปทีละขั้นตอน แล้วภายในนั้น
 * แต่ละครั้งไปเช็ค ensureTaskCategory (หมวดหมู่เดียวกันทุกรอบ) และ dropParentEvent
 * (parent event ถูกลบไปตั้งแต่รอบแรกแล้ว รอบถัดๆ ไปแค่ query เปล่าๆ) ซ้ำอีก N-1 ครั้งโดยไม่จำเป็น
 * งานที่แตกเป็น 5 ขั้นตอนเคยยิง query เกินจำเป็นไปเกือบ 15 ครั้งจากจุดนี้จุดเดียว
 * ให้ผู้เรียกที่รู้ว่ากำลังจะวนหลายรายการ (syncAllSubtaskEvents) คำนวณครั้งเดียวแล้วส่งเข้ามาแทน
 */
async function syncSubtaskEventCore(
  subtaskId: string,
  userId: string,
  opts: { categoryId?: string; skipDropParent?: boolean },
): Promise<string | null> {
  const subtask = await prisma.subtask.findUnique({
    where: { id: subtaskId },
    include: { task: { select: { id: true, userId: true, title: true } } },
  });
  if (!subtask || subtask.task.userId !== userId) return null;

  // ไม่มีวันแล้ว -> เอาออกจากปฏิทิน
  if (!subtask.plannedDate) {
    if (subtask.scheduledEventId) {
      await prisma.event.deleteMany({ where: { id: subtask.scheduledEventId, userId } });
      await prisma.subtask.update({ where: { id: subtaskId }, data: { scheduledEventId: null } });
    }
    return null;
  }

  const startTime = subtask.startTime ?? DEFAULT_START;
  const endTime = subtask.endTime ?? addMinutes(startTime, subtask.estimatedMinutes ?? DEFAULT_DURATION_MIN);
  const payload = {
    // ใส่ชื่องานหลักนำหน้า เพื่อให้ดูในปฏิทินแล้วรู้ว่าขั้นตอนนี้เป็นของงานไหน
    title: `${subtask.task.title} — ${subtask.title}`,
    date: subtask.plannedDate,
    startTime,
    endTime,
    description: 'ขั้นตอนย่อยจากสิ่งที่ต้องทำ',
    // ขั้นตอนย่อยใช้สีของ "งานแม่" ทุกขั้นของงานเดียวกันจึงเป็นสีเดียวกันในปฏิทิน
    color: colorForTask(subtask.task.id),
    sourceTaskId: subtask.task.id,
  };

  // มี event อยู่แล้ว -> อัปเดตให้ตรงแผนใหม่ (updateMany กันกรณี event ถูกลบไปแล้ว)
  if (subtask.scheduledEventId) {
    const updated = await prisma.event.updateMany({
      where: { id: subtask.scheduledEventId, userId },
      data: payload,
    });
    if (updated.count > 0) {
      if (!opts.skipDropParent) await dropParentEvent(subtask.task.id, userId);
      return subtask.scheduledEventId;
    }
  }

  const categoryId = opts.categoryId ?? (await ensureTaskCategory(userId));
  const event = await prisma.event.create({ data: { ...payload, categoryId, userId } });
  await prisma.subtask.update({ where: { id: subtaskId }, data: { scheduledEventId: event.id } });
  if (!opts.skipDropParent) await dropParentEvent(subtask.task.id, userId);
  return event.id;
}

/** ซิงก์ทุกขั้นตอนย่อยของงานหนึ่งชิ้น คืนจำนวนที่อยู่บนปฏิทินจริง */
export async function syncAllSubtaskEvents(taskId: string, userId: string): Promise<number> {
  const subtasks = await prisma.subtask.findMany({
    where: { taskId, plannedDate: { not: null } },
    orderBy: { order: 'asc' },
    select: { id: true },
  });

  if (subtasks.length === 0) {
    await syncDeadlineEvent(taskId, userId);
    return 0;
  }

  // คำนวณครั้งเดียวก่อนเข้าลูป แทนที่จะให้แต่ละขั้นตอนไปคำนวณซ้ำของเดิม (ดูเหตุผลที่ syncSubtaskEventCore)
  const [categoryId] = await Promise.all([ensureTaskCategory(userId), dropParentEvent(taskId, userId)]);

  let count = 0;
  for (const s of subtasks) {
    if (await syncSubtaskEventCore(s.id, userId, { categoryId, skipDropParent: true })) count++;
  }

  // ขั้นตอนย่อยเปลี่ยน -> วันกำหนดส่งอาจว่างขึ้นหรือถูกจองไป ต้องคิดหมุดใหม่
  // เรียกครั้งเดียวตอนจบ ไม่ใส่ใน syncSubtaskEventCore เพราะจะกลายเป็น N+1
  await syncDeadlineEvent(taskId, userId);

  return count;
}

/**
 * เปลี่ยนชื่องานหลัก -> แก้ชื่อบน event ที่ผูกอยู่ให้ตรงกัน
 *
 * ชื่องานถูก "คัดลอก" ไปเก็บไว้ที่ Event.title ตอนจัดลงปฏิทิน ไม่ได้ join มาแสดงตอน render
 * เปลี่ยนชื่อในหน้า To-do เฉยๆ ปฏิทินจึงยังโชว์ชื่อเดิมค้างอยู่ตลอดไป
 *
 * ตั้งใจไม่เรียก syncAllSubtaskEvents ที่มีอยู่แล้ว เพราะตัวนั้นคำนวณวัน/เวลาใหม่ทั้งชุด
 * ถ้าผู้ใช้ลากเลื่อน event ในปฏิทินเอง การเปลี่ยนแค่ "ชื่อ" จะดึงมันกลับไปที่แผนเดิม
 * ตรงนี้จึงแตะเฉพาะฟิลด์ title อย่างเดียว
 *
 * (หมุดกำหนดส่งไม่ต้องจัดการที่นี่ - syncDeadlineEvent เขียนชื่อใหม่ให้อยู่แล้ว)
 */
export async function renameTaskEvents(taskId: string, userId: string): Promise<number> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { userId: true, title: true, scheduledEventId: true },
  });
  if (!task || task.userId !== userId) return 0;

  let updated = 0;

  // บล็อก "ช่วงลงมือทำ" ของงานหลัก
  if (task.scheduledEventId) {
    const r = await prisma.event.updateMany({
      where: { id: task.scheduledEventId, userId },
      data: { title: task.title },
    });
    updated += r.count;
  }

  // ขั้นตอนย่อย - ชื่อ event เป็นรูปแบบ "ชื่องานหลัก — ชื่อขั้นตอน" จึงต้องประกอบใหม่ทั้งคู่
  const subtasks = await prisma.subtask.findMany({
    where: { taskId, scheduledEventId: { not: null } },
    select: { title: true, scheduledEventId: true },
  });
  for (const s of subtasks) {
    const r = await prisma.event.updateMany({
      where: { id: s.scheduledEventId as string, userId },
      data: { title: `${task.title} — ${s.title}` },
    });
    updated += r.count;
  }

  return updated;
}

/** เอาขั้นตอนย่อยทั้งหมดของงานออกจากปฏิทิน (ใช้ตอนกด "เอาออกจากปฏิทิน" ที่งานหลัก) */
export async function removeSubtaskEvents(taskId: string, userId: string): Promise<number> {
  const subtasks = await prisma.subtask.findMany({
    where: { taskId, scheduledEventId: { not: null } },
    select: { id: true, scheduledEventId: true },
  });
  const ids = subtasks.map((s) => s.scheduledEventId!).filter(Boolean);
  if (ids.length === 0) return 0;
  await prisma.event.deleteMany({ where: { id: { in: ids }, userId } });
  await prisma.subtask.updateMany({ where: { taskId }, data: { scheduledEventId: null } });
  return ids.length;
}


// ---------- หมุดวันต้องส่ง ----------

const DEADLINE_PREFIX = 'ส่ง: ';
export const DEADLINE_DESCRIPTION = 'กำหนดส่งจากสิ่งที่ต้องทำ';

/**
 * ซิงก์หมุด "วันต้องส่ง" ของงานหนึ่งชิ้น
 *
 * กติกา (ตามที่ผู้ใช้เลือก): ขึ้นเฉพาะเมื่อวันกำหนดส่งยังไม่มีกิจกรรมของงานนี้อยู่แล้ว
 *   - งานมีขั้นตอนย่อยที่กระจายจบก่อนวันส่ง -> วันส่งว่าง -> ขึ้นหมุด
 *   - งานเดี่ยวที่ถูกจัดลงวันส่งอยู่แล้ว     -> วันนั้นมีของแล้ว -> ไม่ขึ้นหมุดซ้ำ
 *
 * dueTime มี   -> หมุดเป็นกิจกรรมมีเวลา (เวลานั้น ยาว 30 นาที)
 * dueTime ไม่มี -> หมุดเป็นกิจกรรมทั้งวัน (startTime/endTime = null)
 *
 * คืน id ของ event ที่ผูกอยู่ (null = ไม่มีหมุด)
 */
export async function syncDeadlineEvent(taskId: string, userId: string): Promise<string | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      subtasks: { select: { plannedDate: true, scheduledEventId: true } },
      scheduledEvent: { select: { date: true } },
    },
  });
  if (!task || task.userId !== userId) return null;

  const removeExisting = async () => {
    if (task.deadlineEventId) {
      await prisma.event.deleteMany({ where: { id: task.deadlineEventId, userId } });
      await prisma.task.updateMany({ where: { id: taskId, userId }, data: { deadlineEventId: null } });
    }
    return null;
  };

  // ไม่มีกำหนดส่ง หรืองานเสร็จแล้ว -> ไม่ต้องมีหมุด
  if (!task.dueDate || task.done) return removeExisting();

  const due = task.dueDate.toISOString().slice(0, 10);

  // วันกำหนดส่งมีกิจกรรมของงานนี้อยู่แล้วหรือยัง (ไม่นับตัวหมุดเอง)
  const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);
  const busyOnDueDate =
    iso(task.scheduledEvent?.date) === due ||
    task.subtasks.some((s) => s.scheduledEventId && iso(s.plannedDate) === due);
  if (busyOnDueDate) return removeExisting();

  const payload = {
    title: `${DEADLINE_PREFIX}${task.title}`,
    date: new Date(`${due}T00:00:00.000Z`),
    // หมุดกำหนดส่งมีระยะเวลา "0 นาที" เสมอ (จุดบนเวลา ไม่ใช่ช่วงเวลาที่ต้องลงมือทำ)
    // ไม่ระบุ dueTime = กิจกรรมทั้งวัน (startTime/endTime null)
    // ระบุ dueTime  = endTime เท่ากับ startTime พอดี ไม่ใช่ +30 นาทีเหมือนเดิม
    // ความปลอดภัยที่แท้จริงว่าจะไม่ถูกนับเป็น "เวลาไม่ว่าง" มาจาก isDeadline:true
    // ที่ถูกกรองออกตั้งแต่ระดับ query ใน freeSlotsForUsers/ตัวตรวจชนกัน ไม่ได้พึ่งระยะเวลา 0 อย่างเดียว
    startTime: task.dueTime ?? null,
    endTime: task.dueTime ?? null,
    description: DEADLINE_DESCRIPTION,
    color: colorForTask(task.id),
    sourceTaskId: task.id,
    isDeadline: true,
  };

  if (task.deadlineEventId) {
    const updated = await prisma.event.updateMany({ where: { id: task.deadlineEventId, userId }, data: payload });
    if (updated.count > 0) return task.deadlineEventId;
  }

  const categoryId = await ensureTaskCategory(userId);
  const event = await prisma.event.create({ data: { ...payload, categoryId, userId } });
  await prisma.task.updateMany({ where: { id: taskId, userId }, data: { deadlineEventId: event.id } });
  return event.id;
}

/** เอาหมุดวันต้องส่งออกจากปฏิทิน */
export async function removeDeadlineEvent(taskId: string, userId: string): Promise<void> {
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { deadlineEventId: true } });
  if (!task?.deadlineEventId) return;
  await prisma.event.deleteMany({ where: { id: task.deadlineEventId, userId } });
  await prisma.task.updateMany({ where: { id: taskId, userId }, data: { deadlineEventId: null } });
}


/**
 * ลบ event ทั้งหมดที่เกิดจากงานนี้ออกจากปฏิทิน
 *
 * ใช้ sourceTaskId เป็นหลัก (query เดียวจบ ครบเสมอ ไม่ว่าลิงก์ฝั่ง Task/Subtask
 * จะยังอยู่หรือขาดไปแล้ว) แล้วค่อยเก็บตกด้วยลิงก์เดิมอีกชั้น
 * เผื่อ event เก่าที่สร้างก่อนมีคอลัมน์ sourceTaskId
 *
 * คืนจำนวน event ที่ลบไป
 *
 * รับ client แยกได้ (ไม่บังคับ - ค่าเริ่มต้นคือ prisma singleton) เพื่อให้ผู้เรียกที่ต้องลบ event
 * แล้วลบ Task ต่อในจังหวะเดียวกัน (เช่น DELETE /api/tasks/[id]) ส่ง transaction client (tx) เข้ามา
 * ให้ทั้งสองขั้นตอนเป็น atomic - กันไม่ให้มี event ใหม่ (จาก breakdown/subtask update ที่วิ่งพร้อมกัน)
 * แทรกเข้ามาในช่วงกลางระหว่างลบ event เสร็จกับลบ Task จริง
 */
export async function removeAllTaskEvents(taskId: string, userId: string, client: DbClient = prisma): Promise<number> {
  // 1) ตามที่มา - ครอบคลุมทั้ง event งานหลัก ขั้นตอนย่อย และหมุดกำหนดส่ง
  const bySource = await client.event.deleteMany({ where: { userId, sourceTaskId: taskId } });

  // 2) เก็บตกด้วยลิงก์เดิม (event เก่าที่ยังไม่มี sourceTaskId)
  const task = await client.task.findUnique({
    where: { id: taskId },
    select: { scheduledEventId: true, deadlineEventId: true, subtasks: { select: { scheduledEventId: true } } },
  });
  const legacyIds = [
    task?.scheduledEventId,
    task?.deadlineEventId,
    ...(task?.subtasks ?? []).map((s) => s.scheduledEventId),
  ].filter((id): id is string => !!id);

  let legacy = 0;
  if (legacyIds.length > 0) {
    legacy = (await client.event.deleteMany({ where: { userId, id: { in: legacyIds } } })).count;
  }

  return bySource.count + legacy;
}
