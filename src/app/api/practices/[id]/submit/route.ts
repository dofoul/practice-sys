import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, ok, err } from "@/lib/api";
import { notifyPracticeSubmitted } from "@/lib/notifications";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (session.user.role !== "student") return err("Только студент может отправить на проверку", 403);

  const { id } = await params;
  const practice = await prisma.practice.findUnique({
    where: { id: Number(id) },
    include: { period: true },
  });
  if (!practice) return err("Практика не найдена", 404);

  const student = await prisma.student.findUnique({ where: { userId: Number(session.user.id) } });
  if (!student || practice.studentId !== student.id) return err("Нет доступа", 403);

  if (practice.status !== "draft" && practice.status !== "needs_revision") {
    return err("Можно отправить только черновик или практику на доработке", 400);
  }

  // #5 — период закрыт: запрещаем первичную подачу (draft→submitted), но разрешаем повторную после доработки
  if (practice.status === "draft" && !practice.period.isOpen) {
    return err("Период практики закрыт. Подача заявок больше не принимается.", 400);
  }

  // Claim the slot on first submit (draft → submitted) or resubmit (needs_revision → submitted)
  if (practice.offerId) {
    const offer = await prisma.practiceOffer.findUnique({ where: { id: practice.offerId } });
    if (!offer) return err("Предложение о практике не найдено", 404);
    if (offer.slotsTaken >= offer.slotsTotal) {
      return err("Свободных мест в этом предложении больше нет. Выберите другое место в каталоге.", 409);
    }
    await prisma.practiceOffer.update({
      where: { id: practice.offerId },
      data: { slotsTaken: { increment: 1 } },
    });
  }

  const updated = await prisma.practice.update({
    where: { id: Number(id) },
    data: { status: "submitted", submittedAt: new Date() },
  });

  // Notify curators of the student's group
  const studentWithGroup = await prisma.student.findUnique({
    where: { id: student.id },
    include: {
      user: { select: { fullName: true } },
      group: { include: { groupCurators: { include: { curator: true } } } },
    },
  });
  if (studentWithGroup) {
    const curatorUserIds = studentWithGroup.group.groupCurators.map((gc) => gc.curator.userId);
    await notifyPracticeSubmitted(Number(id), studentWithGroup.user.fullName, curatorUserIds).catch(console.error);
  }

  return ok(updated);
}
