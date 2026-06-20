import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";
import { getUploadPresignedUrl } from "@/lib/minio";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const uploadSchema = z.object({
  documentTypeId: z.number().int().positive("Выберите тип документа"),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleErr = requireRole(session, "company");
  if (roleErr) return roleErr;

  const company = await prisma.company.findUnique({ where: { ownerUserId: Number(session.user.id) } });
  if (!company) return err("Компания не найдена", 404);

  const { id } = await params;
  const offer = await prisma.practiceOffer.findUnique({ where: { id: Number(id) } });
  if (!offer || offer.companyId !== company.id) return err("Вакансия не найдена", 404);

  try {
    const body = await req.json();
    const parsed = uploadSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message, 400);

    const { documentTypeId, fileName, contentType } = parsed.data;

    const docType = await prisma.documentType.findUnique({ where: { id: documentTypeId } });
    if (!docType) return err("Тип документа не найден", 404);

    const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")) : "";
    const key = `templates/company-${company.id}/offer-${offer.id}/${uuidv4()}${ext}`;

    const uploadUrl = await getUploadPresignedUrl(key, contentType);

    const template = await prisma.offerTemplate.create({
      data: { offerId: offer.id, documentTypeId, fileKey: key },
      include: { documentType: { select: { id: true, name: true } } },
    });

    return ok({ template, uploadUrl }, 201);
  } catch (e) {
    console.error(e);
    return err("Ошибка создания шаблона", 500);
  }
}
