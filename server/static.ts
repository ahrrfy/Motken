import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

export function serveStatic(app: Express) {
  // Support both ESM (import.meta.url) and CJS (__dirname) contexts
  const currentDir = typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));
  const distPath = path.resolve(currentDir, "..", "dist", "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Read index.html template once at startup
  const indexHtmlPath = path.resolve(distPath, "index.html");
  const indexHtmlTemplate = fs.readFileSync(indexHtmlPath, "utf-8");

  app.use(express.static(distPath, {
    index: false, // We handle index.html ourselves for nonce injection
  }));

  // fall through to index.html with CSP nonce injection
  app.use("/{*path}", (_req, res) => {
    const nonce = crypto.randomBytes(16).toString("base64");

    // Inject nonce into all script tags
    const html = indexHtmlTemplate
      .replace(/<script /g, `<script nonce="${nonce}" `);

    // Set CSP header with nonce (overrides helmet's static CSP)
    res.setHeader("Content-Security-Policy", [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}'`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `img-src 'self' data: blob: https:`,
      `connect-src 'self' https://api.alquran.cloud https://wa.me https://fonts.googleapis.com https://fonts.gstatic.com ws: wss:`,
      `frame-src 'self' blob:`,
      `object-src 'self' blob:`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `worker-src 'self' blob:`,
      `manifest-src 'self'`,
    ].join("; "));

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  });
}
