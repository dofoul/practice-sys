import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const items = await prisma.institution.findMany({
    include: { specialties: true },
    orderBy: { name: "asc" },
  });

  return ok({ items });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const roleError = requireRole(session, "admin");
  if (roleError) return roleError;

  try {
    const { name, shortName } = await req.json();
    if (!name) return err("Название обязательно", 400);
    const item = await prisma.institution.create({ data: { name, shortName } });
    return ok(item, 201);
  } catch (e) {
    console.error(e);
    return err("Ошибка создания", 500);
  }
}
