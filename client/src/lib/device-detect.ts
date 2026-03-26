export type DeviceType = "mobile" | "tablet" | "desktop";

export function getDeviceType(): DeviceType {
  const ua = navigator.userAgent;
  const isMobileUA = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTabletUA = /iPad|Android(?!.*Mobile)/i.test(ua);
  const w = window.innerWidth;
  if (isTabletUA || (w >= 768 && w < 1024)) return "tablet";
  if (isMobileUA || w < 768) return "mobile";
  return "desktop";
}

export function isMobileOrTablet(): boolean {
  return getDeviceType() !== "desktop";
}

/**
 * Returns true only for actual mobile phones (not tablets).
 * Tablets get the desktop/sidebar layout for better space usage.
 */
export function isMobileOnly(): boolean {
  return getDeviceType() === "mobile";
}
