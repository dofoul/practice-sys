import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";
import { z } from "zod";
import bcrypt from "bcryptjs";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Введите текущий пароль"),
  newPassword: z.string().min(8, "Минимум 8 символов"),
});

export async function PUT(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleErr = requireRole(session, "company");
  if (roleErr) return roleErr;

  const body = await req.json();
  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.errors[0].message, 400);

  const user = await prisma.user.findUnique({ where: { id: Number(session.user.id) } });
  if (!user) return err("Пользователь не найден", 404);

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return err("Неверный текущий пароль", 400);

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  return ok({ success: true });
}
