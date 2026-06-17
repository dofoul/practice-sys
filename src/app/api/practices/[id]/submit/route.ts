import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, ok, err } from "@/lib/api";
import { notifyPracticeSubmitted } from "@/lib/notifications";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (session.user.role !== "student") return err("Только студент может отправить на проверку", 403);

  const { id } = await params;
  const practice = await prisma.practice.findUnique({ where: { id: Number(id) } });
  if (!practice) return err("Практика не найдена", 404);

  const student = await prisma.student.findUnique({ where: { userId: Number(session.user.id) } });
  if (!student || practice.studentId !== student.id) return err("Нет доступа", 403);

  if (practice.status !== "draft" && practice.status !== "needs_revision") {
    return err("Можно отправить только черновик или практику на доработке", 400);
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
