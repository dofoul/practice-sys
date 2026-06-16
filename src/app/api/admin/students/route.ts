import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleError = requireRole(session, "admin", "curator");
  if (roleError) return roleError;

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Number(searchParams.get("pageSize") ?? 20));
  const search = searchParams.get("search") ?? "";
  const groupId = searchParams.get("groupId");

  const where = {
    ...(search ? {
      OR: [
        { user: { fullName: { contains: search, mode: "insensitive" as const } } },
        { user: { email: { contains: search, mode: "insensitive" as const } } },
        { recordBookNo: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
    ...(groupId ? { groupId: Number(groupId) } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { user: { fullName: "asc" } },
      include: {
        user: { select: { id: true, fullName: true, email: true, isActive: true } },
        group: { select: { id: true, name: true, specialty: { select: { name: true } } } },
      },
    }),
    prisma.student.count({ where }),
  ]);

  return ok({ items, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleError = requireRole(session, "admin");
  if (roleError) return roleError;

  try {
    const body = await req.json();
    const { fullName, email, password, groupId, recordBookNo } = body;

    if (!fullName || !email || !password || !groupId) {
      return err("Обязательные поля: ФИО, email, пароль, группа", 400);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return err("Пользователь с таким email уже существует", 409);

    const passwordHash = await bcrypt.hash(password, 10);

    const student = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, fullName, passwordHash, role: "student" },
      });
      return tx.student.create({
        data: { userId: user.id, groupId: Number(groupId), recordBookNo: recordBookNo || null },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          group: { select: { id: true, name: true } },
        },
      });
    });

    return ok(student, 201);
  } catch (e) {
    console.error(e);
    return err("Ошибка создания студента", 500);
  }
}
