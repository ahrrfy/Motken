import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Book, Search, ExternalLink, Filter } from "lucide-react";

interface BookItem {
  id: number;
  title: string;
  author: string;
  category: string;
  description: string;
  pages: number;
  url: string;
  featured: boolean;
}

const categories = [
  "الكل",
  "القرآن الكريم وعلومه",
  "الحديث النبوي",
  "الفقه الإسلامي",
  "العقيدة",
  "السيرة والتاريخ",
  "اللغة العربية",
  "الأخلاق والتزكية",
];

const books: BookItem[] = [
  { id: 1, title: "تفسير ابن كثير", author: "ابن كثير", category: "القرآن الكريم وعلومه", description: "من أشهر كتب التفسير بالمأثور، يعتمد على القرآن والسنة وأقوال الصحابة والتابعين", pages: 2400, url: "https://quran.ksu.edu.sa", featured: true },
  { id: 2, title: "تفسير الطبري", author: "ابن جرير الطبري", category: "القرآن الكريم وعلومه", description: "جامع البيان عن تأويل آي القرآن، أعظم تفاسير القرآن وأوسعها", pages: 7200, url: "https://quran.ksu.edu.sa", featured: true },
  { id: 3, title: "تفسير السعدي", author: "عبد الرحمن السعدي", category: "القرآن الكريم وعلومه", description: "تيسير الكريم الرحمن في تفسير كلام المنان، تفسير ميسر وواضح", pages: 1000, url: "https://quran.ksu.edu.sa", featured: true },
  { id: 4, title: "تفسير الجلالين", author: "جلال الدين المحلي وجلال الدين السيوطي", category: "القرآن الكريم وعلومه", description: "تفسير موجز ومختصر يغطي القرآن كاملاً", pages: 600, url: "https://quran.ksu.edu.sa", featured: false },
  { id: 5, title: "أحكام القرآن للجصاص", author: "أبو بكر الجصاص", category: "القرآن الكريم وعلومه", description: "كتاب يستنبط الأحكام الفقهية من آيات القرآن الكريم", pages: 2100, url: "https://shamela.ws", featured: false },
  { id: 6, title: "الإتقان في علوم القرآن", author: "جلال الدين السيوطي", category: "القرآن الكريم وعلومه", description: "موسوعة شاملة في علوم القرآن من أسباب النزول والناسخ والمنسوخ وغيرها", pages: 1200, url: "https://shamela.ws", featured: true },
  { id: 7, title: "البرهان في علوم القرآن", author: "بدر الدين الزركشي", category: "القرآن الكريم وعلومه", description: "من أهم المصنفات في علوم القرآن، يتناول أنواع علوم القرآن المختلفة", pages: 1400, url: "https://shamela.ws", featured: false },

  { id: 8, title: "صحيح البخاري", author: "الإمام البخاري", category: "الحديث النبوي", description: "أصح كتاب بعد كتاب الله، جمع فيه الأحاديث الصحيحة المسندة", pages: 2600, url: "https://www.islamweb.net", featured: true },
  { id: 9, title: "صحيح مسلم", author: "الإمام مسلم", category: "الحديث النبوي", description: "ثاني أصح كتب الحديث، يتميز بحسن الترتيب وجمع الطرق", pages: 2000, url: "https://www.islamweb.net", featured: true },
  { id: 10, title: "سنن أبي داود", author: "أبو داود السجستاني", category: "الحديث النبوي", description: "من الكتب الستة، يركز على أحاديث الأحكام الفقهية", pages: 1800, url: "https://www.islamweb.net", featured: false },
  { id: 11, title: "سنن الترمذي", author: "الإمام الترمذي", category: "الحديث النبوي", description: "الجامع الكبير، يتميز ببيان درجة الحديث وذكر مذاهب الفقهاء", pages: 1700, url: "https://www.islamweb.net", featured: false },
  { id: 12, title: "سنن النسائي", author: "الإمام النسائي", category: "الحديث النبوي", description: "المجتبى من السنن، من أقل الكتب الستة حديثاً ضعيفاً", pages: 1600, url: "https://www.islamweb.net", featured: false },
  { id: 13, title: "سنن ابن ماجه", author: "ابن ماجه القزويني", category: "الحديث النبوي", description: "سادس الكتب الستة، يتميز بأبواب لم يذكرها غيره", pages: 1400, url: "https://www.islamweb.net", featured: false },
  { id: 14, title: "موطأ مالك", author: "الإمام مالك بن أنس", category: "الحديث النبوي", description: "أول كتاب صُنِّف في الحديث والفقه، يجمع بين الحديث وفقه أهل المدينة", pages: 800, url: "https://www.islamweb.net", featured: true },
  { id: 15, title: "مسند أحمد", author: "الإمام أحمد بن حنبل", category: "الحديث النبوي", description: "أكبر دواوين السنة، يحتوي على أكثر من 27 ألف حديث", pages: 5000, url: "https://www.islamweb.net", featured: true },
  { id: 16, title: "رياض الصالحين", author: "الإمام النووي", category: "الحديث النبوي", description: "كتاب جامع في الآداب والأخلاق والرقائق، من أكثر الكتب انتشاراً", pages: 600, url: "https://www.islamweb.net", featured: true },
  { id: 17, title: "الأربعون النووية", author: "الإمام النووي", category: "الحديث النبوي", description: "اثنان وأربعون حديثاً جامعة لأصول الدين وقواعد الإسلام", pages: 80, url: "https://www.islamweb.net", featured: true },
  { id: 18, title: "بلوغ المرام", author: "ابن حجر العسقلاني", category: "الحديث النبوي", description: "أحاديث الأحكام مع بيان من أخرجها ودرجتها", pages: 500, url: "https://www.islamweb.net", featured: false },

  { id: 19, title: "المغني لابن قدامة", author: "ابن قدامة المقدسي", category: "الفقه الإسلامي", description: "موسوعة فقهية مقارنة تعرض أقوال المذاهب الأربعة مع الأدلة", pages: 4500, url: "https://shamela.ws", featured: true },
  { id: 20, title: "بداية المجتهد ونهاية المقتصد", author: "ابن رشد الحفيد", category: "الفقه الإسلامي", description: "كتاب فقه مقارن يذكر أسباب الاختلاف بين الفقهاء", pages: 1200, url: "https://shamela.ws", featured: true },
  { id: 21, title: "فقه السنة", author: "سيد سابق", category: "الفقه الإسلامي", description: "كتاب فقهي معاصر ميسر يعتمد على الدليل من الكتاب والسنة", pages: 1000, url: "https://al-maktaba.org", featured: true },
  { id: 22, title: "الفقه الإسلامي وأدلته", author: "وهبة الزحيلي", category: "الفقه الإسلامي", description: "موسوعة فقهية معاصرة شاملة للمذاهب الأربعة مع الأدلة", pages: 5800, url: "https://shamela.ws", featured: true },
  { id: 23, title: "زاد المستقنع", author: "الحجاوي", category: "الفقه الإسلامي", description: "متن فقهي مختصر على المذهب الحنبلي، من أشهر المتون الفقهية", pages: 200, url: "https://shamela.ws", featured: false },
  { id: 24, title: "الروض المربع", author: "منصور البهوتي", category: "الفقه الإسلامي", description: "شرح زاد المستقنع في اختصار المقنع على المذهب الحنبلي", pages: 800, url: "https://shamela.ws", featured: false },
  { id: 25, title: "منار السبيل", author: "ابن ضويان", category: "الفقه الإسلامي", description: "شرح كتاب الدليل في الفقه الحنبلي مع ذكر الأدلة", pages: 700, url: "https://shamela.ws", featured: false },

  { id: 26, title: "كتاب التوحيد", author: "محمد بن عبد الوهاب", category: "العقيدة", description: "كتاب في التوحيد وبيان أنواعه ونواقضه بالأدلة من الكتاب والسنة", pages: 150, url: "https://shamela.ws", featured: true },
  { id: 27, title: "العقيدة الطحاوية", author: "أبو جعفر الطحاوي", category: "العقيدة", description: "متن مختصر في عقيدة أهل السنة والجماعة على مذهب أبي حنيفة وصاحبيه", pages: 50, url: "https://shamela.ws", featured: true },
  { id: 28, title: "العقيدة الواسطية", author: "ابن تيمية", category: "العقيدة", description: "رسالة في عقيدة أهل السنة في باب الأسماء والصفات", pages: 80, url: "https://shamela.ws", featured: true },
  { id: 29, title: "شرح العقيدة الطحاوية", author: "ابن أبي العز الحنفي", category: "العقيدة", description: "أشهر شروح العقيدة الطحاوية وأوسعها انتشاراً", pages: 800, url: "https://shamela.ws", featured: false },
  { id: 30, title: "معارج القبول", author: "حافظ الحكمي", category: "العقيدة", description: "شرح سلم الوصول إلى علم الأصول في التوحيد", pages: 1200, url: "https://shamela.ws", featured: false },

  { id: 31, title: "الرحيق المختوم", author: "صفي الرحمن المباركفوري", category: "السيرة والتاريخ", description: "كتاب حائز على جائزة رابطة العالم الإسلامي في السيرة النبوية", pages: 500, url: "https://al-maktaba.org", featured: true },
  { id: 32, title: "فقه السيرة", author: "محمد الغزالي", category: "السيرة والتاريخ", description: "دراسة تحليلية للسيرة النبوية واستنباط الدروس والعبر منها", pages: 500, url: "https://al-maktaba.org", featured: false },
  { id: 33, title: "زاد المعاد في هدي خير العباد", author: "ابن القيم الجوزية", category: "السيرة والتاريخ", description: "كتاب جامع بين السيرة والفقه والحديث وهدي النبي ﷺ", pages: 2400, url: "https://shamela.ws", featured: true },
  { id: 34, title: "البداية والنهاية", author: "ابن كثير", category: "السيرة والتاريخ", description: "موسوعة تاريخية شاملة من بدء الخليقة إلى عصر المؤلف", pages: 5600, url: "https://shamela.ws", featured: true },
  { id: 35, title: "السيرة النبوية", author: "ابن هشام", category: "السيرة والتاريخ", description: "أقدم وأشهر كتب السيرة النبوية، تهذيب سيرة ابن إسحاق", pages: 1800, url: "https://shamela.ws", featured: true },

  { id: 36, title: "الآجرومية", author: "ابن آجروم", category: "اللغة العربية", description: "متن مختصر في قواعد النحو العربي للمبتدئين", pages: 30, url: "https://shamela.ws", featured: true },
  { id: 37, title: "ألفية ابن مالك", author: "ابن مالك الأندلسي", category: "اللغة العربية", description: "منظومة شعرية في ألف بيت تجمع قواعد النحو والصرف", pages: 100, url: "https://shamela.ws", featured: true },
  { id: 38, title: "قطر الندى وبل الصدى", author: "ابن هشام الأنصاري", category: "اللغة العربية", description: "كتاب في النحو العربي متوسط المستوى بين الاختصار والتفصيل", pages: 250, url: "https://shamela.ws", featured: false },
  { id: 39, title: "شذا العرف في فن الصرف", author: "أحمد الحملاوي", category: "اللغة العربية", description: "كتاب ميسر في علم الصرف يشرح أبنية الكلمات وتصريفاتها", pages: 200, url: "https://shamela.ws", featured: false },

  { id: 40, title: "إحياء علوم الدين", author: "أبو حامد الغزالي", category: "الأخلاق والتزكية", description: "موسوعة في التربية والسلوك والأخلاق والعبادات وأحوال القلوب", pages: 3000, url: "https://shamela.ws", featured: true },
  { id: 41, title: "مدارج السالكين", author: "ابن القيم الجوزية", category: "الأخلاق والتزكية", description: "شرح منازل السائرين في التزكية والسلوك إلى الله", pages: 1800, url: "https://shamela.ws", featured: true },
  { id: 42, title: "الجواب الكافي لمن سأل عن الدواء الشافي", author: "ابن القيم الجوزية", category: "الأخلاق والتزكية", description: "كتاب في أثر الذنوب والمعاصي وعلاجها، يُعرف بـ الداء والدواء", pages: 400, url: "https://shamela.ws", featured: false },
  { id: 43, title: "تهذيب الأخلاق", author: "ابن مسكويه", category: "الأخلاق والتزكية", description: "كتاب في الأخلاق والفضائل وكيفية تهذيب النفس وتزكيتها", pages: 300, url: "https://al-maktaba.org", featured: false },
  { id: 44, title: "الأذكار", author: "الإمام النووي", category: "الأخلاق والتزكية", description: "جمع شامل للأذكار والأدعية المأثورة عن النبي ﷺ في مختلف المناسبات", pages: 500, url: "https://shamela.ws", featured: true },
  { id: 45, title: "تلبيس إبليس", author: "ابن الجوزي", category: "الأخلاق والتزكية", description: "كتاب يكشف حيل الشيطان ومداخله على الناس بمختلف طبقاتهم", pages: 400, url: "https://shamela.ws", featured: false },
  { id: 46, title: "لطائف المعارف", author: "ابن رجب الحنبلي", category: "الأخلاق والتزكية", description: "كتاب يتناول فضائل الأزمنة والمواسم وما يُستحب فيها من الأعمال", pages: 450, url: "https://shamela.ws", featured: false },
  { id: 47, title: "مختصر منهاج القاصدين", author: "ابن قدامة المقدسي", category: "الأخلاق والتزكية", description: "اختصار لكتاب إحياء علوم الدين مع تنقيحه من الأحاديث الضعيفة", pages: 500, url: "https://shamela.ws", featured: false },
  { id: 48, title: "نزهة الفضلاء تهذيب سير أعلام النبلاء", author: "محمد حسن عقيل موسى", category: "السيرة والتاريخ", description: "تهذيب واختصار لكتاب سير أعلام النبلاء للذهبي", pages: 2000, url: "https://shamela.ws", featured: false },
  { id: 49, title: "أصول الفقه", author: "محمد أبو زهرة", category: "الفقه الإسلامي", description: "كتاب معاصر في أصول الفقه يجمع بين الأصالة والتيسير", pages: 400, url: "https://al-maktaba.org", featured: false },
  { id: 50, title: "الوجيز في أصول الفقه", author: "عبد الكريم زيدان", category: "الفقه الإسلامي", description: "مدخل ميسر لعلم أصول الفقه للمبتدئين وطلاب العلم", pages: 300, url: "https://al-maktaba.org", featured: false },
];

export default function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");

  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const matchesCategory = selectedCategory === "الكل" || book.category === selectedCategory;
      const matchesSearch =
        searchQuery === "" ||
        book.title.includes(searchQuery) ||
        book.author.includes(searchQuery);
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="p-6 space-y-6" data-testid="library-page">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-primary" data-testid="library-title">المكتبة الإسلامية</h1>
          <p className="text-muted-foreground">مجموعة شاملة من أمهات الكتب والمراجع الإسلامية</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            data-testid="input-search"
            placeholder="بحث بعنوان الكتاب أو المؤلف..."
            className="pr-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap" data-testid="category-filters">
        <Filter className="h-4 w-4 text-muted-foreground ml-1" />
        {categories.map((cat) => (
          <Button
            key={cat}
            data-testid={`filter-category-${cat}`}
            variant={selectedCategory === cat ? "default" : "outline"}
            size="sm"
            className={selectedCategory === cat ? "bg-primary text-primary-foreground" : ""}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="books-count">
        <Book className="h-4 w-4" />
        <span>عرض {filteredBooks.length} من أصل {books.length} كتاب</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="books-grid">
        {filteredBooks.map((book) => (
          <Card
            key={book.id}
            data-testid={`card-book-${book.id}`}
            className="group hover:shadow-lg transition-all duration-300 border-primary/10 hover:border-primary/30 flex flex-col"
          >
            <CardHeader className="pb-3 relative flex-shrink-0">
              {book.featured && (
                <div className="absolute top-4 left-4">
                  <Badge variant="default" className="bg-accent text-accent-foreground" data-testid={`badge-featured-${book.id}`}>مميز</Badge>
                </div>
              )}
              <div className="w-16 h-16 rounded-lg bg-primary/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                <Book className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="font-serif text-xl leading-tight" data-testid={`text-book-title-${book.id}`}>{book.title}</CardTitle>
              <CardDescription data-testid={`text-book-author-${book.id}`}>{book.author}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2" data-testid={`text-book-desc-${book.id}`}>{book.description}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <Badge variant="outline" className="text-xs font-normal">{book.category}</Badge>
                <span>• {book.pages} صفحة</span>
              </div>
            </CardContent>
            <CardFooter className="flex-shrink-0">
              <Button
                data-testid={`button-browse-${book.id}`}
                className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80 gap-2"
                onClick={() => window.open(book.url, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="w-4 h-4" />
                تصفح الكتاب
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {filteredBooks.length === 0 && (
        <div className="text-center py-16" data-testid="empty-results">
          <Book className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">لا توجد نتائج مطابقة للبحث</p>
          <p className="text-sm text-muted-foreground/70 mt-1">جرّب تغيير كلمات البحث أو اختيار تصنيف آخر</p>
        </div>
      )}
    </div>
  );
}
