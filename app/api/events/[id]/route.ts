import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { CalendarEvent } from '@/lib/types';
import type { Event as PrismaEvent } from '@prisma/client';

function serialize(ev: PrismaEvent): CalendarEvent {
  return {
    id: ev.id,
    title: ev.title,
    date: ev.date.toISOString().slice(0, 10),
    endDate: ev.endDate ? ev.endDate.toISOString().slice(0, 10) : undefined,
    startTime: ev.startTime ?? undefined,
    endTime: ev.endTime ?? undefined,
    location: ev.location ?? undefined,
    description: ev.description ?? undefined,
    categoryId: ev.categoryId,
    color: (ev.color ?? undefined) as CalendarEvent['color'],
    isDeadline: ev.isDeadline || undefined,
  };
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.event.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();

  if (body.categoryId !== undefined) {
    const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
    if (!category || category.userId !== session.user.id) {
      return NextResponse.json({ error: 'Invalid categoryId' }, { status: 400 });
    }
  }

  let newDate: Date | undefined;
  if (body.date !== undefined) {
    newDate = new Date(body.date);
    if (Number.isNaN(newDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }
  }

  // กิจกรรมหลายวัน (ไม่บังคับ) - undefined = ไม่แตะ, ค่าว่าง/falsy = ล้างกลับเป็นกิจกรรมวันเดียว
  const effectiveDate = newDate ?? existing.date;
  let newEndDate: Date | null | undefined;
  if (body.endDate !== undefined) {
    if (!body.endDate) {
      newEndDate = null;
    } else {
      const parsed = new Date(body.endDate);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 });
      }
      if (parsed < effectiveDate) {
        return NextResponse.json({ error: 'วันสิ้นสุดต้องไม่ก่อนวันเริ่ม' }, { status: 400 });
      }
      newEndDate = parsed.getTime() === effectiveDate.getTime() ? null : parsed;
    }
  } else if (newDate !== undefined && existing.endDate && existing.endDate < effectiveDate) {
    // ย้ายวันเริ่มโดยไม่ได้แตะวันสิ้นสุด แล้วทำให้ endDate เดิมกลับมาอยู่ก่อนวันเริ่มใหม่ -> ล้างทิ้งกันสถานะเพี้ยน
    newEndDate = null;
  }

  // ค่าเวลาที่จะมีผลจริงหลังอัปเดต (undefined = ไม่ได้แตะ ใช้ค่าเดิม) - เช็คย้อนหลังแบบเดียวกับตอนสร้างใหม่
  const effectiveStartTime = body.startTime !== undefined ? body.startTime || null : existing.startTime;
  const effectiveEndTime = body.endTime !== undefined ? body.endTime || null : existing.endTime;
  if (effectiveStartTime && effectiveEndTime && effectiveEndTime <= effectiveStartTime) {
    return NextResponse.json({ error: 'เวลาสิ้นสุดต้องหลังเวลาเริ่ม' }, { status: 400 });
  }

  const event = await prisma.event.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(newDate !== undefined && { date: newDate }),
      ...(newEndDate !== undefined && { endDate: newEndDate }),
      ...(body.startTime !== undefined && { startTime: body.startTime || null }),
      ...(body.endTime !== undefined && { endTime: body.endTime || null }),
      ...(body.location !== undefined && { location: body.location || null }),
      ...(body.description !== undefined && { description: body.description || null }),
      ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
    },
  });

  // event นี้อาจเป็น "ช่วงลงมือทำ" ของขั้นตอนย่อยใน To-do (ผูกผ่าน Subtask.scheduledEventId)
  // Subtask เก็บวัน/เวลาเป็นสำเนาแยกต่างหาก ไม่ได้อ่านสดจาก Event เลยไม่อัปเดตตามเองถ้าไม่เขียนย้อนกลับตรงนี้
  // (บั๊กที่เจอจริง: ลากเวลาในปฏิทินแล้วหน้า To-do ยังโชว์เวลาเก่าค้างอยู่)
  if (event.sourceTaskId && (newDate !== undefined || body.startTime !== undefined || body.endTime !== undefined)) {
    await prisma.subtask.updateMany({
      where: { scheduledEventId: event.id },
      data: { plannedDate: event.date, startTime: event.startTime, endTime: event.endTime },
    });
  }

  return NextResponse.json({ event: serialize(event) });
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.event.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.event.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
