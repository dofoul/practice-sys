import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, ok, err } from "@/lib/api";
import { z } from "zod";

const diaryEntrySchema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Дата должна быть в формате YYYY-MM-DD"),
  content: z.string().min(1, "Запись не может быть пустой").max(10000, "Запись слишком длинная"),
});

async function getPracticeForUser(practiceId: number, userId: number, role: string) {
  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    include: {
      student: { include: { user: true, group: true } },
    },
  });
  if (!practice) return null;

  if (role === "student" && practice.student.userId !== userId) return null;
  if (role === "curator") {
    const curator = await prisma.curator.findUnique({
      where: { userId },
      include: { groupCurators: { select: { groupId: true } } },
    });
    const groupIds = curator?.groupCurators.map((gc) => gc.groupId) ?? [];
    if (!groupIds.includes(practice.student.groupId)) return null;
  }

  return practice;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const practiceId = Number(id);
  const userId = Number(session.user.id);
  const role = session.user.role;

  const practice = await getPracticeForUser(practiceId, userId, role);
  if (!practice) return err("Практика не найдена или нет доступа", 404);

  const entries = await prisma.diaryEntry.findMany({
    where: { practiceId },
    orderBy: { entryDate: "asc" },
    select: { id: true, entryDate: true, content: true, updatedAt: true },
  });

  return ok(entries);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (session.user.role !== "student") return err("Только студент может вести дневник", 403);

  const { id } = await params;
  const practiceId = Number(id);
  const userId = Number(session.user.id);

  const practice = await getPracticeForUser(practiceId, userId, "student");
  if (!practice) return err("Практика не найдена или нет доступа", 404);

  if (practice.status === "completed" || practice.status === "rejected") {
    return err("Нельзя вести дневник завершённой или отклонённой практики", 400);
  }

  const body = await req.json();
  const parsed = diaryEntrySchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.errors[0].message, 400);

  const { entryDate, content } = parsed.data;

  const entryDateObj = new Date(entryDate);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (entryDateObj > today) {
    return err("Нельзя добавить запись будущей датой", 400);
  }

  if (practice.dateStart && entryDateObj < new Date(practice.dateStart)) {
    return err("Дата записи раньше начала практики", 400);
  }

  const entry = await prisma.diaryEntry.upsert({
    where: { practiceId_entryDate: { practiceId, entryDate: entryDateObj } },
    update: { content },
    create: { practiceId, entryDate: entryDateObj, content, createdBy: userId },
    select: { id: true, entryDate: true, content: true, updatedAt: true },
  });

  return ok(entry, 201);
}
