import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const roleError = requireRole(session, "admin");
  if (roleError) return roleError;

  try {
    const { institutionId, name, code } = await req.json();
    if (!institutionId || !name) return err("Заполните обязательные поля", 400);
    const item = await prisma.specialty.create({ data: { institutionId, name, code } });
    return ok(item, 201);
  } catch (e) {
    console.error(e);
    return err("Ошибка создания специальности", 500);
  }
}
