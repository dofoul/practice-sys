import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, ok, err } from "@/lib/api";
import { getDownloadPresignedUrl } from "@/lib/minio";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const document = await prisma.document.findUnique({
    where: { id: Number(id) },
    include: { practice: { include: { student: true } } },
  });

  if (!document) return err("Документ не найден", 404);

  const userId = Number(session.user.id);
  const role = session.user.role;

  if (role === "student") {
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student || document.practice.studentId !== student.id) return err("Нет доступа", 403);
  }

  try {
    const url = await getDownloadPresignedUrl(document.fileKey);
    return ok({ url, fileName: document.originalName });
  } catch (e) {
    console.error(e);
    return err("Ошибка получения ссылки", 500);
  }
}
