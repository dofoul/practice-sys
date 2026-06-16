import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const roleError = requireRole(session, "admin");
  if (roleError) return roleError;

  const { id } = await params;
  try {
    const { name, dateStart, dateEnd, isOpen } = await req.json();
    const item = await prisma.practicePeriod.update({
      where: { id: Number(id) },
      data: {
        name,
        dateStart: dateStart ? new Date(dateStart) : undefined,
        dateEnd: dateEnd ? new Date(dateEnd) : undefined,
        isOpen,
      },
    });
    return ok(item);
  } catch (e) {
    console.error(e);
    return err("Ошибка обновления", 500);
  }
}
