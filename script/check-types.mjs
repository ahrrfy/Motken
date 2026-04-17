#!/usr/bin/env node
/**
 * Type Check مع baseline للأخطاء الموجودة مسبقاً.
 *
 * المبدأ:
 * - نحتفظ برقم BASELINE للأخطاء القديمة (يُخفَّض تدريجياً عند كل إصلاح)
 * - CI يمر عندما عدد الأخطاء <= BASELINE
 * - يفشل CI على أي خطأ جديد يتجاوز الـ baseline
 *
 * هذا النهج يمنع تراكم ديون تقنية جديدة بينما نعمل على إصلاح القديمة.
 *
 * لتقليل الـ baseline: أصلح أخطاءً من tsc، ثم حدّث BASELINE هنا.
 */

import { spawnSync } from "node:child_process";

// ─── Baseline ───────────────────────────────────────────────────────────────
// عدد أخطاء TypeScript القديمة (type debt). يُقلَّل فقط — لا يُرفع.
const BASELINE = 241;

// أقصى عدد مسموح حالياً (= baseline بالضبط).
// كل PR جديد يجب ألا يرفع هذا الرقم.
const MAX_ALLOWED = BASELINE;

// ─── Run tsc ────────────────────────────────────────────────────────────────
console.log("▶ Running TypeScript check...");
const result = spawnSync("npx", ["tsc", "--noEmit", "--pretty", "false"], {
  encoding: "utf8",
  shell: true,
  stdio: ["inherit", "pipe", "pipe"],
});

const output = (result.stdout || "") + (result.stderr || "");
const errorLines = output.split("\n").filter((l) => /error TS\d+:/.test(l));
const count = errorLines.length;

// ─── Report ─────────────────────────────────────────────────────────────────
console.log("");
if (count === 0) {
  console.log(`✅ Type check passed — 0 errors! Baseline (${BASELINE}) can be removed from check-types.mjs`);
  process.exit(0);
}

if (count <= MAX_ALLOWED) {
  console.log(`⚠️  Type check: ${count} pre-existing errors (baseline: ${BASELINE})`);
  console.log(`   These are legacy errors being fixed gradually.`);
  if (count < BASELINE) {
    console.log(`   🎉 ${BASELINE - count} errors fixed since baseline! Please update BASELINE in check-types.mjs to ${count}.`);
  }
  process.exit(0);
}

// ─── New errors detected — fail ─────────────────────────────────────────────
const newErrors = count - BASELINE;
console.error(`❌ Type check FAILED — ${count} errors (${newErrors} new errors above baseline ${BASELINE})`);
console.error("");
console.error("New errors introduced. Review recent changes:");
console.error("");

// Show first 30 errors to help debugging
for (const line of errorLines.slice(0, 30)) {
  console.error(`   ${line}`);
}
if (errorLines.length > 30) {
  console.error(`   ... and ${errorLines.length - 30} more`);
}

process.exit(1);
