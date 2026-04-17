// كشف المنصة + اعتراض fetch لتحويل API calls تلقائياً
// في التطبيق الأصلي: كل /api/* يتحول إلى https://sirajalquran.org/api/*
// في المتصفح: يبقى كما هو (نسبي)

import { Capacitor } from '@capacitor/core';

/** هل التطبيق يعمل كتطبيق أصلي (Android/iOS)؟ */
export const isNative = Capacitor.isNativePlatform();

/** إصدار APK الحالي — يُرسل مع كل طلب ويُحدَّث مع كل إصدار native */
export const APP_VERSION = '1.1.0';

/** عنوان API الأساسي */
export const API_BASE = isNative ? 'https://sirajalquran.org' : '';

/** عنوان WebSocket */
export const WS_BASE = isNative
  ? 'wss://sirajalquran.org'
  : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

/**
 * اعتراض عام لـ fetch — يحوّل كل URL نسبي (/api/*, /sw.js, etc.)
 * إلى عنوان مطلق يشير للسيرفر عندما يعمل كتطبيق أصلي،
 * ويضيف X-App-Version لكل طلب إلى /api/* (لفحص Force Update من السيرفر).
 */
const originalFetch = window.fetch.bind(window);

window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let finalInput: RequestInfo | URL = input;
  let finalInit: RequestInit | undefined = init;

  // تحويل URLs النسبية في التطبيق الأصلي
  if (isNative) {
    if (typeof finalInput === 'string') {
      if (finalInput.startsWith('/api/') || finalInput.startsWith('/api?')) {
        finalInput = API_BASE + finalInput;
      }
    } else if (finalInput instanceof Request) {
      const url = finalInput.url;
      if (url.includes('localhost/api/') || url.includes('localhost/api?')) {
        const path = new URL(url).pathname + new URL(url).search;
        finalInput = new Request(API_BASE + path, finalInput);
      }
    }
  }

  // إضافة X-App-Version لكل طلب API
  const urlStr = typeof finalInput === 'string'
    ? finalInput
    : finalInput instanceof Request ? finalInput.url : String(finalInput);
  const isApiCall = urlStr.includes('/api/');

  if (isApiCall) {
    const headers = new Headers(finalInit?.headers || (finalInput instanceof Request ? finalInput.headers : undefined));
    if (!headers.has('X-App-Version')) {
      headers.set('X-App-Version', APP_VERSION);
    }
    if (finalInput instanceof Request) {
      finalInput = new Request(finalInput, { headers });
    } else {
      finalInit = { ...(finalInit || {}), headers };
    }
  }

  return originalFetch(finalInput, finalInit);
};

if (isNative) {
  console.log('[SirajApp] Native mode — API calls redirect to', API_BASE, '— version', APP_VERSION);
}
