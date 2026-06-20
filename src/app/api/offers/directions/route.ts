import { prisma } from "@/lib/db";
import { ok } from "@/lib/api";

export async function GET() {
  const offers = await prisma.practiceOffer.findMany({
    where: { isPublished: true, direction: { not: null } },
    select: { direction: true },
    distinct: ["direction"],
    orderBy: { direction: "asc" },
  });

  const directions = offers.map((o) => o.direction).filter(Boolean) as string[];
  return ok(directions);
}
