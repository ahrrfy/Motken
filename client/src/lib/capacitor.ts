// كشف المنصة + اعتراض fetch لتحويل API calls تلقائياً
// في التطبيق الأصلي: كل /api/* يتحول إلى https://sirajalquran.org/api/*
// في المتصفح: يبقى كما هو (نسبي)

import { Capacitor } from '@capacitor/core';

/** هل التطبيق يعمل كتطبيق أصلي (Android/iOS)؟ */
export const isNative = Capacitor.isNativePlatform();

/** عنوان API الأساسي */
export const API_BASE = isNative ? 'https://sirajalquran.org' : '';

/** عنوان WebSocket */
export const WS_BASE = isNative
  ? 'wss://sirajalquran.org'
  : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

/**
 * اعتراض عام لـ fetch — يحوّل كل URL نسبي (/api/*, /sw.js, etc.)
 * إلى عنوان مطلق يشير للسيرفر عندما يعمل كتطبيق أصلي.
 * هذا يغطي كل fetch في المشروع بدون تعديل أي ملف آخر.
 */
if (isNative) {
  const originalFetch = window.fetch.bind(window);

  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    if (typeof input === 'string') {
      // تحويل URLs النسبية التي تبدأ بـ /api/ إلى مطلقة
      if (input.startsWith('/api/') || input.startsWith('/api?')) {
        input = API_BASE + input;
      }
    } else if (input instanceof Request) {
      const url = input.url;
      // فحص إذا كان URL نسبي تم تحويله من المتصفح إلى localhost
      if (url.includes('localhost/api/') || url.includes('localhost/api?')) {
        const path = new URL(url).pathname + new URL(url).search;
        input = new Request(API_BASE + path, input);
      }
    }
    return originalFetch(input, init);
  };

  console.log('[SirajApp] Native mode — API calls redirect to', API_BASE);
}
