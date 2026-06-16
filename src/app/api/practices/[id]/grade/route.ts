import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";
import { gradePracticeSchema } from "@/lib/validations/practice";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const roleError = requireRole(session, "curator", "admin");
  if (roleError) return roleError;

  const { id } = await params;
  const practice = await prisma.practice.findUnique({ where: { id: Number(id) } });
  if (!practice) return err("Практика не найдена", 404);

  if (practice.status !== "approved") {
    return err("Оценку можно выставить только принятой практике", 400);
  }

  try {
    const body = await req.json();
    const parsed = gradePracticeSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message, 400);

    const curator = await prisma.curator.findUnique({ where: { userId: Number(session.user.id) } });

    const [updated] = await prisma.$transaction([
      prisma.practice.update({
        where: { id: Number(id) },
        data: { status: "completed", grade: parsed.data.grade },
      }),
      prisma.practiceReview.create({
        data: {
          practiceId: Number(id),
          curatorId: curator?.id ?? 0,
          oldStatus: "approved",
          newStatus: "completed",
          comment: parsed.data.comment ?? `Выставлена оценка: ${parsed.data.grade}`,
        },
      }),
    ]);

    return ok(updated);
  } catch (e) {
    console.error(e);
    return err("Ошибка выставления оценки", 500);
  }
}
