import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, ok, err } from "@/lib/api";
import { z } from "zod";

const reviewSchema = z.object({
  practiceId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reviews = await prisma.offerReview.findMany({
    where: { offerId: Number(id) },
    orderBy: { createdAt: "desc" },
    include: {
      student: { include: { user: { select: { fullName: true } } } },
    },
  });

  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  return ok({ reviews, avgRating: avg, reviewCount: reviews.length });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (session.user.role !== "student") return err("Только студент может оставить отзыв", 403);

  const { id } = await params;
  const offerId = Number(id);

  const body = await req.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.errors[0].message, 400);

  const { practiceId, rating, comment } = parsed.data;

  const student = await prisma.student.findUnique({ where: { userId: Number(session.user.id) } });
  if (!student) return err("Профиль студента не найден", 404);

  const practice = await prisma.practice.findUnique({ where: { id: practiceId } });
  if (!practice) return err("Практика не найдена", 404);
  if (practice.studentId !== student.id) return err("Нет доступа к этой практике", 403);
  if (practice.status !== "completed") return err("Отзыв можно оставить только после завершения практики", 400);
  if (practice.offerId !== offerId) return err("Практика не связана с этим предложением", 400);

  const existing = await prisma.offerReview.findUnique({ where: { practiceId } });
  if (existing) return err("Вы уже оставили отзыв об этом месте практики", 409);

  const review = await prisma.offerReview.create({
    data: { offerId, practiceId, studentId: student.id, rating, comment },
  });

  return ok(review, 201);
}
