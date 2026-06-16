import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, err, ok } from "@/lib/api";
import { deleteObject } from "@/lib/minio";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const document = await prisma.document.findUnique({
    where: { id: Number(id) },
    include: { practice: true },
  });

  if (!document) return err("Документ не найден", 404);

  const userId = Number(session.user.id);
  const role = session.user.role;

  if (role === "student") {
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student || document.practice.studentId !== student.id)
      return err("Нет доступа", 403);

    const editableStatuses = ["draft", "needs_revision"];
    if (!editableStatuses.includes(document.practice.status))
      return err("Нельзя удалить документ — практика уже на проверке", 400);

    if (document.status === "accepted")
      return err("Нельзя удалить принятый документ", 400);
  } else if (role !== "curator" && role !== "admin") {
    return err("Нет доступа", 403);
  }

  try {
    await deleteObject(document.fileKey);
  } catch {
    // файл мог не существовать в хранилище — продолжаем удаление записи
  }

  await prisma.document.delete({ where: { id: Number(id) } });

  return ok({ success: true });
}
