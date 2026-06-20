import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";
import { z } from "zod";

const updateSchema = z.object({
  practiceTypeId: z.number().int().positive().optional(),
  periodId: z.number().int().positive().optional(),
  title: z.string().min(3).max(255).optional(),
  description: z.string().optional(),
  direction: z.string().max(128).optional(),
  slotsTotal: z.number().int().min(1).optional(),
  isPublished: z.boolean().optional(),
});

async function getOwnOffer(userId: number, offerId: number) {
  const company = await prisma.company.findUnique({ where: { ownerUserId: userId } });
  if (!company) return null;
  const offer = await prisma.practiceOffer.findUnique({ where: { id: offerId } });
  if (!offer || offer.companyId !== company.id) return null;
  return offer;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleErr = requireRole(session, "company");
  if (roleErr) return roleErr;

  const { id } = await params;
  const offer = await getOwnOffer(Number(session.user.id), Number(id));
  if (!offer) return err("Вакансия не найдена", 404);

  const full = await prisma.practiceOffer.findUnique({
    where: { id: Number(id) },
    include: {
      practiceType: { select: { name: true } },
      period: { select: { name: true, dateStart: true, dateEnd: true } },
      templates: { include: { documentType: { select: { id: true, name: true } } } },
      offerReviews: { select: { rating: true, comment: true, createdAt: true } },
      _count: { select: { practices: true } },
    },
  });

  return ok(full);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleErr = requireRole(session, "company");
  if (roleErr) return roleErr;

  const { id } = await params;
  const offer = await getOwnOffer(Number(session.user.id), Number(id));
  if (!offer) return err("Вакансия не найдена", 404);

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message, 400);

    if (parsed.data.slotsTotal !== undefined && parsed.data.slotsTotal < offer.slotsTaken) {
      return err(`Нельзя уменьшить количество мест ниже занятых (${offer.slotsTaken})`, 400);
    }

    const updated = await prisma.practiceOffer.update({
      where: { id: Number(id) },
      data: parsed.data,
    });
    return ok(updated);
  } catch (e) {
    console.error(e);
    return err("Ошибка обновления", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleErr = requireRole(session, "company");
  if (roleErr) return roleErr;

  const { id } = await params;
  const offer = await getOwnOffer(Number(session.user.id), Number(id));
  if (!offer) return err("Вакансия не найдена", 404);

  if (offer.slotsTaken > 0) {
    return err("Нельзя удалить вакансию, на которую уже записаны студенты", 400);
  }

  await prisma.practiceOffer.delete({ where: { id: Number(id) } });
  return ok({ success: true });
}
