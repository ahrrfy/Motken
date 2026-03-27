import type { Express } from "express";
import { requireAuth, requireRole } from "../auth";
import { storage } from "../storage";
import { db } from "../db";
import { count } from "drizzle-orm";
import { tajweedRules, similarVerses } from "@shared/schema";
import { sendError } from "../error-handler";

export function registerKnowledgeRoutes(app: Express) {
  app.post("/api/knowledge-base/seed", requireRole("admin"), async (_req, res) => {
    try {
      const [tajweedCount] = await db.select({ c: count() }).from(tajweedRules);
      const [versesCount] = await db.select({ c: count() }).from(similarVerses);

      let tajweedAdded = 0;
      let versesAdded = 0;

      if ((tajweedCount?.c || 0) === 0) {
        const tajweedData = [
          { category: "النون الساكنة والتنوين", title: "الإظهار الحلقي", description: "إخراج النون الساكنة أو التنوين عند أحد حروف الحلق الستة (ء، هـ، ع، ح، غ، خ) من غير غنة.", examples: "مَنْ آمَنَ، يَنْأَوْنَ، مِنْ هَادٍ، أَنْعَمْتَ", surahReference: "الفاتحة 7، الأنعام 26", sortOrder: 1 },
          { category: "النون الساكنة والتنوين", title: "الإدغام بغنة", description: "إدغام النون الساكنة أو التنوين في أحد حروف (ي، ن، م، و) مع بقاء الغنة بمقدار حركتين.", examples: "مَنْ يَقُولُ، مِنْ نِعْمَةٍ، مِنْ مَاءٍ، مِنْ وَلِيٍّ", surahReference: "البقرة 8، النحل 53", sortOrder: 2 },
          { category: "النون الساكنة والتنوين", title: "الإدغام بغير غنة", description: "إدغام النون الساكنة أو التنوين في حرفي (ل، ر) من غير غنة.", examples: "مِنْ لَدُنْهُ، مِنْ رَبِّهِمْ", surahReference: "الكهف 2، البقرة 5", sortOrder: 3 },
          { category: "النون الساكنة والتنوين", title: "الإقلاب", description: "قلب النون الساكنة أو التنوين ميماً عند ملاقاة حرف الباء مع إخفاء الميم وإظهار الغنة.", examples: "أَنْبِئْهُمْ، سَمِيعٌ بَصِيرٌ", surahReference: "البقرة 33، البقرة 137", sortOrder: 4 },
          { category: "النون الساكنة والتنوين", title: "الإخفاء الحقيقي", description: "النطق بالنون الساكنة أو التنوين بصفة بين الإظهار والإدغام مع بقاء الغنة عند باقي الحروف (15 حرفاً).", examples: "أَنْتَ، مُنْذِرٌ، مَنْ جَاءَ، عِنْدَ", surahReference: "الفاتحة 5، البقرة 6", sortOrder: 5 },
          { category: "الميم الساكنة", title: "الإخفاء الشفوي", description: "إخفاء الميم الساكنة عند ملاقاة حرف الباء مع إظهار الغنة.", examples: "تَرْمِيهِمْ بِحِجَارَةٍ، يَعْتَصِمْ بِاللَّهِ", surahReference: "الفيل 4، آل عمران 101", sortOrder: 6 },
          { category: "الميم الساكنة", title: "إدغام الميم بمثلها", description: "إدغام الميم الساكنة في ميم مثلها مع إظهار الغنة بمقدار حركتين.", examples: "لَهُمْ مَا يَشَاءُونَ، كَمْ مِنْ فِئَةٍ", surahReference: "النحل 31، البقرة 249", sortOrder: 7 },
          { category: "الميم الساكنة", title: "الإظهار الشفوي", description: "إظهار الميم الساكنة عند باقي حروف الهجاء من غير غنة.", examples: "أَمْ لَهُمْ، عَلَيْهِمْ وَلَا", surahReference: "الطور 35، الفاتحة 7", sortOrder: 8 },
          { category: "المدود", title: "المد الطبيعي (الأصلي)", description: "مد الحرف بمقدار حركتين إذا جاء بعد حرف المد حرف متحرك. حروف المد: ألف ساكنة بعد فتح، واو ساكنة بعد ضم، ياء ساكنة بعد كسر.", examples: "قَالَ، يَقُولُ، قِيلَ", surahReference: "البقرة 30، يس 20", sortOrder: 9 },
          { category: "المدود", title: "المد المتصل", description: "مد واجب يكون عندما يأتي حرف المد وبعده همزة في نفس الكلمة. يمد بمقدار 4 أو 5 حركات.", examples: "جَاءَ، سُوءَ، جِيءَ", surahReference: "النصر 1، يوسف 54", sortOrder: 10 },
          { category: "المدود", title: "المد المنفصل", description: "مد جائز يكون عندما يأتي حرف المد في آخر كلمة وتأتي الهمزة في أول الكلمة التالية. يمد 4 أو 5 حركات.", examples: "فِي أَنْفُسِهِمْ، قَالُوا آمَنَّا", surahReference: "البقرة 14، البقرة 8", sortOrder: 11 },
          { category: "المدود", title: "المد العارض للسكون", description: "مد يحدث عندما يأتي حرف المد وبعده حرف متحرك وقع عليه السكون بسبب الوقف. يمد 2 أو 4 أو 6 حركات.", examples: "الْعَالَمِينَ، نَسْتَعِينُ، الرَّحِيمِ", surahReference: "الفاتحة 2، الفاتحة 5", sortOrder: 12 },
          { category: "المدود", title: "المد اللازم", description: "مد واجب يكون عندما يأتي بعد حرف المد حرف ساكن سكوناً أصلياً في نفس الكلمة. يمد بمقدار 6 حركات.", examples: "الْحَاقَّةُ، الضَّالِّينَ، الصَّاخَّةُ", surahReference: "الحاقة 1، الفاتحة 7", sortOrder: 13 },
          { category: "أحكام التفخيم والترقيق", title: "تفخيم الراء", description: "تُفخم الراء إذا كانت مفتوحة أو مضمومة، أو ساكنة بعد فتح أو ضم، أو ساكنة بعد كسر عارض.", examples: "رَبِّ، رُسُلُ، أَرْسَلْنَا، ارْجِعُوا", surahReference: "الفاتحة 2، البقرة 87", sortOrder: 14 },
          { category: "أحكام التفخيم والترقيق", title: "ترقيق الراء", description: "تُرقق الراء إذا كانت مكسورة، أو ساكنة بعد كسر أصلي وليس بعدها حرف استعلاء.", examples: "رِجَالٌ، فِرْعَوْنَ، بِالصَّبْرِ", surahReference: "النور 37، البقرة 49", sortOrder: 15 },
          { category: "أحكام التفخيم والترقيق", title: "حروف الاستعلاء (التفخيم)", description: "الحروف المفخمة دائماً وهي سبعة مجموعة في (خُصَّ ضَغْطٍ قِظْ): خ، ص، ض، غ، ط، ق، ظ.", examples: "خَلَقَ، صِرَاطَ، ضَرَبَ، غَفُورٌ، طَيِّبَاتِ، قَالَ، ظَلَمُوا", surahReference: "العلق 1-2، الفاتحة 6-7", sortOrder: 16 },
          { category: "أحكام أخرى", title: "القلقلة", description: "اضطراب المخرج عند النطق بالحرف الساكن ثم يعود لحاله. حروفها خمسة مجموعة في (قُطْبُ جَدٍّ): ق، ط، ب، ج، د.", examples: "يَقْطَعُونَ، اقْرَأْ، يَجْعَلُونَ", surahReference: "البقرة 27، العلق 1", sortOrder: 17 },
          { category: "أحكام أخرى", title: "لام لفظ الجلالة", description: "تُفخم لام لفظ الجلالة (الله) إذا سبقها فتح أو ضم، وتُرقق إذا سبقها كسر.", examples: "قَالَ اللَّهُ (تفخيم)، بِسْمِ اللَّهِ (ترقيق)، عَبْدُ اللَّهِ (تفخيم)", surahReference: "البقرة 80، الفاتحة 1", sortOrder: 18 },
          { category: "أحكام أخرى", title: "السكتات في القرآن", description: "سكت لطيف من غير تنفس عند حفص في أربعة مواضع: عِوَجًا قَيِّمًا (الكهف)، مَرْقَدِنَا هَذَا (يس)، مَنْ رَاقٍ (القيامة)، بَلْ رَانَ (المطففين).", examples: "عِوَجًا ۜ قَيِّمًا، مَرْقَدِنَا ۜ هَذَا", surahReference: "الكهف 1-2، يس 52", sortOrder: 19 },
        ];

        for (const rule of tajweedData) {
          await storage.createTajweedRule(rule);
          tajweedAdded++;
        }
      }

      if ((versesCount?.c || 0) === 0) {
        const versesData = [
          { verse1Surah: "البقرة", verse1Number: 10, verse1Text: "فِي قُلُوبِهِم مَّرَضٌ فَزَادَهُمُ اللَّهُ مَرَضًا", verse2Surah: "محمد", verse2Number: 17, verse2Text: "وَالَّذِينَ اهْتَدَوْا زَادَهُمْ هُدًى", explanation: "التشابه في صيغة 'زادهم' - الأولى في سياق العقوبة والثانية في سياق الهداية", difficulty: "easy" },
          { verse1Surah: "البقرة", verse1Number: 58, verse1Text: "ادْخُلُوا هَذِهِ الْقَرْيَةَ فَكُلُوا مِنْهَا حَيْثُ شِئْتُمْ رَغَدًا وَادْخُلُوا الْبَابَ سُجَّدًا وَقُولُوا حِطَّةٌ", verse2Surah: "الأعراف", verse2Number: 161, verse2Text: "اسْكُنُوا هَذِهِ الْقَرْيَةَ وَكُلُوا مِنْهَا حَيْثُ شِئْتُمْ وَقُولُوا حِطَّةٌ وَادْخُلُوا الْبَابَ سُجَّدًا", explanation: "نفس القصة وردت في السورتين مع اختلاف ترتيب الأوامر (ادخلوا/اسكنوا) و(فكلوا/وكلوا) وتقديم وتأخير (ادخلوا الباب/وقولوا حطة)", difficulty: "hard" },
          { verse1Surah: "البقرة", verse1Number: 35, verse1Text: "وَلَا تَقْرَبَا هَذِهِ الشَّجَرَةَ فَتَكُونَا مِنَ الظَّالِمِينَ", verse2Surah: "الأعراف", verse2Number: 19, verse2Text: "وَلَا تَقْرَبَا هَذِهِ الشَّجَرَةَ فَتَكُونَا مِنَ الظَّالِمِينَ", explanation: "آيتان متطابقتان تماماً - قصة آدم عليه السلام في البقرة والأعراف", difficulty: "easy" },
          { verse1Surah: "آل عمران", verse1Number: 133, verse1Text: "وَسَارِعُوا إِلَى مَغْفِرَةٍ مِّن رَّبِّكُمْ وَجَنَّةٍ عَرْضُهَا السَّمَاوَاتُ وَالْأَرْضُ", verse2Surah: "الحديد", verse2Number: 21, verse2Text: "سَابِقُوا إِلَى مَغْفِرَةٍ مِّن رَّبِّكُمْ وَجَنَّةٍ عَرْضُهَا كَعَرْضِ السَّمَاءِ وَالْأَرْضِ", explanation: "تشابه في الدعوة للمغفرة مع اختلاف (سارعوا/سابقوا) و(عرضها السماوات/كعرض السماء)", difficulty: "medium" },
          { verse1Surah: "البقرة", verse1Number: 136, verse1Text: "قُولُوا آمَنَّا بِاللَّهِ وَمَا أُنزِلَ إِلَيْنَا وَمَا أُنزِلَ إِلَى إِبْرَاهِيمَ", verse2Surah: "آل عمران", verse2Number: 84, verse2Text: "قُلْ آمَنَّا بِاللَّهِ وَمَا أُنزِلَ عَلَيْنَا وَمَا أُنزِلَ عَلَى إِبْرَاهِيمَ", explanation: "تشابه كبير مع اختلاف (قولوا/قل) و(إلينا/علينا) و(إلى إبراهيم/على إبراهيم)", difficulty: "hard" },
          { verse1Surah: "البقرة", verse1Number: 238, verse1Text: "حَافِظُوا عَلَى الصَّلَوَاتِ وَالصَّلَاةِ الْوُسْطَى وَقُومُوا لِلَّهِ قَانِتِينَ", verse2Surah: "المؤمنون", verse2Number: 9, verse2Text: "وَالَّذِينَ هُمْ عَلَى صَلَوَاتِهِمْ يُحَافِظُونَ", explanation: "التشابه في مادة 'حافظ' على الصلاة - الأولى أمر بالمحافظة والثانية وصف للمؤمنين", difficulty: "easy" },
          { verse1Surah: "الأنعام", verse1Number: 99, verse1Text: "انظُرُوا إِلَى ثَمَرِهِ إِذَا أَثْمَرَ وَيَنْعِهِ", verse2Surah: "الأعراف", verse2Number: 54, verse2Text: "انظُرُوا إِلَى ثَمَرِهِ إِذَا أَثْمَرَ", explanation: "حذف 'وَيَنْعِهِ' في الأعراف - دقة التشابه في السياقات المتقاربة", difficulty: "medium" },
          { verse1Surah: "هود", verse1Number: 61, verse1Text: "هُوَ أَنشَأَكُم مِّنَ الْأَرْضِ وَاسْتَعْمَرَكُمْ فِيهَا", verse2Surah: "نوح", verse2Number: 17, verse2Text: "وَاللَّهُ أَنبَتَكُم مِّنَ الْأَرْضِ نَبَاتًا", explanation: "تشابه في مادة النشأة من الأرض مع اختلاف التعبير (أنشأكم/أنبتكم)", difficulty: "medium" },
          { verse1Surah: "الكهف", verse1Number: 7, verse1Text: "إِنَّا جَعَلْنَا مَا عَلَى الْأَرْضِ زِينَةً لَّهَا", verse2Surah: "الملك", verse2Number: 5, verse2Text: "وَلَقَدْ زَيَّنَّا السَّمَاءَ الدُّنْيَا بِمَصَابِيحَ", explanation: "التشابه في مفهوم التزيين - الأولى زينة الأرض والثانية زينة السماء", difficulty: "easy" },
          { verse1Surah: "البقرة", verse1Number: 164, verse1Text: "إِنَّ فِي خَلْقِ السَّمَاوَاتِ وَالْأَرْضِ وَاخْتِلَافِ اللَّيْلِ وَالنَّهَارِ", verse2Surah: "آل عمران", verse2Number: 190, verse2Text: "إِنَّ فِي خَلْقِ السَّمَاوَاتِ وَالْأَرْضِ وَاخْتِلَافِ اللَّيْلِ وَالنَّهَارِ لَآيَاتٍ لِّأُولِي الْأَلْبَابِ", explanation: "البداية متطابقة تماماً لكن آل عمران أضافت 'لآيات لأولي الألباب' وأكملت بسياق مختلف عن البقرة", difficulty: "hard" },
          { verse1Surah: "الفرقان", verse1Number: 68, verse1Text: "وَلَا يَقْتُلُونَ النَّفْسَ الَّتِي حَرَّمَ اللَّهُ إِلَّا بِالْحَقِّ", verse2Surah: "الأنعام", verse2Number: 151, verse2Text: "وَلَا تَقْتُلُوا النَّفْسَ الَّتِي حَرَّمَ اللَّهُ إِلَّا بِالْحَقِّ", explanation: "نفس المعنى مع اختلاف الصيغة (لا يقتلون - وصف / لا تقتلوا - نهي)", difficulty: "medium" },
          { verse1Surah: "البقرة", verse1Number: 255, verse1Text: "لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ", verse2Surah: "ق", verse2Number: 38, verse2Text: "وَمَا مَسَّنَا مِن لُّغُوبٍ", explanation: "كلتا الآيتين تنفيان عن الله التعب - الأولى في سياق آية الكرسي والثانية بعد ذكر خلق السماوات والأرض", difficulty: "medium" },
        ];

        for (const verse of versesData) {
          await storage.createSimilarVerse(verse);
          versesAdded++;
        }
      }

      res.json({
        message: `تم إضافة ${tajweedAdded} قاعدة تجويد و ${versesAdded} آية متشابهة`,
        tajweedAdded,
        versesAdded,
      });
    } catch (err: any) {
      sendError(res, err, "إضافة البيانات الأولية للمعرفة");
    }
  });

  // ==================== TAJWEED RULES ====================
  app.get("/api/tajweed-rules", requireAuth, async (req, res) => {
    try {
      const category = req.query.category as string;
      if (category) {
        const rules = await storage.getTajweedRulesByCategory(category);
        return res.json(rules);
      }
      const rules = await storage.getAllTajweedRules();
      res.json(rules);
    } catch (err: any) {
      sendError(res, err, "جلب قواعد التجويد");
    }
  });

  app.post("/api/tajweed-rules", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const { category, title, description, examples, surahReference, sortOrder } = req.body;
      if (!category || !title || !description) {
        return res.status(400).json({ message: "البيانات المطلوبة غير مكتملة" });
      }
      const rule = await storage.createTajweedRule({
        category, title, description, examples, surahReference, sortOrder: sortOrder || 0,
      });
      res.status(201).json(rule);
    } catch (err: any) {
      sendError(res, err, "إنشاء قاعدة تجويد");
    }
  });

  app.patch("/api/tajweed-rules/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const tajweedAllowed = ["category", "title", "description", "examples", "surahReference", "sortOrder"];
      const safeTajweedData: any = {};
      for (const key of tajweedAllowed) {
        if (req.body[key] !== undefined) safeTajweedData[key] = req.body[key];
      }
      const updated = await storage.updateTajweedRule(req.params.id, safeTajweedData);
      if (!updated) return res.status(404).json({ message: "السجل غير موجود" });
      res.json(updated);
    } catch (err: any) {
      sendError(res, err, "تحديث قاعدة التجويد");
    }
  });

  app.delete("/api/tajweed-rules/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      await storage.deleteTajweedRule(req.params.id);
      res.json({ message: "تم الحذف بنجاح" });
    } catch (err: any) {
      sendError(res, err, "حذف قاعدة التجويد");
    }
  });


  // ==================== SIMILAR VERSES ====================
  app.get("/api/similar-verses", requireAuth, async (req, res) => {
    try {
      const verses = await storage.getAllSimilarVerses();
      res.json(verses);
    } catch (err: any) {
      sendError(res, err, "جلب الآيات المتشابهة");
    }
  });

  app.post("/api/similar-verses", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const { verse1Surah, verse1Number, verse1Text, verse2Surah, verse2Number, verse2Text, explanation, difficulty } = req.body;
      if (!verse1Surah || !verse1Text || !verse2Surah || !verse2Text) {
        return res.status(400).json({ message: "البيانات المطلوبة غير مكتملة" });
      }
      const verse = await storage.createSimilarVerse({
        verse1Surah, verse1Number, verse1Text, verse2Surah, verse2Number, verse2Text,
        explanation, difficulty: difficulty || "medium",
      });
      res.status(201).json(verse);
    } catch (err: any) {
      sendError(res, err, "إنشاء آية متشابهة");
    }
  });

  app.delete("/api/similar-verses/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      await storage.deleteSimilarVerse(req.params.id);
      res.json({ message: "تم الحذف بنجاح" });
    } catch (err: any) {
      sendError(res, err, "حذف آية متشابهة");
    }
  });

}
