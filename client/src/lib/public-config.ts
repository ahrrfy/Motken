import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "./api";
import { isNative, API_BASE } from "./capacitor";

export interface PublicConfig {
  appUrl: string;
}

const FALLBACK_APP_URL = isNative
  ? API_BASE
  : (typeof window !== "undefined" ? window.location.origin : "https://sirajalquran.org");

export function usePublicConfig(): { appUrl: string; isLoading: boolean } {
  const { data, isLoading } = useQuery<PublicConfig>({
    queryKey: ["public-config"],
    queryFn: () => apiGet("/api/public-config"),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });
  return {
    appUrl: data?.appUrl || FALLBACK_APP_URL,
    isLoading,
  };
}

export async function fetchCredentialsMessage(payload: {
  variant: "simple" | "with-parent" | "parent-linked";
  name: string;
  username: string;
  password: string;
  role: string;
  mosqueName?: string;
  parent?: { name: string; username: string; password: string };
  studentNames?: string[];
}): Promise<{ message: string; appUrl: string }> {
  const res = await apiPost("/api/credentials-message", payload);
  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: "فشل توليد الرسالة" }));
    throw new Error(data.message || "فشل توليد الرسالة");
  }
  return res.json();
}

export function getFallbackAppUrl(): string {
  return FALLBACK_APP_URL;
}
