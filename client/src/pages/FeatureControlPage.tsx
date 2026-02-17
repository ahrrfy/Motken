import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2 } from "lucide-react";

interface FeatureFlag {
  id: number;
  key: string;
  name: string;
  description: string;
  category: string;
  isEnabled: boolean;
}

const categoryLabels: Record<string, string> = {
  management: "الإدارة",
  communication: "التواصل",
  gamification: "التحفيز والمسابقات",
  visualization: "العرض المرئي",
  data: "البيانات",
  automation: "الأتمتة",
  analytics: "التحليلات",
};

const categoryOrder = ["management", "communication", "gamification", "visualization", "data", "automation", "analytics"];

export default function FeatureControlPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    async function loadFeatures() {
      try {
        await fetch("/api/feature-flags/seed", {
          method: "POST",
          credentials: "include",
        });

        const res = await fetch("/api/feature-flags", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setFeatures(data);
        }
      } catch {
        toast({ title: "خطأ", description: "فشل في تحميل المميزات", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    loadFeatures();
  }, []);

  const handleToggle = async (feature: FeatureFlag) => {
    setTogglingIds((prev) => new Set(prev).add(feature.id));
    try {
      const res = await fetch(`/api/feature-flags/${feature.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isEnabled: !feature.isEnabled }),
      });
      if (res.ok) {
        setFeatures((prev) =>
          prev.map((f) => (f.id === feature.id ? { ...f, isEnabled: !f.isEnabled } : f))
        );
        toast({
          title: "تم بنجاح",
          description: `تم ${!feature.isEnabled ? "تفعيل" : "تعطيل"} ${feature.name}`,
          className: "bg-green-50 border-green-200 text-green-800",
        });
      } else {
        toast({ title: "خطأ", description: "فشل في تحديث الميزة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ في الاتصال", variant: "destructive" });
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(feature.id);
        return next;
      });
    }
  };

  const grouped = categoryOrder.reduce<Record<string, FeatureFlag[]>>((acc, cat) => {
    const items = features.filter((f) => f.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="loading-spinner">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3">
        <Shield className="w-7 h-7 text-primary" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title">
          التحكم بالمميزات
        </h1>
      </div>

      {Object.entries(grouped).map(([category, items]) => (
        <Card key={category} data-testid={`card-category-${category}`}>
          <CardHeader>
            <CardTitle className="text-lg">{categoryLabels[category] || category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((feature) => (
              <div
                key={feature.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                data-testid={`row-feature-${feature.id}`}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm" data-testid={`text-feature-name-${feature.id}`}>
                      {feature.name}
                    </span>
                    <Badge
                      variant={feature.isEnabled ? "default" : "destructive"}
                      className={feature.isEnabled ? "bg-green-500 hover:bg-green-600" : ""}
                      data-testid={`badge-feature-status-${feature.id}`}
                    >
                      {feature.isEnabled ? "مفعّل" : "معطّل"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground" data-testid={`text-feature-desc-${feature.id}`}>
                    {feature.description}
                  </p>
                </div>
                <Switch
                  checked={feature.isEnabled}
                  onCheckedChange={() => handleToggle(feature)}
                  disabled={togglingIds.has(feature.id)}
                  data-testid={`switch-feature-${feature.id}`}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
