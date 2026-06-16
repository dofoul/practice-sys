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

  const items = await prisma.user.findMany({
    where,
    orderBy: { fullName: "asc" },
    select: {
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
    },
  });

  return ok(items);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleError = requireRole(session, "admin");
  if (roleError) return roleError;

  try {
    const { fullName, email, password, position, department } = await req.json();
    if (!fullName || !email || !password) return err("ФИО, email и пароль обязательны", 400);

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
