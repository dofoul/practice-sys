import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleError = requireRole(session, "admin", "curator");
  if (roleError) return roleError;
  const { id } = await params;
  try {
    const { name, inn, address, contactPerson, contactPhone } = await req.json();
    const item = await prisma.company.update({
      where: { id: Number(id) },
      data: { name, inn, address, contactPerson, contactPhone },
    });
    return ok(item);
  } catch (e) {
    console.error(e);
    return err("Ошибка обновления", 500);
  }
}
