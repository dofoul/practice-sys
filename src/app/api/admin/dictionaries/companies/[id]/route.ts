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
    const body = await req.json();
    const { name, inn, address, contactPerson, contactPhone, isVerified } = body;
    const item = await prisma.company.update({
      where: { id: Number(id) },
      data: { name, inn, address, contactPerson, contactPhone, ...(isVerified !== undefined ? { isVerified } : {}) },
    });
    return ok(item);
  } catch (e) {
    console.error(e);
    return err("Ошибка обновления", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleError = requireRole(session, "admin");
  if (roleError) return roleError;
  const { id } = await params;
  try {
    await prisma.company.delete({ where: { id: Number(id) } });
    return ok({ success: true });
  } catch (e) {
    console.error(e);
    return err("Ошибка удаления", 500);
  }
}
