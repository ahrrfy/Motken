/**
 * One-time migration script: Move audio from PostgreSQL base64 to MinIO
 *
 * Usage: npx tsx --env-file=.env script/migrate-audio-to-minio.ts
 *
 * What it does:
 * 1. Reads all assignmentAudio rows that have audioData (base64) but no audioKey
 * 2. Uploads each to MinIO
 * 3. Updates the row with the MinIO key
 * 4. Optionally clears the base64 data (pass --clear-base64 flag)
 *
 * Safe to run multiple times — skips already-migrated rows.
 */

import pg from "pg";
import { Client as MinioClient } from "minio";

const BUCKET = "audio-recordings";
const BATCH_SIZE = 50;
const clearBase64 = process.argv.includes("--clear-base64");

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL required");
    process.exit(1);
  }

  const endpoint = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  if (!endpoint || !accessKey || !secretKey) {
    console.error("MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY required");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: dbUrl });
  const minio = new MinioClient({
    endPoint: endpoint,
    port: parseInt(process.env.MINIO_PORT || "9000", 10),
    useSSL: false,
    accessKey,
    secretKey,
  });

  // Ensure bucket
  const exists = await minio.bucketExists(BUCKET);
  if (!exists) {
    await minio.makeBucket(BUCKET);
    console.log(`Created bucket: ${BUCKET}`);
  }

  // Count pending
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM assignment_audio WHERE audio_data IS NOT NULL AND audio_key IS NULL`
  );
  const total = parseInt(countResult.rows[0].count, 10);
  console.log(`Found ${total} audio records to migrate`);

  if (total === 0) {
    console.log("Nothing to migrate");
    await pool.end();
    return;
  }

  let migrated = 0;
  let failed = 0;

  while (true) {
    const batch = await pool.query(
      `SELECT id, assignment_id, audio_data, mime_type FROM assignment_audio
       WHERE audio_data IS NOT NULL AND audio_key IS NULL
       ORDER BY created_at LIMIT $1`,
      [BATCH_SIZE]
    );

    if (batch.rows.length === 0) break;

    for (const row of batch.rows) {
      try {
        const buffer = Buffer.from(row.audio_data, "base64");
        const ext = (row.mime_type || "audio/webm").split("/")[1] || "webm";
        const key = `assignments/${row.assignment_id}/${row.id}.${ext}`;

        await minio.putObject(BUCKET, key, buffer, buffer.length, {
          "Content-Type": row.mime_type || "audio/webm",
        });

        if (clearBase64) {
          await pool.query(
            `UPDATE assignment_audio SET audio_key = $1, audio_data = NULL WHERE id = $2`,
            [key, row.id]
          );
        } else {
          await pool.query(
            `UPDATE assignment_audio SET audio_key = $1 WHERE id = $2`,
            [key, row.id]
          );
        }

        migrated++;
        if (migrated % 10 === 0) {
          console.log(`Progress: ${migrated}/${total} migrated, ${failed} failed`);
        }
      } catch (err) {
        failed++;
        console.error(`Failed to migrate audio ${row.id}:`, err);
      }
    }
  }

  console.log(`\nMigration complete: ${migrated} migrated, ${failed} failed out of ${total}`);
  if (!clearBase64) {
    console.log("Base64 data preserved. Run with --clear-base64 to remove after verifying.");
  }

  await pool.end();
}

main().catch(console.error);
