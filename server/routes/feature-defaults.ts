export const allFeatureDefaults = [
  { featureKey: "attendance", featureName: "نظام الحضور والغياب", description: "تسجيل حضور وغياب الطلاب يومياً مع إمكانية تحديد الحالة (حاضر، غائب، متأخر، معذور) وإضافة ملاحظات وعرض سجل الحضور التاريخي", category: "management", isEnabled: true },
  { featureKey: "messaging", featureName: "المحادثات الداخلية", description: "نظام مراسلة فوري داخلي يتيح للمعلمين والمشرفين والطلاب التواصل المباشر مع بعضهم البعض داخل المنصة", category: "communication", isEnabled: true },
  { featureKey: "points_rewards", featureName: "النقاط والمكافآت", description: "نظام تحفيزي لمنح النقاط والشارات للطلاب على إنجازاتهم في الحفظ والسلوك والحضور مع لوحة شرف تعرض ترتيب المتميزين", category: "gamification", isEnabled: true },

  { featureKey: "mosque_map", featureName: "خريطة الجوامع", description: "عرض خريطة تفاعلية توضح مواقع الجوامع والمراكز القرآنية المسجلة في النظام", category: "visualization", isEnabled: false },
  { featureKey: "backup_export", featureName: "النسخ الاحتياطي والتصدير", description: "إمكانية تصدير بيانات النظام وإنشاء نسخ احتياطية لحماية البيانات من الفقدان", category: "data", isEnabled: true },
  { featureKey: "smart_alerts", featureName: "التنبيهات الذكية", description: "تنبيهات تلقائية تُرسل عند غياب الطالب المتكرر أو تراجع مستواه أو اقتراب مواعيد الامتحانات والمسابقات", category: "automation", isEnabled: true },
  { featureKey: "advanced_reports", featureName: "التقارير المتقدمة", description: "تقارير تفصيلية وإحصائيات شاملة عن أداء الطلاب ونشاط المعلمين ومستوى التقدم في الحفظ", category: "analytics", isEnabled: true },
  { featureKey: "courses", featureName: "الدورات والشهادات", description: "إدارة الدورات التعليمية وإصدار شهادات الإتمام والتخرج للطلاب", category: "education", isEnabled: true },
  { featureKey: "library", featureName: "المكتبة الإسلامية", description: "مكتبة رقمية تحتوي على كتب ومراجع إسلامية متنوعة لدعم العملية التعليمية", category: "education", isEnabled: true },
  { featureKey: "graduation", featureName: "التخرج والمتابعة", description: "نظام متابعة الخريجين وتسجيل إنجازاتهم بعد إتمام الحفظ", category: "management", isEnabled: true },
  { featureKey: "family_system", featureName: "نظام الأسرة", description: "ربط حسابات أفراد الأسرة الواحدة لتسهيل المتابعة والتواصل", category: "communication", isEnabled: true },
  { featureKey: "whiteboard", featureName: "السبورة التفاعلية", description: "سبورة تفاعلية رقمية لاستخدامها في التدريس والشرح أثناء الحلقات", category: "education", isEnabled: true },
  { featureKey: "crisis_management", featureName: "إدارة الأزمات", description: "نظام لإدارة الأزمات والطوارئ والبدائل في حالات الغياب والظروف الطارئة", category: "management", isEnabled: true },
  { featureKey: "institutional", featureName: "التكامل المؤسسي", description: "نظام التكامل مع المؤسسات والجهات الخارجية ونقل البيانات بينها", category: "management", isEnabled: true },
  { featureKey: "floor_plan", featureName: "المخطط البصري", description: "عرض مخطط بصري لتوزيع القاعات والحلقات داخل الجامع أو المركز", category: "visualization", isEnabled: true },
  { featureKey: "id_cards", featureName: "الهويات ومسح QR", description: "إنشاء بطاقات هوية للطلاب والمعلمين مع رموز QR للتحقق السريع", category: "management", isEnabled: true },
];

export const featureRouteMap: Record<string, string[]> = {
  attendance: ["/api/attendance"],
  messaging: ["/api/messages"],
  points_rewards: ["/api/points", "/api/leaderboard"],
  smart_alerts: ["/api/smart-alerts"],
  advanced_reports: ["/api/advanced-reports"],
  courses: ["/api/courses", "/api/certificates"],
  library: ["/api/library"],
  graduation: ["/api/graduates"],
  family_system: ["/api/family"],
  crisis_management: ["/api/emergency", "/api/incidents"],
  institutional: ["/api/transfers"],
  id_cards: ["/api/id-cards"],
};
