import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { BookOpen, GraduationCap, Award, Shield } from "lucide-react";
import CoursesPage from "./CoursesPage";
import GraduationPage from "./GraduationPage";
import CertificatesPage from "./CertificatesPage";

export default function CoursesGraduationPage() {
  const { user } = useAuth();
  const [location] = useLocation();

  const initialTab = useMemo(() => {
    if (location === "/graduation") return "graduation";
    if (location === "/certificates") return "certificates";
    return "courses";
  }, []);

  const [activeTab, setActiveTab] = useState(initialTab);

  const isStudent = user?.role === "student";
  const canManageGraduation = user?.role === "admin" || user?.role === "supervisor" || user?.role === "teacher";

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 page-transition" dir="rtl">
      <div className="flex items-center gap-3">
        <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title-courses-graduation">
            الدورات والتخرج
          </h1>
          <p className="text-muted-foreground text-sm">
            {isStudent ? "دوراتي وشهاداتي" : "إدارة الدورات والتخرج والشهادات"}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList data-testid="tabs-list-unified" className="flex-wrap h-auto gap-1">
          <TabsTrigger value="courses" data-testid="tab-courses" className="gap-1">
            <BookOpen className="w-4 h-4" />
            الدورات
          </TabsTrigger>
          {canManageGraduation && (
          <TabsTrigger value="graduation" data-testid="tab-graduation" className="gap-1">
            <GraduationCap className="w-4 h-4" />
            التخرج
          </TabsTrigger>
          )}
          <TabsTrigger value="certificates" data-testid="tab-certificates" className="gap-1">
            <Award className="w-4 h-4" />
            الشهادات
          </TabsTrigger>
          <TabsTrigger value="verify" data-testid="tab-verify" className="gap-1">
            <Shield className="w-4 h-4" />
            التحقق
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="mt-4">
          <CoursesPage embedded />
        </TabsContent>

        {canManageGraduation && (
        <TabsContent value="graduation" className="mt-4">
          <GraduationPage embedded />
        </TabsContent>
        )}

        <TabsContent value="certificates" className="mt-4">
          <CertificatesPage embedded defaultTab="list" />
        </TabsContent>

        <TabsContent value="verify" className="mt-4">
          <CertificatesPage embedded defaultTab="verify" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
