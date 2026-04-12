/**
 * أدوات الهاتف — الواجهة الأمامية (سِرَاجُ الْقُرْآنِ)
 *
 * يعتمد على shared/phone-utils.ts للدوال المركزية
 * ويضيف: hooks للتحقق التفاعلي + أنماط CSS
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  normalizePhone,
  cleanDigits,
  isValidPhoneNumber as isValidPhoneShared,
  buildWhatsAppUrl as buildWhatsAppUrlShared,
  isPhoneQuery,
  phoneMatchesSearch,
  PHONE_MAX_LENGTH,
} from "@shared/phone-utils";

// ─── Re-exports من الملف المشترك ─────────────────────────────
export {
  normalizePhone,
  cleanDigits,
  isPhoneQuery,
  phoneMatchesSearch,
  PHONE_MAX_LENGTH,
};

/**
 * تنسيق الهاتف — اسم مستعار للتوافق مع الكود القائم
 */
export function formatPhone(phone: string): string {
  return normalizePhone(phone);
}

/** اسم مستعار — للتوافق */
export function formatIraqiPhone(phone: string): string {
  return normalizePhone(phone);
}

/**
 * التحقق من صلاحية رقم الهاتف
 */
export function isValidPhone(phone: string): boolean {
  return isValidPhoneShared(phone);
}

/** اسم مستعار — للتوافق */
export function isValidIraqiPhone(phone: string): boolean {
  return isValidPhoneShared(phone);
}

/**
 * بناء رابط WhatsApp — دالة واحدة موحدة
 */
export function getWhatsAppUrl(phone: string, message?: string): string {
  return buildWhatsAppUrlShared(phone, message);
}

/**
 * عدد الأرقام في النص
 */
export function getDigitCount(phone: string): number {
  return cleanDigits(phone).length;
}

// ─── Hook للتحقق التفاعلي ─────────────────────────────────────

export type PhoneValidationState = {
  valid: boolean;
  message: string;
  checking: boolean;
};

export function usePhoneValidation(
  phone: string,
  excludeId?: string,
  phoneType?: "personal" | "parent",
): PhoneValidationState {
  const [state, setState] = useState<PhoneValidationState>({
    valid: false,
    message: "",
    checking: false,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const validate = useCallback(
    async (value: string, exId?: string) => {
      if (abortRef.current) abortRef.current.abort();

      const digits = cleanDigits(value);
      if (!digits) {
        setState({ valid: false, message: "", checking: false });
        return;
      }
      if (digits.length < 7) {
        setState({ valid: false, message: "رقم الهاتف قصير جداً", checking: false });
        return;
      }

      // هاتف ولي الأمر لا يحتاج فحص تكرار
      if (phoneType === "parent") {
        setState({ valid: true, message: "رقم الهاتف صالح", checking: false });
        return;
      }

      setState((prev) => ({ ...prev, checking: true }));
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const params = new URLSearchParams({ phone: value });
        if (exId) params.set("excludeId", exId);
        const res = await fetch(`/api/phone/check?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (controller.signal.aborted) return;
        if (data.exists) {
          setState({ valid: false, message: "رقم الهاتف مستخدم بالفعل", checking: false });
        } else {
          setState({ valid: true, message: "رقم الهاتف متاح", checking: false });
        }
      } catch (e: any) {
        if (e.name !== "AbortError") {
          setState({ valid: false, message: "", checking: false });
        }
      }
    },
    [phoneType],
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const digits = cleanDigits(phone);
    if (!digits) {
      setState({ valid: false, message: "", checking: false });
      return;
    }
    if (digits.length < 7) {
      setState({ valid: false, message: "رقم الهاتف قصير جداً", checking: false });
      return;
    }
    setState((prev) => ({ ...prev, checking: true }));
    timerRef.current = setTimeout(() => validate(phone, excludeId), 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phone, excludeId, validate]);

  return state;
}

export function phoneInputClassName(state: PhoneValidationState, phone: string): string {
  const digits = cleanDigits(phone);
  if (!digits) return "";
  if (state.checking) return "";
  if (state.valid) return "border-green-500 focus:ring-green-500";
  return "border-red-500 focus:ring-red-500";
}
