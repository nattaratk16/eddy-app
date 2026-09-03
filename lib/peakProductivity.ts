/**
 * lib/peakProductivity.ts
 * --------------------------------------------------------------
 * "ช่วงเวลาไหนของวันที่ทำงานเสร็จเยอะที่สุด" (Time-of-Day Analysis) - วิเคราะห์จาก timestamp
 * ที่ติ๊กงานเสร็จ (Task.completedAt + GroupTask.completedAt) ด้วย Kernel Density Estimation
 * แบบวงกลม (von Mises kernel) เพราะเวลาในหนึ่งวันเป็นข้อมูลวงกลม (23:59 กับ 00:01 อยู่ติดกัน
 * จริงๆ) ค่าเฉลี่ย/ความหนาแน่นแบบเส้นตรงธรรมดาจะคำนวณผิดถ้ามีงานเสร็จดึกๆ คาบเที่ยงคืนพอดี
 *
 * ไม่มี stats library ในโปรเจกต์นี้ (มีแค่ date-fns) เลยเขียนสูตรเองทั้งหมด:
 *   - Bessel function I0(κ) แบบ series expansion
 *   - ประมาณค่า concentration κ จากข้อมูลจริงด้วยสูตร Fisher (1993) แทนใช้ค่าคงที่ตายตัว
 *     (ข้อมูลกระจุกตัวมาก κ จะสูง = โค้งแหลม, ข้อมูลกระจายมาก κ จะต่ำ = โค้งแบน)
 * --------------------------------------------------------------
 */
import { prisma } from './prisma';
import { hourOfDayBangkok } from './thaiTime';

const LOOKBACK_DAYS = 90;
const MIN_DATA_POINTS = 5;
const SAMPLES_PER_HOUR = 4; // ทุก 15 นาที
const BESSEL_TERMS = 20;

/** I0(κ) - Bessel function ชนิดปรับแปลง อันดับ 0 (modified Bessel function, first kind) */
export function besselI0(kappa: number): number {
  let sum = 0;
  let term = 1; // เทอม m=0: (1/0!)^2 * (κ/2)^0 = 1
  const half = kappa / 2;
  for (let m = 0; m < BESSEL_TERMS; m++) {
    sum += term;
    // term(m+1) = term(m) * (κ/2)^2 / (m+1)^2 - ต่อยอดจากเทอมก่อนหน้า แทนคำนวณ factorial/power ใหม่ทุกรอบ
    term *= (half * half) / ((m + 1) * (m + 1));
  }
  return sum;
}

export interface CircularMean {
  rBar: number; // ความยาวเวกเตอร์เฉลี่ย (0=กระจายเท่ากันทุกทิศ, 1=จุดเดียวกันหมด)
  meanDirection: number; // มุมเฉลี่ย (เรเดียน)
}

export function computeCircularMean(thetas: number[]): CircularMean {
  const c = thetas.reduce((sum, t) => sum + Math.cos(t), 0) / thetas.length;
  const s = thetas.reduce((sum, t) => sum + Math.sin(t), 0) / thetas.length;
  return { rBar: Math.sqrt(c * c + s * s), meanDirection: Math.atan2(s, c) };
}

/**
 * ประมาณค่า concentration κ จาก R̄ ด้วยสูตรของ Fisher (1993) - มาตรฐานที่ใช้กันทั่วไปสำหรับ
 * von Mises MLE จำกัดค่าไว้ที่ [0.01, 12] กัน κ พุ่งไม่จำกัดตอน R̄ เข้าใกล้ 1 (ข้อมูลกระจุกตัวมากๆ)
 * ซึ่งทำให้ series ของ I0 ข้างบน (ตัดที่ 20 เทอม) เริ่มไม่แม่นยำ และเกินความละเอียดของกริดที่ใช้แสดงผลอยู่ดี
 */
export function estimateKappa(rBar: number): number {
  let kappa: number;
  if (rBar < 0.53) {
    kappa = 2 * rBar + rBar ** 3 + (5 * rBar ** 5) / 6;
  } else if (rBar < 0.85) {
    kappa = -0.4 + 1.39 * rBar + 0.43 / (1 - rBar);
  } else {
    kappa = 1 / (rBar ** 3 - 4 * rBar ** 2 + 3 * rBar);
  }
  return Math.min(12, Math.max(0.01, kappa));
}

/** ความหนาแน่นของ von Mises distribution ที่มุม theta */
export function vonMisesDensity(theta: number, mu: number, kappa: number): number {
  return Math.exp(kappa * Math.cos(theta - mu)) / (2 * Math.PI * besselI0(kappa));
}

export interface DensityPoint {
  hour: number; // 0-24
  density: number;
}

/**
 * สร้างเส้นโค้งความหนาแน่นแบบ KDE (ผลรวมของ von Mises kernel ที่จุดข้อมูลทุกจุด หารด้วยจำนวนจุด)
 * สุ่มตัวอย่าง 0-24 ชม. รวมจุดปลายทั้งสองข้าง (0 และ 24) เพราะฟังก์ชันเป็นคาบ f(0)=f(24) พอดี
 * เส้นกราฟแบบ Cartesian เลยต่อกันสนิทที่รอยต่อเที่ยงคืนโดยไม่ต้องเสริมกลไกอะไรเพิ่ม
 */
export function buildDensityCurve(thetas: number[], kappa: number): DensityPoint[] {
  const n = thetas.length;
  const totalSamples = 24 * SAMPLES_PER_HOUR;
  const points: DensityPoint[] = [];
  for (let i = 0; i <= totalSamples; i++) {
    const hour = (i / totalSamples) * 24;
    const theta = (hour / 24) * 2 * Math.PI;
    const density = thetas.reduce((sum, ti) => sum + vonMisesDensity(theta, ti, kappa), 0) / n;
    points.push({ hour, density });
  }
  return points;
}

export interface PeakWindow {
  hour: number; // ชั่วโมงที่ความหนาแน่นสูงสุด (mode)
  from: number;
  to: number;
}

/** หาจุดสูงสุดของเส้นโค้ง แล้วรายงานเป็นช่วง ±1 ชั่วโมงรอบจุดนั้น (เข้าใจง่ายกว่าคำนวณความกว้างแบบสถิติ) */
export function findPeakWindow(curve: DensityPoint[]): PeakWindow {
  const peak = curve.reduce((a, b) => (b.density > a.density ? b : a));
  const hour = Math.round(peak.hour) % 24;
  return { hour, from: (hour - 1 + 24) % 24, to: (hour + 1) % 24 };
}

export interface PeakProductivityResult {
  hasEnoughData: boolean;
  sampleCount: number;
  curve: DensityPoint[];
  peak: PeakWindow | null;
}

const EMPTY_RESULT: PeakProductivityResult = { hasEnoughData: false, sampleCount: 0, curve: [], peak: null };

/** ดึง completedAt จริงของผู้ใช้ (งานส่วนตัว + งานกลุ่มที่ได้รับมอบหมาย) มาวิเคราะห์ */
export async function getPeakProductivity(userId: string): Promise<PeakProductivityResult> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000);

  const [tasks, groupTasks] = await Promise.all([
    prisma.task.findMany({ where: { userId, completedAt: { gte: since } }, select: { completedAt: true } }),
    // completedAt ของ GroupTask จะถูกรีเซ็ตเป็น null ทันทีถ้า assignment ถูกปฏิเสธทีหลัง (ดู
    // respond/route.ts) เลยไม่ต้องกรอง status ซ้ำ - มี completedAt แปลว่ายังนับเป็นงานที่เสร็จจริงเสมอ
    prisma.groupTaskAssignment.findMany({
      where: { assignedToUserId: userId, groupTask: { completedAt: { gte: since } } },
      select: { groupTask: { select: { completedAt: true } } },
    }),
  ]);

  const timestamps: Date[] = [...tasks.map((t) => t.completedAt!), ...groupTasks.map((a) => a.groupTask.completedAt!)];
  if (timestamps.length < MIN_DATA_POINTS) return EMPTY_RESULT;

  const thetas = timestamps.map((d) => (hourOfDayBangkok(d) / 24) * 2 * Math.PI);
  const { rBar } = computeCircularMean(thetas);
  const kappa = estimateKappa(rBar);
  const curve = buildDensityCurve(thetas, kappa);

  return { hasEnoughData: true, sampleCount: timestamps.length, curve, peak: findPeakWindow(curve) };
}
