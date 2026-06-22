import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";

function getS3Client(): S3Client {
  if (!env.MINIO_ENDPOINT || !env.MINIO_ACCESS_KEY || !env.MINIO_SECRET_KEY) {
    throw new Error("Storage is not configured. Set MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY.");
  }
  return new S3Client({
    endpoint: env.MINIO_ENDPOINT,
    region: "us-east-1",
    credentials: {
      accessKeyId: env.MINIO_ACCESS_KEY,
      secretAccessKey: env.MINIO_SECRET_KEY,
    },
    forcePathStyle: true,
    // AWS SDK v3.x sends x-amz-checksum-algorithm by default; MinIO rejects it
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export const BUCKET = env.MINIO_BUCKET ?? "praktik";

function toPublicUrl(url: string): string {
  if (!env.MINIO_PUBLIC_ENDPOINT || !env.MINIO_ENDPOINT) return url;
  const internal = new URL(env.MINIO_ENDPOINT);
  const pub = new URL(env.MINIO_PUBLIC_ENDPOINT);
  if (internal.origin === pub.origin) return url;
  return url.replace(internal.origin, pub.origin);
}

export async function getUploadPresignedUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return toPublicUrl(await getSignedUrl(getS3Client(), command, { expiresIn: 3600 }));
}

export async function getDownloadPresignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return toPublicUrl(await getSignedUrl(getS3Client(), command, { expiresIn: 3600 }));
}

export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
  await getS3Client().send(command);
}

export { getS3Client };
