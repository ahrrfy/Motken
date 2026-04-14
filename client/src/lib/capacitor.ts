// كشف المنصة وإعداد عناوين API و WebSocket
// في التطبيق الأصلي: API يتصل بالسيرفر مباشرة
// في المتصفح: يستخدم العناوين النسبية (نفس الأصل)

import { Capacitor } from '@capacitor/core';

/** هل التطبيق يعمل كتطبيق أصلي (Android/iOS)؟ */
export const isNative = Capacitor.isNativePlatform();

/** عنوان API الأساسي — مطلق في التطبيق، نسبي في المتصفح */
export const API_BASE = isNative ? 'https://sirajalquran.org' : '';

/** عنوان WebSocket — مطلق في التطبيق، نسبي في المتصفح */
export const WS_BASE = isNative
  ? 'wss://sirajalquran.org'
  : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
