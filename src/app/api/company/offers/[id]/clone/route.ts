import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleErr = requireRole(session, "company");
  if (roleErr) return roleErr;

  const { id } = await params;

  const company = await prisma.company.findUnique({
    where: { ownerUserId: Number(session.user.id) },
  });
  if (!company) return err("Компания не найдена", 404);

  const original = await prisma.practiceOffer.findUnique({
    where: { id: Number(id) },
    include: { templates: true },
  });
  if (!original || original.companyId !== company.id) return err("Вакансия не найдена", 404);

  const clone = await prisma.$transaction(async (tx) => {
    const newOffer = await tx.practiceOffer.create({
      data: {
        companyId: original.companyId,
        practiceTypeId: original.practiceTypeId,
        periodId: original.periodId,
        title: `${original.title} (копия)`,
        description: original.description,
        direction: original.direction,
        slotsTotal: original.slotsTotal,
        slotsTaken: 0,
        createdBy: Number(session.user.id),
        isPublished: false,
      },
    });

    if (original.templates.length > 0) {
      await tx.offerTemplate.createMany({
        data: original.templates.map((t) => ({
          offerId: newOffer.id,
          documentTypeId: t.documentTypeId,
          fileKey: t.fileKey,
          prefilledFields: t.prefilledFields ?? undefined,
        })),
      });
    }

    return newOffer;
  });

  return ok(clone, 201);
}
