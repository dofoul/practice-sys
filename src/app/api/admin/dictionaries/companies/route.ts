import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  const items = await prisma.company.findMany({ orderBy: { name: "asc" } });
  return ok(items);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleError = requireRole(session, "admin", "curator");
  if (roleError) return roleError;
  try {
    const { name, inn, address, contactPerson, contactPhone } = await req.json();
    if (!name) return err("Название обязательно", 400);
    const item = await prisma.company.create({
      data: { name, inn, address, contactPerson, contactPhone },
    });
    return ok(item, 201);
  } catch (e) {
    console.error(e);
    return err("Ошибка создания", 500);
  }
}
