// Dev server launcher — prints immediately so preview_start detects it
import { spawn } from "child_process";
import { resolve } from "path";

const root = resolve(import.meta.dirname, "..");
const child = spawn("node", ["--import", "tsx/esm", "--env-file=.env", "server/index.ts"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "development" },
});

child.on("exit", (code) => process.exit(code || 0));
process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));
