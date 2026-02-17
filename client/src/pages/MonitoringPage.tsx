import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "@/lib/theme-context";
import OnlineUsersPage from "@/pages/OnlineUsersPage";
import ActivityLogsPage from "@/pages/ActivityLogsPage";
import TeacherActivitiesPage from "@/pages/TeacherActivitiesPage";

export default function MonitoringPage() {
  const { language } = useTheme();
  const isEn = language === "en";

  return (
    <div dir="rtl" data-testid="page-monitoring">
      <Tabs defaultValue="online-users" className="w-full">
        <div className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6">
          <TabsList className="w-full sm:w-auto" data-testid="tabs-monitoring">
            <TabsTrigger value="online-users" className="flex-1 sm:flex-none gap-2" data-testid="tab-online-users">
              {isEn ? "Online Users" : "المتصلون الآن"}
            </TabsTrigger>
            <TabsTrigger value="activity-logs" className="flex-1 sm:flex-none gap-2" data-testid="tab-activity-logs">
              {isEn ? "Activity Logs" : "سجل الحركات"}
            </TabsTrigger>
            <TabsTrigger value="teacher-activities" className="flex-1 sm:flex-none gap-2" data-testid="tab-teacher-activities">
              {isEn ? "Teacher Activities" : "أنشطة الأساتذة"}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="online-users" className="mt-0" data-testid="tab-content-online-users">
          <OnlineUsersPage />
        </TabsContent>
        <TabsContent value="activity-logs" className="mt-0" data-testid="tab-content-activity-logs">
          <ActivityLogsPage />
        </TabsContent>
        <TabsContent value="teacher-activities" className="mt-0" data-testid="tab-content-teacher-activities">
          <TeacherActivitiesPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
