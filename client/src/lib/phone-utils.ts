import { useState, useEffect, useRef, useCallback } from "react";

export function formatPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\.]/g, '');
  if (cleaned.startsWith('07') && cleaned.length >= 11) {
    cleaned = '+964' + cleaned.substring(1);
  }
  if (/^\d{10,}$/.test(cleaned) && !cleaned.startsWith('+')) {
    if (cleaned.startsWith('964')) cleaned = '+' + cleaned;
    else if (cleaned.startsWith('966')) cleaned = '+' + cleaned;
    else if (cleaned.startsWith('971')) cleaned = '+' + cleaned;
  }
  if (!cleaned.startsWith('+') && /^\+/.test(phone)) {
    cleaned = phone.replace(/[\s\-\.]/g, '');
  }
  return cleaned;
}

export function formatIraqiPhone(phone: string): string {
  return formatPhone(phone);
}

export function isValidPhone(phone: string): boolean {
  const cleaned = formatPhone(phone);
  return /^\+\d{7,15}$/.test(cleaned);
}

export function isValidIraqiPhone(phone: string): boolean {
  const cleaned = formatPhone(phone);
  if (/^\+9647\d{8,9}$/.test(cleaned)) return true;
  return isValidPhone(cleaned);
}

export function getWhatsAppUrl(phone: string, message?: string): string {
  let cleaned = formatPhone(phone).replace(/[^\d]/g, '');
  if (!cleaned) cleaned = phone.replace(/[^\d]/g, '');
  const url = `https://wa.me/${cleaned}`;
  return message ? `${url}?text=${encodeURIComponent(message)}` : url;
}

export function getDigitCount(phone: string): number {
  return phone.replace(/[^\d]/g, "").length;
}

export type PhoneValidationState = {
  valid: boolean;
  message: string;
  checking: boolean;
};

export function usePhoneValidation(phone: string, excludeId?: string): PhoneValidationState {
  const [state, setState] = useState<PhoneValidationState>({ valid: false, message: "", checking: false });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const validate = useCallback(async (value: string, exId?: string) => {
    if (abortRef.current) abortRef.current.abort();

    const digits = value.replace(/[^\d]/g, "");
    if (!digits) {
      setState({ valid: false, message: "", checking: false });
      return;
    }
    if (digits.length < 7) {
      setState({ valid: false, message: "رقم الهاتف قصير جداً", checking: false });
      return;
    }

    setState(prev => ({ ...prev, checking: true }));
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const params = new URLSearchParams({ phone: value });
      if (exId) params.set("excludeId", exId);
      const res = await fetch(`/api/phone/check?${params.toString()}`, { signal: controller.signal });
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
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const digits = phone.replace(/[^\d]/g, "");
    if (!digits) {
      setState({ valid: false, message: "", checking: false });
      return;
    }
    if (digits.length < 7) {
      setState({ valid: false, message: "رقم الهاتف قصير جداً", checking: false });
      return;
    }
    setState(prev => ({ ...prev, checking: true }));
    timerRef.current = setTimeout(() => validate(phone, excludeId), 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phone, excludeId, validate]);

  return state;
}

export function phoneInputClassName(state: PhoneValidationState, phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (state.checking) return "";
  if (state.valid) return "border-green-500 focus:ring-green-500";
  return "border-red-500 focus:ring-red-500";
}
