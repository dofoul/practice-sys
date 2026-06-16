import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";
import { updateOfferSchema } from "@/lib/validations/offer";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const offer = await prisma.practiceOffer.findUnique({
    where: { id: Number(id) },
    include: {
      company: true,
      practiceType: true,
      period: true,
      templates: { include: { documentType: true } },
    },
  });
  if (!offer) return err("Предложение не найдено", 404);
  return ok(offer);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const offer = await prisma.practiceOffer.findUnique({ where: { id: Number(id) } });
  if (!offer) return err("Предложение не найдено", 404);

  const isOwner = offer.createdBy === Number(session.user.id);
  if (!isOwner && session.user.role !== "admin") {
    return err("Нет доступа", 403);
  }

  try {
    const body = await req.json();
    const parsed = updateOfferSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message, 400);

    const updated = await prisma.practiceOffer.update({
      where: { id: Number(id) },
      data: parsed.data,
    });
    return ok(updated);
  } catch (e) {
    console.error(e);
    return err("Ошибка обновления", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const offer = await prisma.practiceOffer.findUnique({ where: { id: Number(id) } });
  if (!offer) return err("Предложение не найдено", 404);

  const isOwner = offer.createdBy === Number(session.user.id);
  if (!isOwner && session.user.role !== "admin") return err("Нет доступа", 403);

  await prisma.practiceOffer.delete({ where: { id: Number(id) } });
  return ok({ success: true });
}
