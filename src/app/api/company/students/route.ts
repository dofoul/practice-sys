import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleErr = requireRole(session, "company");
  if (roleErr) return roleErr;

  const company = await prisma.company.findUnique({
    where: { ownerUserId: Number(session.user.id) },
  });
  if (!company) return err("Компания не найдена", 404);

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("search") ?? "";

  const practices = await prisma.practice.findMany({
    where: {
      offer: { companyId: company.id },
      ...(status ? { status } : {}),
      ...(search
        ? {
            student: {
              user: { fullName: { contains: search, mode: "insensitive" as const } },
            },
          }
        : {}),
    },
    include: {
      student: {
        include: {
          user: { select: { fullName: true, email: true, phone: true } },
          group: { select: { name: true } },
        },
      },
      offer: { select: { id: true, title: true } },
      period: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return ok(practices);
}
