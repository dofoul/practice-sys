import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  inn: z.string().max(16).optional(),
  address: z.string().max(255).optional(),
  contactPerson: z.string().max(255).optional(),
  contactPhone: z.string().max(32).optional(),
  description: z.string().optional(),
  website: z.string().max(255).optional(),
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
  if (!company) return err("Профиль компании не найден", 404);
  return ok(company);
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleErr = requireRole(session, "company");
  if (roleErr) return roleErr;

  const company = await getOwnCompany(Number(session.user.id));
  if (!company) return err("Профиль компании не найден", 404);

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message, 400);

    const updated = await prisma.company.update({
      where: { id: company.id },
      data: parsed.data,
    });
    return ok(updated);
  } catch (e) {
    console.error(e);
    return err("Ошибка обновления", 500);
  }
}
