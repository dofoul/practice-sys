import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const roleError = requireRole(session, "admin");
  if (roleError) return roleError;

  const { id } = await params;

  try {
    const body = await req.json();
    const { fullName, email, role, phone, isActive, password } = body;

    const data: Record<string, unknown> = { fullName, email, role, phone, isActive };
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data,
      select: { id: true, email: true, fullName: true, role: true, isActive: true },
    });

    return ok(user);
  } catch (e) {
    console.error(e);
    return err("Ошибка обновления", 500);
  }
}
