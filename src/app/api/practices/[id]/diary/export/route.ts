import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, ok, err } from "@/lib/api";
import { getS3Client, BUCKET } from "@/lib/minio";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { buildDiaryExportPath } from "@/lib/storage-path";
import dayjs from "dayjs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (session.user.role !== "student") return err("Только студент может экспортировать дневник", 403);

  const { id } = await params;
  const practiceId = Number(id);
  const userId = Number(session.user.id);

  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    include: {
      student: {
        include: {
          user: { select: { fullName: true } },
          group: { select: { name: true } },
        },
      },
      period: { select: { name: true } },
      diaryEntries: { orderBy: { entryDate: "asc" } },
    },
  });

  if (!practice || practice.student.userId !== userId) {
    return err("Практика не найдена или нет доступа", 404);
  }

  if (practice.diaryEntries.length === 0) {
    return err("Дневник пуст — нечего экспортировать", 400);
  }

  const studentName = practice.student.user.fullName;
  const dateStart = practice.dateStart ? dayjs(practice.dateStart).format("DD.MM.YYYY") : "—";
  const dateEnd = practice.dateEnd ? dayjs(practice.dateEnd).format("DD.MM.YYYY") : "—";

  const lines: string[] = [
    "ДНЕВНИК ПРАКТИКИ",
    "=".repeat(40),
    `Студент: ${studentName}`,
    `Период: ${dateStart} — ${dateEnd}`,
    "",
  ];

  for (const entry of practice.diaryEntries) {
    lines.push(`=== ${dayjs(entry.entryDate).format("DD.MM.YYYY")} ===`);
    lines.push(entry.content);
    lines.push("");
  }

  const textContent = lines.join("\n");
  const fileKey = buildDiaryExportPath({
    groupName: practice.student.group.name,
    studentName: practice.student.user.fullName,
    periodName: practice.period.name,
  });

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: fileKey,
      Body: Buffer.from(textContent, "utf-8"),
      ContentType: "text/plain; charset=utf-8",
    })
  );

  const diaryType = await prisma.documentType.findUnique({ where: { code: "diary" } });
  if (!diaryType) return err("Тип документа 'дневник' не найден в справочнике", 500);

  const document = await prisma.document.create({
    data: {
      practiceId,
      documentTypeId: diaryType.id,
      fileKey,
      originalName: `Дневник практики — ${studentName}.txt`,
      status: "uploaded",
      uploadedBy: userId,
    },
    include: { documentType: { select: { name: true } } },
  });

  return ok(document, 201);
}
