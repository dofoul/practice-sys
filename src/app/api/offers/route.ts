import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";
import { createOfferSchema } from "@/lib/validations/offer";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Number(searchParams.get("pageSize") ?? 12));
  const search = searchParams.get("search") ?? "";
  const periodId = searchParams.get("periodId");
  const typeId = searchParams.get("typeId");
  const direction = searchParams.get("direction");
  const sort = searchParams.get("sort"); // "rating" | "date"

  const where = {
    isPublished: true,
    ...(search ? {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { company: { name: { contains: search, mode: "insensitive" as const } } },
      ],
    } : {}),
    ...(periodId ? { periodId: Number(periodId) } : {}),
    ...(typeId ? { practiceTypeId: Number(typeId) } : {}),
    ...(direction ? { direction } : {}),
  };

  const include = {
    company: { select: { name: true, address: true } },
    practiceType: { select: { name: true } },
    period: { select: { name: true, dateStart: true, dateEnd: true } },
    templates: { include: { documentType: { select: { name: true } } } },
    offerReviews: { select: { rating: true } },
  };

  if (sort === "rating") {
    // Fetch all matching offers, compute avg, sort, then paginate in memory
    const all = await prisma.practiceOffer.findMany({ where, include });
    const withRating = all.map((o) => ({
      ...o,
      avgRating: o.offerReviews.length ? o.offerReviews.reduce((s, r) => s + r.rating, 0) / o.offerReviews.length : 0,
      reviewCount: o.offerReviews.length,
    }));
    withRating.sort((a, b) => b.avgRating - a.avgRating);
    const total = withRating.length;
    const items = withRating.slice((page - 1) * pageSize, page * pageSize);
    return ok({ items, total, page, pageSize });
  }

  const [raw, total] = await Promise.all([
    prisma.practiceOffer.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include,
    }),
    prisma.practiceOffer.count({ where }),
  ]);

  const items = raw.map((o) => ({
    ...o,
    avgRating: o.offerReviews.length ? o.offerReviews.reduce((s, r) => s + r.rating, 0) / o.offerReviews.length : 0,
    reviewCount: o.offerReviews.length,
  }));

  return ok({ items, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const roleError = requireRole(session, "curator", "admin", "company");
  if (roleError) return roleError;

  try {
    const body = await req.json();
    const parsed = createOfferSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message, 400);

    const offer = await prisma.practiceOffer.create({
      data: { ...parsed.data, createdBy: Number(session.user.id) },
    });

    return ok(offer, 201);
  } catch (e) {
    console.error(e);
    return err("Ошибка создания предложения", 500);
  }
}
