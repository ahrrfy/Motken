import { APP_VERSION } from "./capacitor";

export interface VersionCheckResponse {
  latestVersion: string;
  minimumVersion: string;
  updateAvailable: boolean;
  forceUpdate: boolean;
  downloadUrl: string;
  message: string | null;
}

export async function checkForceUpdate(): Promise<VersionCheckResponse | null> {
  try {
    const res = await fetch(
      `/api/app/version-check?platform=android&version=${encodeURIComponent(APP_VERSION)}`,
      { credentials: "include" }
    );
    if (!res.ok && res.status !== 426) return null;
    return await res.json();
  } catch {
    return null;
  }
}
