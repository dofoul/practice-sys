import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, ok, err } from "@/lib/api";
import { getS3Client, BUCKET } from "@/lib/minio";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { buildDocumentPath } from "@/lib/storage-path";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (session.user.role !== "student") return err("Только студент может загружать документы", 403);

  const { id } = await params;
  const practice = await prisma.practice.findUnique({ where: { id: Number(id) } });
  if (!practice) return err("Практика не найдена", 404);

  if (!["draft", "submitted", "needs_revision"].includes(practice.status)) {
    return err("Документы можно загружать только до принятия или отклонения практики", 400);
  }

  const studentWithMeta = await prisma.student.findUnique({
    where: { userId: Number(session.user.id) },
    include: {
      user: { select: { fullName: true } },
      group: { select: { name: true } },
    },
  });
  if (!studentWithMeta || practice.studentId !== studentWithMeta.id) return err("Нет доступа", 403);

  const period = await prisma.practicePeriod.findUnique({ where: { id: practice.periodId } });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentTypeCode = formData.get("documentTypeCode") as string | null;

    if (!file) return err("Файл не передан", 400);
    if (!documentTypeCode) return err("Тип документа не указан", 400);

    if (!ALLOWED_TYPES.includes(file.type)) {
      return err("Недопустимый тип файла. Разрешены: PDF, DOC, DOCX, JPG, PNG", 400);
    }
    if (file.size > MAX_SIZE) {
      return err("Файл превышает 10 МБ", 400);
    }

    const docType = await prisma.documentType.findFirst({ where: { code: documentTypeCode } });
    if (!docType) return err("Тип документа не найден", 404);

    const fileKey = buildDocumentPath({
      groupName: studentWithMeta.group.name,
      studentName: studentWithMeta.user.fullName,
      periodName: period?.name ?? `practice-${id}`,
      docTypeName: docType.name,
      originalFileName: file.name,
    });
    const arrayBuffer = await file.arrayBuffer();

    await getS3Client().send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: fileKey,
        Body: Buffer.from(arrayBuffer),
        ContentType: file.type,
      })
    );

    const document = await prisma.document.create({
      data: {
        practiceId: Number(id),
        documentTypeId: docType.id,
        fileKey,
        originalName: file.name,
        status: "uploaded",
        uploadedBy: Number(session.user.id),
      },
    });

    return ok({ document }, 201);
  } catch (e) {
    console.error(e);
    return err("Ошибка загрузки документа", 500);
  }
}
