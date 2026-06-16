import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const items = await prisma.practicePeriod.findMany({ orderBy: { dateStart: "desc" } });
  return ok({ items });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const roleError = requireRole(session, "admin");
  if (roleError) return roleError;

  try {
    const { name, dateStart, dateEnd, isOpen } = await req.json();
    if (!name || !dateStart || !dateEnd) return err("Заполните все поля", 400);
    const item = await prisma.practicePeriod.create({
      data: { name, dateStart: new Date(dateStart), dateEnd: new Date(dateEnd), isOpen: isOpen ?? true },
    });
    return ok(item, 201);
  } catch (e) {
    console.error(e);
    return err("Ошибка создания периода", 500);
  }
}
