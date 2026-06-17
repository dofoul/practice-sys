import { v4 as uuidv4 } from "uuid";

function slug(str: string): string {
  return str
    .trim()
    .replace(/[,./\\:*?"<>|]/g, "")   // убрать спецсимволы
    .replace(/\s+/g, "_")              // пробелы → _
    .replace(/_+/g, "_")               // схлопнуть повторы
    .substring(0, 64);
}

interface PathOptions {
  groupName: string;
  studentName: string;
  periodName: string;
  docTypeName: string;
  originalFileName: string;
}

/**
 * Builds a human-readable MinIO path:
 * practices/ИСП-31/Петров_Пётр_Петрович/Лето_2026/uuid-Отчёт.pdf
 */
export function buildDocumentPath(opts: PathOptions): string {
  const ext = opts.originalFileName.includes(".")
    ? opts.originalFileName.slice(opts.originalFileName.lastIndexOf("."))
    : "";
  const fileName = `${uuidv4()}-${slug(opts.docTypeName)}${ext}`;
  return [
    "practices",
    slug(opts.groupName),
    slug(opts.studentName),
    slug(opts.periodName),
    fileName,
  ].join("/");
}

export function buildDiaryExportPath(opts: Omit<PathOptions, "docTypeName" | "originalFileName">): string {
  const timestamp = Date.now();
  return [
    "practices",
    slug(opts.groupName),
    slug(opts.studentName),
    slug(opts.periodName),
    `${timestamp}-Дневник_практики.txt`,
  ].join("/");
}
