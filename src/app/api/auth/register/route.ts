import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { registerSchema } from "@/lib/validations/auth";
import { ok, err } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.errors[0].message, 400);
    }

    const { email, password, fullName, phone } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return err("Пользователь с таким email уже существует", 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, passwordHash, fullName, phone, role: "student" },
      select: { id: true, email: true, fullName: true, role: true },
    });

    return ok(user, 201);
  } catch (error) {
    console.error("Register error:", error);
    return err("Внутренняя ошибка сервера", 500);
  }
}
