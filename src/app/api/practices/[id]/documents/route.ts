import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, ok, err } from "@/lib/api";
import { s3, BUCKET } from "@/lib/minio";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

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

  if (practice.status !== "draft" && practice.status !== "needs_revision") {
    return err("Документы можно загружать только в черновике или при доработке", 400);
  }

  const student = await prisma.student.findUnique({ where: { userId: Number(session.user.id) } });
  if (!student || practice.studentId !== student.id) return err("Нет доступа", 403);

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

    const fileKey = `practices/${id}/${uuidv4()}-${file.name}`;
    const arrayBuffer = await file.arrayBuffer();

    await s3.send(
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
