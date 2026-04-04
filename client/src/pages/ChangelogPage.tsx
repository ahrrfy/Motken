import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ShieldCheck, Zap, Wrench, BookOpen, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface ChangelogEntry {
  version: string;
  date: string;
  type: "feature" | "improvement" | "fix" | "security";
  title: string;
  items: string[];
}

const typeConfig = {
  feature: { label: "ميزة جديدة", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: Sparkles },
  improvement: { label: "تحسين", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: Zap },
  fix: { label: "إصلاح", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", icon: Wrench },
  security: { label: "أمان", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: ShieldCheck },
};

export default function ChangelogPage() {
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/changelog.json")
      .then(res => res.json())
      .then((data: ChangelogEntry[]) => setChangelog(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-7 h-7 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-changelog-title">سجل التغييرات</h1>
      </div>
      <p className="text-muted-foreground mb-6">آخر التحديثات والتحسينات على النظام</p>

      <div className="space-y-4">
        {changelog.map((entry, idx) => {
          const config = typeConfig[entry.type];
          const Icon = config.icon;
          return (
            <Card key={idx} data-testid={`card-changelog-${idx}`} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">{entry.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">v{entry.version}</Badge>
                    <Badge className={`text-xs ${config.color}`}>{config.label}</Badge>
                    <span className="text-xs text-muted-foreground">{entry.date}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {entry.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-1.5 shrink-0">●</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
