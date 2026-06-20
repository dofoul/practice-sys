import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, ok, err } from "@/lib/api";
import { getDownloadPresignedUrl } from "@/lib/minio";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id, templateId } = await params;

  const template = await prisma.offerTemplate.findUnique({
    where: { id: Number(templateId) },
    include: { documentType: { select: { name: true } } },
  });

  if (!template || template.offerId !== Number(id)) {
    return err("Шаблон не найден", 404);
  }

  try {
    const url = await getDownloadPresignedUrl(template.fileKey);
    return ok({ url, fileName: template.documentType.name });
  } catch (e) {
    console.error(e);
    return err("Ошибка получения ссылки", 500);
  }
}
