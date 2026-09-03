/**
 * POST /api/tasks/[id]/breakdown
 * --------------------------------------------------------------
 * "ให้เอ็ดดี้แตกงานนี้เป็นขั้นตอนย่อย"
 *
 * ถ้างานมีกำหนดส่ง จะวางแผนวัน/เวลาให้แต่ละขั้นตอนด้วย โดยดูช่วงเวลาตั้งแต่
 * วันที่เริ่ม (Task.startDate — ค่าเริ่มต้นคือวันที่เพิ่มงาน) ไปจนถึงกำหนดส่ง
 * แล้วกระจายขั้นตอนลงช่องว่างจริงในปฏิทิน ผู้ใช้ปรับวัน/เวลาเองได้ทีหลัง
 *
 * แบ่งหน้าที่: Gemini ตอบว่า "ซอยเป็นขั้นตอนอะไร ขั้นละกี่นาที"
 *              ส่วน "วางวันไหน เวลาไหน" คำนวณ local จากปฏิทินจริง (lib/subtaskPlan.ts)
 * --------------------------------------------------------------
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { breakdownTask } from '@/lib/gemini';
import { freeSlotsForUsers, todayISOBangkok } from '@/lib/schedule';
import { datesBetween, planSubtasks, type PlannedStep } from '@/lib/subtaskPlan';
import { syncAllSubtaskEvents } from '@/lib/taskCalendar';
import type { Subtask } from '@/lib/types';
import type { Subtask as PrismaSubtask } from '@prisma/client';

function serialize(s: PrismaSubtask): Subtask {
  return {
    id: s.id,
    title: s.title,
    done: s.done,
    plannedDate: s.plannedDate ? s.plannedDate.toISOString().slice(0, 10) : undefined,
    startTime: s.startTime ?? undefined,
    endTime: s.endTime ?? undefined,
    estimatedMinutes: s.estimatedMinutes ?? undefined,
    onCalendar: !!s.scheduledEventId,
  };
}

const MAX_PLAN_DAYS = 60;

export async function POST(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const [task, me] = await Promise.all([
    prisma.task.findUnique({ where: { id: params.id } }),
    prisma.user.findUnique({ where: { id: userId }, select: { maxFocusMinutes: true, bufferMinutes: true } }),
  ]);
  if (!task || task.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const today = todayISOBangkok();
  const due = task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null;
  // วันเริ่ม: ใช้ startDate ถ้ามี ไม่งั้นถอยไปใช้วันที่สร้างงาน (งานเก่าที่ยังไม่มีคอลัมน์นี้)
  // แต่ไม่ให้ย้อนหลังกว่าวันนี้ เพราะวางแผนย้อนอดีตไม่มีประโยชน์
  const rawStart = (task.startDate ?? task.createdAt).toISOString().slice(0, 10);
  const start = rawStart < today ? today : rawStart;

  // ช่วงวันที่ใช้วางแผน (มีเฉพาะงานที่มีกำหนดส่งและกำหนดส่งยังไม่เลย)
  const planDates = due && due >= start ? datesBetween(start, due, MAX_PLAN_DAYS) : [];
  const spanDays = planDates.length > 0 ? planDates.length : null;

  let steps: Awaited<ReturnType<typeof breakdownTask>> = null;
  try {
    steps = await breakdownTask({
      title: task.title,
      spanDays,
      totalMinutes: task.estimatedMinutes ?? null,
      maxSessionMinutes: me?.maxFocusMinutes ?? null,
    });
  } catch {
    steps = null;
  }

  // ไม่มี local fallback สำหรับฟีเจอร์นี้ (ต้องอาศัยความเข้าใจภาษาจริง) - ถ้า Gemini ใช้ไม่ได้ ให้แจ้งตรงๆ
  if (!steps) {
    return NextResponse.json(
      { error: 'ตอนนี้เอ็ดดี้แตกงานให้ไม่ได้ (อาจยังไม่ได้ตั้งค่า Gemini API หรือเชื่อมต่อไม่สำเร็จ) ลองใหม่อีกครั้งนะ' },
      { status: 502 },
    );
  }

  // วางแผนวัน/เวลา เฉพาะงานที่มีกำหนดส่ง — งานที่ไม่มีกำหนดส่งได้แค่รายการขั้นตอน (ไม่มีวัน)
  let planned: PlannedStep[];
  if (planDates.length > 0) {
    const slotsByUser = await freeSlotsForUsers([userId], planDates);
    planned = planSubtasks(steps, slotsByUser.get(userId) ?? [], planDates, me?.bufferMinutes ?? 0);
  } else {
    planned = steps.map((s) => ({ ...s, date: null, startTime: null, endTime: null }));
  }

  const last = await prisma.subtask.findFirst({ where: { taskId: params.id }, orderBy: { order: 'desc' } });
  const startOrder = (last?.order ?? -1) + 1;

  // สร้างทีละตัวตามลำดับ (ไม่ใช้ Promise.all) เพื่อให้ order ตรงกับลำดับที่วางแผนไว้จริงๆ
  const created: PrismaSubtask[] = [];
  for (let i = 0; i < planned.length; i++) {
    const p = planned[i];
    created.push(
      await prisma.subtask.create({
        data: {
          title: p.title,
          taskId: params.id,
          order: startOrder + i,
          estimatedMinutes: p.estimatedMinutes,
          plannedDate: p.date ? new Date(`${p.date}T00:00:00.000Z`) : null,
          startTime: p.startTime,
          endTime: p.endTime,
        },
      }),
    );
  }

  // งานที่เพิ่งมีขั้นตอนย่อย = ยังไม่เสร็จจนกว่าจะติ๊กครบ
  // ต้องเขียนลง DB ด้วย ไม่ใช่แค่ปรับ state ฝั่งหน้าเว็บ
  // (เคสจริง: อีกแท็บติ๊กขั้นตอนสุดท้ายจนงานถูกปิดไปแล้ว แท็บนี้เพิ่งมาแตกงานเพิ่ม
  //  ถ้าไม่เขียน งานจะค้างเป็น done ทั้งที่มีขั้นตอนใหม่ที่ยังไม่ได้ทำ แล้วหายจากลิสต์)
  if (task.done) {
    await prisma.task.update({ where: { id: params.id }, data: { done: false, completedAt: null } });
  }

  // ขั้นตอนที่ได้วันเวลาแล้ว -> ลงปฏิทินให้เลย ผู้ใช้จะได้เห็นแผนทั้งหมดในปฏิทินทันที
  const onCalendar = await syncAllSubtaskEvents(params.id, userId);

  const unplaced = planned.filter((p) => !p.date).length;
  return NextResponse.json(
    {
      // อ่านใหม่หลังซิงก์ปฏิทิน เพื่อให้ scheduledEventId ที่ส่งกลับตรงกับของจริง
      subtasks: (
        await prisma.subtask.findMany({
          where: { id: { in: created.map((c) => c.id) } },
          orderBy: { order: 'asc' },
        })
      ).map(serialize),
      planned: planDates.length > 0,
      onCalendar,
      // บอกผู้ใช้ตรงๆ ถ้าบางขั้นตอนหาช่องว่างไม่ได้ จะได้ไม่งงว่าทำไมบางอันไม่มีวัน
      message:
        planDates.length === 0
          ? 'งานนี้ยังไม่มีกำหนดส่ง เอ็ดดี้เลยแตกขั้นตอนให้อย่างเดียว (ใส่กำหนดส่งแล้วจะช่วยวางวันให้ได้)'
          : unplaced > 0
            ? `วางเวลาให้ได้ ${planned.length - unplaced} จาก ${planned.length} ขั้นตอน (ลงปฏิทินแล้ว ${onCalendar} รายการ) — ที่เหลือช่วงนั้นไม่มีเวลาว่างพอ ปรับเองได้เลย`
            : `แตกเป็น ${planned.length} ขั้นตอน และลงปฏิทินให้แล้วทั้งหมด ${onCalendar} รายการ`,
    },
    { status: 201 },
  );
}
