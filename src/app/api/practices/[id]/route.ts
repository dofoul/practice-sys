import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, ok, err } from "@/lib/api";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const practice = await prisma.practice.findUnique({
    where: { id: Number(id) },
    include: {
      practiceType: true,
      period: true,
      student: {
        include: {
          user: { select: { fullName: true, email: true } },
          group: { select: { name: true } },
        },
      },
      offer: { include: { company: true } },
      documents: {
        include: { documentType: true },
        orderBy: { createdAt: "asc" },
      },
      reviews: {
        include: { curator: { include: { user: { select: { fullName: true } } } } },
        orderBy: { createdAt: "asc" },
      },
      diaryEntries: {
        orderBy: { entryDate: "asc" },
        select: { id: true, entryDate: true, content: true, updatedAt: true },
      },
    },
  });

  if (!practice) return err("Практика не найдена", 404);

  const userId = Number(session.user.id);
  const role = session.user.role;

  if (role === "student") {
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student || practice.studentId !== student.id) return err("Нет доступа", 403);
  } else if (role === "curator") {
    const curator = await prisma.curator.findUnique({
      where: { userId },
      include: { groupCurators: { include: { group: { include: { students: true } } } } },
    });
    const studentIds = curator?.groupCurators.flatMap((gc) => gc.group.students.map((s) => s.id)) ?? [];
    if (!studentIds.includes(practice.studentId)) return err("Нет доступа", 403);
  }

  return ok(practice);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (session.user.role !== "student") return err("Только студент может отменить свою практику", 403);

  const { id } = await params;
  const practice = await prisma.practice.findUnique({ where: { id: Number(id) } });
  if (!practice) return err("Практика не найдена", 404);

  const student = await prisma.student.findUnique({ where: { userId: Number(session.user.id) } });
  if (!student || practice.studentId !== student.id) return err("Нет доступа", 403);

  if (practice.status !== "draft") {
    return err("Отменить можно только черновик. Обратитесь к куратору для отклонения.", 400);
  }

  await prisma.$transaction(async (tx) => {
    if (practice.offerId) {
      await tx.practiceOffer.update({
        where: { id: practice.offerId },
        data: { slotsTaken: { decrement: 1 } },
      });
    }
    await tx.practice.delete({ where: { id: Number(id) } });
  });

  return ok({ success: true });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const practice = await prisma.practice.findUnique({ where: { id: Number(id) } });
  if (!practice) return err("Практика не найдена", 404);

  if (session.user.role !== "student") return err("Нет доступа", 403);

  if (practice.status !== "draft" && practice.status !== "needs_revision") {
    return err("Редактировать можно только черновик или практику на доработке", 400);
  }

  try {
    const body = await req.json();
    const updated = await prisma.practice.update({
      where: { id: Number(id) },
      data: {
        customPlace: body.customPlace,
        dateStart: body.dateStart ? new Date(body.dateStart) : undefined,
        dateEnd: body.dateEnd ? new Date(body.dateEnd) : undefined,
      },
    });
    return ok(updated);
  } catch (e) {
    console.error(e);
    return err("Ошибка обновления", 500);
  }
}
