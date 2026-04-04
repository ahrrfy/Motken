import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Loader2, Search, Settings2, Zap, MessageSquare,
  Trophy, Eye, Database, Bot, BarChart3, GraduationCap,
  ChevronDown, ChevronUp, CheckCircle2, XCircle, ToggleLeft
} from "lucide-react";

interface FeatureFlag {
  id: string;
  featureKey: string;
  featureName: string;
  description: string | null;
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
  education: "التعليم والمحتوى",
};

const categoryIcons: Record<string, React.ReactNode> = {
  management: <Settings2 className="w-5 h-5" />,
  communication: <MessageSquare className="w-5 h-5" />,
  gamification: <Trophy className="w-5 h-5" />,
  visualization: <Eye className="w-5 h-5" />,
  data: <Database className="w-5 h-5" />,
  automation: <Bot className="w-5 h-5" />,
  analytics: <BarChart3 className="w-5 h-5" />,
  education: <GraduationCap className="w-5 h-5" />,
};

const categoryColors: Record<string, string> = {
  management: "from-blue-500/10 to-blue-600/5 border-blue-200",
  communication: "from-cyan-500/10 to-cyan-600/5 border-cyan-200",
  gamification: "from-amber-500/10 to-amber-600/5 border-amber-200",
  visualization: "from-purple-500/10 to-purple-600/5 border-purple-200",
  data: "from-emerald-500/10 to-emerald-600/5 border-emerald-200",
  automation: "from-orange-500/10 to-orange-600/5 border-orange-200",
  analytics: "from-indigo-500/10 to-indigo-600/5 border-indigo-200",
  education: "from-teal-500/10 to-teal-600/5 border-teal-200",
};

const categoryIconColors: Record<string, string> = {
  management: "text-blue-600 bg-blue-100",
  communication: "text-cyan-600 bg-cyan-100",
  gamification: "text-amber-600 bg-amber-100",
  visualization: "text-purple-600 bg-purple-100",
  data: "text-emerald-600 bg-emerald-100",
  automation: "text-orange-600 bg-orange-100",
  analytics: "text-indigo-600 bg-indigo-100",
  education: "text-teal-600 bg-teal-100",
};

const categoryOrder = ["management", "education", "communication", "gamification", "visualization", "data", "automation", "analytics"];

export default function FeatureControlPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

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
          description: `تم ${!feature.isEnabled ? "تفعيل" : "تعطيل"} ${feature.featureName}`,
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

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const handleToggleAll = async (category: string, enable: boolean) => {
    const items = features.filter(f => f.category === category && f.isEnabled !== enable);
    for (const f of items) {
      await handleToggle(f);
    }
  };

  const filteredFeatures = searchTerm
    ? features.filter(f => f.featureName.includes(searchTerm) || (f.description || "").includes(searchTerm))
    : features;

  const grouped = categoryOrder.reduce<Record<string, FeatureFlag[]>>((acc, cat) => {
    const items = filteredFeatures.filter((f) => f.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  const totalEnabled = features.filter(f => f.isEnabled).length;
  const totalFeatures = features.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="loading-spinner">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 max-w-5xl mx-auto" dir="rtl">
      {/* العنوان */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title-feature-control">
              التحكم بالمميزات
            </h1>
            <p className="text-sm text-muted-foreground">إدارة وتفعيل وتعطيل مميزات النظام</p>
          </div>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <ToggleLeft className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-blue-700">{totalFeatures}</p>
              <p className="text-xs text-blue-600">إجمالي المميزات</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-green-700">{totalEnabled}</p>
              <p className="text-xs text-green-600">مفعّلة</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-white border-red-100">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-red-700">{totalFeatures - totalEnabled}</p>
              <p className="text-xs text-red-600">معطّلة</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* بحث */}
      <div className="relative">
        <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ابحث عن ميزة..."
          className="pr-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="input-search-features"
        />
      </div>

      {/* الأقسام */}
      {Object.entries(grouped).map(([category, items]) => {
        const isCollapsed = collapsedCategories.has(category);
        const enabledCount = items.filter(f => f.isEnabled).length;
        const iconColor = categoryIconColors[category] || "text-gray-600 bg-gray-100";
        const gradColor = categoryColors[category] || "from-gray-500/10 to-gray-600/5 border-gray-200";

        return (
          <Card key={category} className={`overflow-hidden border bg-gradient-to-br ${gradColor}`} data-testid={`card-category-${category}`}>
            <CardHeader
              className="cursor-pointer select-none py-3 px-4"
              onClick={() => toggleCategory(category)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconColor}`}>
                    {categoryIcons[category] || <Zap className="w-5 h-5" />}
                  </div>
                  <div>
                    <CardTitle className="text-base">{categoryLabels[category] || category}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {enabledCount} من {items.length} مفعّلة
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {enabledCount}/{items.length}
                  </Badge>
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
            {!isCollapsed && (
              <CardContent className="pt-0 pb-3 px-4 space-y-2">
                {/* أزرار تفعيل/تعطيل الكل */}
                <div className="flex gap-2 mb-2 pb-2 border-b border-border/40">
                  <button
                    className="text-xs text-green-600 hover:text-green-700 hover:underline font-medium"
                    onClick={(e) => { e.stopPropagation(); handleToggleAll(category, true); }}
                  >
                    تفعيل الكل
                  </button>
                  <span className="text-muted-foreground text-xs">|</span>
                  <button
                    className="text-xs text-red-500 hover:text-red-600 hover:underline font-medium"
                    onClick={(e) => { e.stopPropagation(); handleToggleAll(category, false); }}
                  >
                    تعطيل الكل
                  </button>
                </div>
                {items.map((feature) => (
                  <div
                    key={feature.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      feature.isEnabled
                        ? "bg-white/80 border-green-200/60 shadow-sm"
                        : "bg-white/40 border-border/40"
                    }`}
                    data-testid={`row-feature-${feature.id}`}
                  >
                    <div className="flex-1 space-y-0.5 ml-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm" data-testid={`text-feature-name-${feature.id}`}>
                          {feature.featureName}
                        </span>
                        {feature.isEnabled ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0" data-testid={`badge-feature-status-${feature.id}`}>
                            مفعّل
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[10px] px-1.5 py-0" data-testid={`badge-feature-status-${feature.id}`}>
                            معطّل
                          </Badge>
                        )}
                      </div>
                      {feature.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed" data-testid={`text-feature-desc-${feature.id}`}>
                          {feature.description}
                        </p>
                      )}
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
            )}
          </Card>
        );
      })}
    </div>
  );
}
