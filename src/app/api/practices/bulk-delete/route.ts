import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, ok, err } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  ids: z.array(z.number()).min(1, "Выберите хотя бы одну практику"),
});

// Statuses where a slot has been claimed and must be freed before deletion
const SLOT_CONSUMING_STATUSES = ["submitted", "needs_revision", "approved"];

// Statuses that a student is allowed to delete (history cleanup)
const STUDENT_DELETABLE_STATUSES = ["completed", "rejected"];

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const role = session.user.role;
  if (role !== "admin" && role !== "student") return err("Нет доступа", 403);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err(parsed.error.errors[0].message, 400);

  const { ids } = parsed.data;

  const practices = await prisma.practice.findMany({
    where: { id: { in: ids } },
    select: { id: true, offerId: true, status: true, studentId: true },
  });

  if (practices.length === 0) return err("Практики не найдены", 404);

  if (role === "student") {
    const student = await prisma.student.findUnique({
      where: { userId: Number(session.user.id) },
    });
    if (!student) return err("Профиль студента не найден", 404);

    const unauthorized = practices.find((p) => p.studentId !== student.id);
    if (unauthorized) return err("Нет доступа к одной или нескольким практикам", 403);

    const nonDeletable = practices.find(
      (p) => !STUDENT_DELETABLE_STATUSES.includes(p.status)
    );
    if (nonDeletable)
      return err("Можно удалять только завершённые или отклонённые практики", 400);
  }

  await prisma.$transaction(async (tx) => {
    // Free slots for practices that had claimed a slot
    // (completed/rejected already freed their slots when status changed — only relevant for admin bulk-delete of active practices)
    const withSlots = practices.filter(
      (p) => p.offerId && SLOT_CONSUMING_STATUSES.includes(p.status)
    );
    for (const p of withSlots) {
      await tx.practiceOffer.update({
        where: { id: p.offerId! },
        data: { slotsTaken: { decrement: 1 } },
      });
    }

    await tx.practice.deleteMany({ where: { id: { in: ids } } });
  });

  return ok({ deleted: practices.length });
}
