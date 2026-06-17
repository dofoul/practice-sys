import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createCuratorSchema = z.object({
  fullName: z.string().min(2, "ФИО обязательно").max(255),
  email: z.string().email("Некорректный email"),
  password: z.string().min(8, "Пароль должен содержать минимум 8 символов"),
  position: z.string().max(128).optional().nullable(),
  department: z.string().max(128).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleError = requireRole(session, "admin");
  if (roleError) return roleError;

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Number(searchParams.get("pageSize") ?? 20));
  const search = searchParams.get("search") ?? "";

  const where = {
    role: "curator" as const,
    ...(search ? {
      OR: [
        { fullName: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const select = {
    id: true,
    fullName: true,
    email: true,
    isActive: true,
    curator: {
      select: {
        id: true,
        position: true,
        department: true,
        groupCurators: {
          select: {
            group: {
              select: {
                id: true,
                name: true,
                specialty: { select: { name: true } },
                _count: { select: { students: true } },
              },
            },
          },
        },
      },
    },
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { fullName: "asc" },
      select,
    }),
    prisma.user.count({ where }),
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
    const parsed = createCuratorSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message, 400);

    const { fullName, email, password, position, department } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return err("Email уже используется", 409);

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, fullName, passwordHash, role: "curator" },
      });
      const curator = await tx.curator.create({
        data: { userId: user.id, position: position || null, department: department || null },
      });
      return { id: user.id, fullName: user.fullName, email: user.email, isActive: user.isActive, curator: { id: curator.id, position: curator.position, department: curator.department, groupCurators: [] } };
    });

    return ok(result, 201);
  } catch (e) {
    console.error(e);
    return err("Ошибка создания куратора", 500);
  }
}
