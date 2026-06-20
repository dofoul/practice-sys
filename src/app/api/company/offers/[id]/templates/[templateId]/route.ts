import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";
import { deleteObject } from "@/lib/minio";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleErr = requireRole(session, "company");
  if (roleErr) return roleErr;

  const company = await prisma.company.findUnique({ where: { ownerUserId: Number(session.user.id) } });
  if (!company) return err("Компания не найдена", 404);

  const { id, templateId } = await params;

  const template = await prisma.offerTemplate.findUnique({
    where: { id: Number(templateId) },
    include: { offer: true },
  });
  if (!template || template.offerId !== Number(id) || template.offer.companyId !== company.id) {
    return err("Шаблон не найден", 404);
  }

  try {
    await deleteObject(template.fileKey);
  } catch {
    // file might not exist in MinIO yet — still delete the record
  }

  await prisma.offerTemplate.delete({ where: { id: template.id } });
  return ok({ success: true });
}
