import { requireAuth, requireRole, ok, err } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleErr = requireRole(session, "company");
  if (roleErr) return roleErr;

  const company = await prisma.company.findUnique({
    where: { ownerUserId: Number(session.user.id) },
  });
  if (!company) return err("Компания не найдена", 404);

  try {
    const [activeOffers, totalSlots, takenSlots, completedPractices, pendingPractices, reviews] =
      await Promise.all([
        prisma.practiceOffer.count({ where: { companyId: company.id, isPublished: true } }),
        prisma.practiceOffer.aggregate({ where: { companyId: company.id }, _sum: { slotsTotal: true } }),
        prisma.practiceOffer.aggregate({ where: { companyId: company.id }, _sum: { slotsTaken: true } }),
        prisma.practice.count({ where: { companyId: company.id, status: "completed" } }),
        prisma.practice.count({ where: { companyId: company.id, status: { in: ["submitted", "needs_revision", "approved"] } } }),
        prisma.offerReview.findMany({
          where: { offer: { companyId: company.id } },
          select: { rating: true },
        }),
      ]);

    const avgRating = reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null;

    const recentApplicants = await prisma.practice.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        student: { include: { user: { select: { fullName: true } }, group: { select: { name: true } } } },
        offer: { select: { title: true } },
      },
    });

    return ok({
      activeOffers,
      totalSlots: totalSlots._sum.slotsTotal ?? 0,
      takenSlots: takenSlots._sum.slotsTaken ?? 0,
      completedPractices,
      pendingPractices,
      avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      reviewCount: reviews.length,
      recentApplicants,
    });
  } catch (e) {
    console.error(e);
    return err("Ошибка сервера", 500);
  }
}
