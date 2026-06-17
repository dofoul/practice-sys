import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";

const s3 = new S3Client({
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

export const BUCKET = env.MINIO_BUCKET;

// Presigned URLs are signed against MINIO_ENDPOINT (internal Docker hostname).
// If MINIO_PUBLIC_ENDPOINT differs (e.g. http://localhost:9000 vs http://minio:9000),
// replace the host in the URL so the browser can actually reach it.
function toPublicUrl(url: string): string {
  if (!env.MINIO_PUBLIC_ENDPOINT) return url;
  const internal = new URL(env.MINIO_ENDPOINT);
  const pub = new URL(env.MINIO_PUBLIC_ENDPOINT);
  if (internal.origin === pub.origin) return url;
  return url.replace(internal.origin, pub.origin);
}

export async function getUploadPresignedUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return toPublicUrl(await getSignedUrl(s3, command, { expiresIn: 3600 }));
}

export async function getDownloadPresignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return toPublicUrl(await getSignedUrl(s3, command, { expiresIn: 3600 }));
}

export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
  await s3.send(command);
}

export { s3 };
