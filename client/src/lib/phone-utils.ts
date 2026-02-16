export function formatIraqiPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\.]/g, '');
  if (cleaned.startsWith('07')) {
    cleaned = '+964' + cleaned.substring(1);
  }
  if (cleaned.startsWith('964') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

export function isValidIraqiPhone(phone: string): boolean {
  const cleaned = formatIraqiPhone(phone);
  return /^\+9647\d{8,9}$/.test(cleaned);
}

export function getWhatsAppUrl(phone: string, message?: string): string {
  const cleaned = formatIraqiPhone(phone).replace('+', '');
  const url = `https://wa.me/${cleaned}`;
  return message ? `${url}?text=${encodeURIComponent(message)}` : url;
}
