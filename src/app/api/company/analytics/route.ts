import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleErr = requireRole(session, "company");
  if (roleErr) return roleErr;

  const company = await prisma.company.findUnique({
    where: { ownerUserId: Number(session.user.id) },
  });
  if (!company) return err("Компания не найдена", 404);

  const [
    offersAll,
    practicesAll,
    recentApplicants,
    reviewsAll,
  ] = await Promise.all([
    prisma.practiceOffer.findMany({
      where: { companyId: company.id },
      include: { _count: { select: { practices: true } } },
    }),
    prisma.practice.findMany({
      where: { offer: { companyId: company.id } },
      select: { status: true, grade: true, createdAt: true },
    }),
    prisma.practice.findMany({
      where: { offer: { companyId: company.id } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        student: {
          include: {
            user: { select: { fullName: true } },
            group: { select: { name: true } },
          },
        },
        offer: { select: { title: true } },
      },
    }),
    prisma.offerReview.findMany({
      where: { offer: { companyId: company.id } },
      select: { rating: true },
    }),
  ]);

  const totalOffers     = offersAll.length;
  const publishedOffers = offersAll.filter((o) => o.isPublished).length;
  const draftOffers     = totalOffers - publishedOffers;
  const totalSlots      = offersAll.reduce((s, o) => s + o.slotsTotal, 0);
  const takenSlots      = offersAll.reduce((s, o) => s + o.slotsTaken, 0);

  const statusCounts = practicesAll.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  const avgRating =
    reviewsAll.length > 0
      ? Math.round((reviewsAll.reduce((s, r) => s + r.rating, 0) / reviewsAll.length) * 10) / 10
      : null;

  const offerStats = offersAll.map((o) => ({
    id: o.id,
    title: o.title,
    isPublished: o.isPublished,
    slotsTotal: o.slotsTotal,
    slotsTaken: o.slotsTaken,
    applicantsCount: o._count.practices,
    fillPercent: o.slotsTotal > 0 ? Math.round((o.slotsTaken / o.slotsTotal) * 100) : 0,
  }));

  return ok({
    summary: {
      totalOffers,
      publishedOffers,
      draftOffers,
      totalSlots,
      takenSlots,
      totalApplicants: practicesAll.length,
      avgRating,
      reviewCount: reviewsAll.length,
    },
    statusCounts,
    offerStats,
    recentApplicants,
  });
}
