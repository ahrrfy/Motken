import { Client } from "minio";
import { logger } from "./logger";

const BUCKET_NAME = "audio-recordings";

let minioClient: Client | null = null;

function getMinioClient(): Client | null {
  if (minioClient) return minioClient;

  const endpoint = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;

  if (!endpoint || !accessKey || !secretKey) {
    return null;
  }

  minioClient = new Client({
    endPoint: endpoint,
    port: parseInt(process.env.MINIO_PORT || "9000", 10),
    useSSL: false,
    accessKey,
    secretKey,
  });

  return minioClient;
}

/**
 * Ensure the audio bucket exists (called once on startup)
 */
export async function initMinioBucket(): Promise<boolean> {
  const client = getMinioClient();
  if (!client) {
    logger.info("MinIO not configured — audio will use database storage");
    return false;
  }
  try {
    const exists = await client.bucketExists(BUCKET_NAME);
    if (!exists) {
      await client.makeBucket(BUCKET_NAME);
      logger.info(`MinIO bucket '${BUCKET_NAME}' created`);
    }
    return true;
  } catch (err: unknown) {
    logger.error({ err }, "MinIO initialization failed — falling back to database storage");
    return false;
  }
}

/**
 * Upload audio buffer to MinIO
 * @returns The object key (path) for retrieval
 */
export async function uploadAudio(
  assignmentId: string,
  buffer: Buffer,
  mimeType: string
): Promise<string | null> {
  const client = getMinioClient();
  if (!client) return null;

  const key = `assignments/${assignmentId}/${Date.now()}.${mimeType.split("/")[1] || "webm"}`;
  try {
    await client.putObject(BUCKET_NAME, key, buffer, buffer.length, {
      "Content-Type": mimeType,
    });
    return key;
  } catch (err: unknown) {
    logger.error({ err, assignmentId }, "MinIO upload failed");
    return null;
  }
}

/**
 * Get audio as a readable stream from MinIO
 */
export async function getAudioStream(
  key: string
): Promise<{ stream: NodeJS.ReadableStream; mimeType?: string } | null> {
  const client = getMinioClient();
  if (!client) return null;

  try {
    const stream = await client.getObject(BUCKET_NAME, key);
    return { stream };
  } catch (err: unknown) {
    logger.error({ err, key }, "MinIO download failed");
    return null;
  }
}

/**
 * Delete audio from MinIO
 */
export async function deleteAudio(key: string): Promise<boolean> {
  const client = getMinioClient();
  if (!client) return false;

  try {
    await client.removeObject(BUCKET_NAME, key);
    return true;
  } catch (err: unknown) {
    logger.error({ err, key }, "MinIO delete failed");
    return false;
  }
}

/**
 * Check if MinIO is available
 */
export function isMinioAvailable(): boolean {
  return getMinioClient() !== null;
}
