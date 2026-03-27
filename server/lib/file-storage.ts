/**
 * File storage abstraction — S3-compatible (MinIO/AWS S3)
 * Falls back to local DB storage if MinIO is not configured
 */

interface FileStorageConfig {
  endpoint: string;
  port: number;
  accessKey: string;
  secretKey: string;
  useSSL: boolean;
}

interface UploadResult {
  bucket: string;
  key: string;
  url: string;
}

function getConfig(): FileStorageConfig | null {
  const endpoint = process.env.MINIO_ENDPOINT;
  if (!endpoint) return null;

  return {
    endpoint,
    port: parseInt(process.env.MINIO_PORT || "9000"),
    accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    useSSL: process.env.MINIO_USE_SSL === "true",
  };
}

/**
 * Check if external file storage (MinIO) is available
 */
export function isFileStorageAvailable(): boolean {
  return getConfig() !== null;
}

/**
 * Upload a buffer to file storage
 * Returns the URL to access the file
 */
export async function uploadFile(
  bucket: string,
  key: string,
  data: Buffer,
  contentType: string,
): Promise<UploadResult> {
  const config = getConfig();
  if (!config) {
    throw new Error("File storage not configured. Set MINIO_ENDPOINT env var.");
  }

  // Dynamic import to avoid requiring minio when not configured
  const { Client } = await import("minio");
  const client = new Client({
    endPoint: config.endpoint,
    port: config.port,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    useSSL: config.useSSL,
  });

  // Ensure bucket exists
  const bucketExists = await client.bucketExists(bucket);
  if (!bucketExists) {
    await client.makeBucket(bucket);
  }

  await client.putObject(bucket, key, data, data.length, {
    "Content-Type": contentType,
  });

  const protocol = config.useSSL ? "https" : "http";
  const url = `${protocol}://${config.endpoint}:${config.port}/${bucket}/${key}`;

  return { bucket, key, url };
}

/**
 * Get a file from storage as a buffer
 */
export async function getFile(bucket: string, key: string): Promise<Buffer> {
  const config = getConfig();
  if (!config) {
    throw new Error("File storage not configured");
  }

  const { Client } = await import("minio");
  const client = new Client({
    endPoint: config.endpoint,
    port: config.port,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    useSSL: config.useSSL,
  });

  const stream = await client.getObject(bucket, key);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucket: string, key: string): Promise<void> {
  const config = getConfig();
  if (!config) return;

  const { Client } = await import("minio");
  const client = new Client({
    endPoint: config.endpoint,
    port: config.port,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    useSSL: config.useSSL,
  });

  await client.removeObject(bucket, key);
}

/**
 * Generate a presigned URL for direct download (valid for 1 hour)
 */
export async function getPresignedUrl(bucket: string, key: string, expirySeconds = 3600): Promise<string> {
  const config = getConfig();
  if (!config) {
    throw new Error("File storage not configured");
  }

  const { Client } = await import("minio");
  const client = new Client({
    endPoint: config.endpoint,
    port: config.port,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    useSSL: config.useSSL,
  });

  return client.presignedGetObject(bucket, key, expirySeconds);
}
