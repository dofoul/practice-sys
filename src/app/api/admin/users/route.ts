import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const roleError = requireRole(session, "admin");
  if (roleError) return roleError;

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = 20;
  const search = searchParams.get("search") ?? "";
  const role = searchParams.get("role");

  const where = {
    ...(search ? {
      OR: [
        { fullName: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
    ...(role ? { role: role as "student" | "curator" | "admin" | "company" } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, fullName: true, role: true, phone: true, isActive: true, createdAt: true },
    }),
    prisma.user.count({ where }),
  ]);

  return ok({ items, total });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const roleError = requireRole(session, "admin");
  if (roleError) return roleError;

  try {
    const body = await req.json();
    const { email, password, fullName, role, phone, isActive } = body;

    if (!email || !password || !fullName || !role) return err("Заполните все обязательные поля", 400);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return err("Email уже используется", 409);

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, fullName, role, phone, isActive: isActive ?? true },
      select: { id: true, email: true, fullName: true, role: true, isActive: true },
    });

    return ok(user, 201);
  } catch (e) {
    console.error(e);
    return err("Ошибка создания пользователя", 500);
  }
}
