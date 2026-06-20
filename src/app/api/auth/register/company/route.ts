import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { ok, err } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Неверный формат email"),
  password: z.string().min(8, "Минимум 8 символов"),
  fullName: z.string().min(2, "ФИО слишком короткое").max(255),
  phone: z.string().max(32).optional(),
  companyName: z.string().min(2, "Название компании обязательно").max(255),
  inn: z.string().max(16).optional(),
  address: z.string().max(255).optional(),
  contactPerson: z.string().max(255).optional(),
  contactPhone: z.string().max(32).optional(),
  description: z.string().optional(),
  website: z.string().max(255).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message, 400);

    const { email, password, fullName, phone, companyName, inn, address, contactPerson, contactPhone, description, website } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return err("Пользователь с таким email уже существует", 409);

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, fullName, phone, role: "company" },
        select: { id: true, email: true, fullName: true, role: true },
      });
      const company = await tx.company.create({
        data: { name: companyName, inn, address, contactPerson, contactPhone, description, website, ownerUserId: user.id },
        select: { id: true, name: true },
      });
      return { user, company };
    });

    return ok(result, 201);
  } catch (e) {
    console.error("Company register error:", e);
    return err("Внутренняя ошибка сервера", 500);
  }
}
