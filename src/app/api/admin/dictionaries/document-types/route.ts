import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  const items = await prisma.documentType.findMany({ orderBy: { name: "asc" } });
  return ok(items);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleError = requireRole(session, "admin");
  if (roleError) return roleError;
  try {
    const { code, name, isRequired } = await req.json();
    if (!code || !name) return err("Заполните все поля", 400);
    const item = await prisma.documentType.create({ data: { code, name, isRequired: isRequired ?? true } });
    return ok(item, 201);
  } catch (e) {
    console.error(e);
    return err("Ошибка создания", 500);
  }
}
