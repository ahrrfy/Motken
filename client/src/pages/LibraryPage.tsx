import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Book } from "lucide-react";

const books = [
  { id: 1, title: "صحيح البخاري", author: "الإمام البخاري", category: "الحديث", status: "available" },
  { id: 2, title: "صحيح مسلم", author: "الإمام مسلم", category: "الحديث", status: "available" },
  { id: 3, title: "تفسير السعدي", author: "عبد الرحمن السعدي", category: "تفسير", status: "featured" },
  { id: 4, title: "تفسير ابن كثير", author: "ابن كثير", category: "تفسير", status: "available" },
  { id: 5, title: "رياض الصالحين", author: "الإمام النووي", category: "الحديث", status: "available" },
  { id: 6, title: "زاد المعاد", author: "ابن القيم", category: "سيرة", status: "new" },
];

export default function LibraryPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-primary">المكتبة الإسلامية</h1>
          <p className="text-muted-foreground">مجموعة مختارة من أمهات الكتب والمراجع</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث في المكتبة..." className="pr-10" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {books.map((book) => (
          <Card key={book.id} className="group hover:shadow-lg transition-all duration-300 border-primary/10 hover:border-primary/30">
            <CardHeader className="pb-3 relative">
               <div className="absolute top-4 left-4">
                 {book.status === "featured" && <Badge variant="default" className="bg-accent text-accent-foreground">مميز</Badge>}
                 {book.status === "new" && <Badge variant="secondary" className="bg-primary/10 text-primary">جديد</Badge>}
               </div>
               <div className="w-16 h-16 rounded-lg bg-primary/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                 <Book className="w-8 h-8 text-primary" />
               </div>
               <CardTitle className="font-serif text-xl">{book.title}</CardTitle>
               <CardDescription>{book.author}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs font-normal">{book.category}</Badge>
                <span>• 450 صفحة</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80">تصفح الكتاب</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
