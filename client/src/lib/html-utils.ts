/**
 * أدوات HTML مشتركة — مُتْقِن
 * دالة واحدة موحدة لتنظيف HTML بدلاً من 3 نسخ مكررة
 */

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
