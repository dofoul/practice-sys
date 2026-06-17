export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { S3Client, PutBucketCorsCommand, CreateBucketCommand, HeadBucketCommand } = await import("@aws-sdk/client-s3");

  const endpoint = process.env.MINIO_ENDPOINT;
  const accessKeyId = process.env.MINIO_ACCESS_KEY;
  const secretAccessKey = process.env.MINIO_SECRET_KEY;
  const bucket = process.env.MINIO_BUCKET;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) return;

  const s3 = new S3Client({
    endpoint,
    region: "us-east-1",
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });

  try {
    // Ensure bucket exists
    try {
      await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    }

    // Set CORS so browsers can PUT presigned upload URLs from any origin
    await s3.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: ["*"],
              AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
              AllowedHeaders: ["*"],
              ExposeHeaders: ["ETag"],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      })
    );

    console.log("[minio] CORS configured for bucket:", bucket);
  } catch (e) {
    console.error("[minio] Failed to configure CORS:", e);
  }
}
