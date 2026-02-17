import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import { Route, Switch } from "wouter";
import { registerServiceWorker, startNotificationPolling, stopNotificationPolling, isNotificationsEnabled } from "@/lib/notifications";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import StudentsPage from "@/pages/StudentsPage";
import QuranTracker from "@/pages/QuranTracker";
import LibraryPage from "@/pages/LibraryPage";
import ReportsPage from "@/pages/ReportsPage";
import IDCardsPage from "@/pages/IDCardsPage";
import IDCardsQRPage from "@/pages/IDCardsQRPage";
import TeachersPage from "@/pages/TeachersPage";
import SupervisorsPage from "@/pages/SupervisorsPage";
import SettingsPage from "@/pages/SettingsPage";
import QRScannerPage from "@/pages/QRScannerPage";
import AssignmentsExamsPage from "@/pages/AssignmentsExamsPage";
import ActivityLogsPage from "@/pages/ActivityLogsPage";
import NotificationsPage from "@/pages/NotificationsPage";
import MosquesPage from "@/pages/MosquesPage";
import AllUsersPage from "@/pages/AllUsersPage";
import RatingsPage from "@/pages/RatingsPage";
import TeacherActivitiesPage from "@/pages/TeacherActivitiesPage";
import CoursesPage from "@/pages/CoursesPage";
import TeacherDailyPage from "@/pages/TeacherDailyPage";
import OnlineUsersPage from "@/pages/OnlineUsersPage";
import MonitoringPage from "@/pages/MonitoringPage";
import AttendancePage from "@/pages/AttendancePage";
import CompetitionsPage from "@/pages/CompetitionsPage";
import ParentPortalPage from "@/pages/ParentPortalPage";
import FeatureControlPage from "@/pages/FeatureControlPage";
import MessagesPage from "@/pages/MessagesPage";
import PointsRewardsPage from "@/pages/PointsRewardsPage";
import SchedulesPage from "@/pages/SchedulesPage";
import SmartAlertsPage from "@/pages/SmartAlertsPage";
import CrisisManagementPage from "@/pages/CrisisManagementPage";
import GraduationPage from "@/pages/GraduationPage";
import InstitutionalPage from "@/pages/InstitutionalPage";
import FamilySystemPage from "@/pages/FamilySystemPage";
import KnowledgeBasePage from "@/pages/KnowledgeBasePage";
import MaintenancePage from "@/pages/MaintenancePage";
import EducationalContentPage from "@/pages/EducationalContentPage";
import SidebarLayout from "@/components/layout/SidebarLayout";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import PublicParentReportPage from "@/pages/PublicParentReportPage";
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";

function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    if (user && isNotificationsEnabled()) {
      startNotificationPolling();
    }
    return () => {
      stopNotificationPolling();
    };
  }, [user]);

  if (window.location.pathname.startsWith("/parent-report/")) {
    return (
      <>
        <Switch>
          <Route path="/parent-report/:token" component={PublicParentReportPage} />
        </Switch>
        <Toaster />
      </>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-islamic-pattern" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto">
            <img src="/logo.png" alt="مُتْقِن" className="w-full h-full rounded-lg" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginPage />
        <Toaster />
      </>
    );
  }

  if (!user.acceptedPrivacyPolicy && user.role !== "admin") {
    return (
      <>
        <PrivacyPolicyPage />
        <Toaster />
      </>
    );
  }

  return (
    <SidebarLayout>
      <Switch>
        <Route path="/daily" component={TeacherDailyPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/mosques" component={MosquesPage} />
        <Route path="/students" component={StudentsPage} />
        <Route path="/teachers" component={TeachersPage} />
        <Route path="/supervisors" component={SupervisorsPage} />
        <Route path="/assignments" component={AssignmentsExamsPage} />
        <Route path="/ratings" component={RatingsPage} />
        <Route path="/courses" component={CoursesPage} />
        <Route path="/quran" component={QuranTracker} />
        <Route path="/library" component={LibraryPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/id-cards" component={IDCardsQRPage} />
        <Route path="/scan-qr" component={QRScannerPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/activity-logs" component={ActivityLogsPage} />
        <Route path="/teacher-activities" component={TeacherActivitiesPage} />
        <Route path="/notifications" component={NotificationsPage} />
        <Route path="/users" component={AllUsersPage} />
        <Route path="/monitoring" component={MonitoringPage} />
        <Route path="/online-users" component={OnlineUsersPage} />
        <Route path="/attendance" component={AttendancePage} />
        <Route path="/competitions" component={CompetitionsPage} />
        <Route path="/parent-portal" component={ParentPortalPage} />
        <Route path="/feature-control" component={FeatureControlPage} />
        <Route path="/messages" component={MessagesPage} />
        <Route path="/points-rewards" component={PointsRewardsPage} />
        <Route path="/schedules" component={SchedulesPage} />
        <Route path="/smart-alerts" component={SmartAlertsPage} />
        <Route path="/crisis-management" component={CrisisManagementPage} />
        <Route path="/graduation" component={GraduationPage} />
        <Route path="/institutional" component={InstitutionalPage} />
        <Route path="/family-system" component={FamilySystemPage} />
        <Route path="/knowledge-base" component={KnowledgeBasePage} />
        <Route path="/maintenance" component={MaintenancePage} />
        <Route path="/educational-content" component={EducationalContentPage} />
        <Route path="/" component={DashboardPage} />
        <Route>
          <div className="p-10 text-center">
            <h2 className="text-2xl font-bold text-muted-foreground">الصفحة غير موجودة</h2>
            <p className="mt-2 text-muted-foreground">404 Not Found</p>
          </div>
        </Route>
      </Switch>
      <Toaster />
    </SidebarLayout>
  );
}

export default App;
