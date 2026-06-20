import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";
import { z } from "zod";

const createSchema = z.object({
  practiceTypeId: z.number().int().positive("Выберите тип практики"),
  periodId: z.number().int().positive("Выберите период"),
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  direction: z.string().max(128).optional(),
  slotsTotal: z.number().int().min(1, "Укажите количество мест"),
  isPublished: z.boolean().default(false),
});

async function getOwnCompany(userId: number) {
  return prisma.company.findUnique({ where: { ownerUserId: userId } });
}

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleErr = requireRole(session, "company");
  if (roleErr) return roleErr;

  const company = await getOwnCompany(Number(session.user.id));
  if (!company) return err("Компания не найдена", 404);

  const offers = await prisma.practiceOffer.findMany({
    where: { companyId: company.id },
    include: {
      practiceType: { select: { name: true } },
      period: { select: { name: true, dateStart: true, dateEnd: true } },
      templates: { include: { documentType: { select: { name: true } } } },
      offerReviews: { select: { rating: true } },
      _count: { select: { practices: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const enriched = offers.map((o) => ({
    ...o,
    avgRating: o.offerReviews.length
      ? Math.round((o.offerReviews.reduce((s, r) => s + r.rating, 0) / o.offerReviews.length) * 10) / 10
      : null,
    reviewCount: o.offerReviews.length,
    practicesCount: o._count.practices,
    offerReviews: undefined,
    _count: undefined,
  }));

  return ok(enriched);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleErr = requireRole(session, "company");
  if (roleErr) return roleErr;

  const company = await getOwnCompany(Number(session.user.id));
  if (!company) return err("Компания не найдена", 404);

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message, 400);

    const offer = await prisma.practiceOffer.create({
      data: {
        ...parsed.data,
        companyId: company.id,
        createdBy: Number(session.user.id),
      },
      include: {
        practiceType: { select: { name: true } },
        period: { select: { name: true } },
      },
    });
    return ok(offer, 201);
  } catch (e) {
    console.error(e);
    return err("Ошибка создания", 500);
  }
}
