import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleErr = requireRole(session, "company");
  if (roleErr) return roleErr;

  const company = await prisma.company.findUnique({ where: { ownerUserId: Number(session.user.id) } });
  if (!company) return err("Компания не найдена", 404);

  const { id } = await params;
  const offer = await prisma.practiceOffer.findUnique({ where: { id: Number(id) } });
  if (!offer || offer.companyId !== company.id) return err("Вакансия не найдена", 404);

  const applicants = await prisma.practice.findMany({
    where: { offerId: Number(id) },
    include: {
      student: {
        include: {
          user: { select: { fullName: true, email: true, phone: true } },
          group: { select: { name: true } },
        },
      },
      period: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(applicants);
}
