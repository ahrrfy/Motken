import { useAuth, UserRole } from "@/lib/auth-context";
import { useEffect, useState, lazy, Suspense, ComponentType } from "react";
import { Route, Switch } from "wouter";
import { registerServiceWorker, startNotificationPolling, stopNotificationPolling, isNotificationsEnabled } from "@/lib/notifications";
import { startUpdateChecker, stopUpdateChecker, onUpdateAvailable, applyUpdate } from "@/lib/update-checker";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import StudentsPage from "@/pages/StudentsPage";
import QuranTracker from "@/pages/QuranTracker";
import LibraryPage from "@/pages/LibraryPage";
import ReportsPage from "@/pages/ReportsPage";
import IDCardsQRPage from "@/pages/IDCardsQRPage";
import TeachersPage from "@/pages/TeachersPage";
import SupervisorsPage from "@/pages/SupervisorsPage";
import SettingsPage from "@/pages/SettingsPage";
import QRScannerPage from "@/pages/QRScannerPage";
import AssignmentsExamsPage from "@/pages/AssignmentsExamsPage";
import ActivityLogsPage from "@/pages/ActivityLogsPage";
import NotificationsPage from "@/pages/NotificationsPage";
import MosquesPage from "@/pages/MosquesPage";
import MosqueDashboardPage from "@/pages/MosqueDashboardPage";
import AllUsersPage from "@/pages/AllUsersPage";
import RatingsPage from "@/pages/RatingsPage";
import TeacherActivitiesPage from "@/pages/TeacherActivitiesPage";
import CoursesGraduationPage from "@/pages/CoursesGraduationPage";
import TeacherDailyPage from "@/pages/TeacherDailyPage";
import OnlineUsersPage from "@/pages/OnlineUsersPage";
import MonitoringPage from "@/pages/MonitoringPage";
import AttendancePage from "@/pages/AttendancePage";
import CompetitionsPage from "@/pages/CompetitionsPage";
import ParentPortalPage from "@/pages/ParentPortalPage";
import FeatureControlPage from "@/pages/FeatureControlPage";
import TestimonialsManagePage from "@/pages/TestimonialsManagePage";
import MessagesPage from "@/pages/MessagesPage";
import PointsRewardsPage from "@/pages/PointsRewardsPage";
import SchedulesPage from "@/pages/SchedulesPage";
import SmartAlertsPage from "@/pages/SmartAlertsPage";
import CrisisManagementPage from "@/pages/CrisisManagementPage";
import InstitutionalPage from "@/pages/InstitutionalPage";
import FamilySystemPage from "@/pages/FamilySystemPage";
import KnowledgeBasePage from "@/pages/KnowledgeBasePage";
import MaintenancePage from "@/pages/MaintenancePage";
import EducationalContentPage from "@/pages/EducationalContentPage";
import FloorPlanPage from "@/pages/FloorPlanPage";
import WhiteboardPage from "@/pages/WhiteboardPage";
import SidebarLayout from "@/components/layout/SidebarLayout";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import ChangelogPage from "@/pages/ChangelogPage";
import WelcomeWizard from "@/components/WelcomeWizard";
import PublicParentReportPage from "@/pages/PublicParentReportPage";
import RegisterMosquePage from "@/pages/RegisterMosquePage";
import LandingPage from "@/pages/LandingPage";
import SpreadPage from "@/pages/SpreadPage";
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWebSocket } from "@/hooks/use-websocket";
const MobileApp = lazy(() => import("@/mobile/MobileApp"));

function RoleGuard({ roles, Component }: { roles: UserRole[]; Component: ComponentType }) {
  const { user } = useAuth();
  const effectiveRole = user?.actualRole || user?.role;
  if (!effectiveRole || !roles.includes(effectiveRole)) {
    return (
      <div className="p-10 text-center" dir="rtl">
        <h2 className="text-2xl font-bold text-destructive">غير مصرح بالوصول</h2>
        <p className="mt-2 text-muted-foreground">ليس لديك صلاحية لعرض هذه الصفحة</p>
      </div>
    );
  }
  return <Component />;
}

function UpdateBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const unsub = onUpdateAvailable(() => setShow(true));
    return unsub;
  }, []);

  if (!show) return null;

  return (
    <div
      data-testid="update-banner"
      className="fixed top-0 left-0 right-0 z-[9999] bg-primary text-primary-foreground px-4 py-3 flex items-center justify-center gap-4 shadow-lg animate-in slide-in-from-top"
      dir="rtl"
    >
      <span className="text-sm font-medium">يتوفر تحديث جديد للنظام</span>
      <button
        data-testid="button-apply-update"
        onClick={applyUpdate}
        className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
      >
        تحديث الآن
      </button>
      <button
        data-testid="button-dismiss-update"
        onClick={() => setShow(false)}
        className="text-white/70 hover:text-white text-lg leading-none transition-colors"
        aria-label="إغلاق"
      >
        ✕
      </button>
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();
  const [showWelcome, setShowWelcome] = useState(false);

  // WebSocket for real-time notifications
  useWebSocket();

  useEffect(() => {
    registerServiceWorker();
    startUpdateChecker();
    return () => stopUpdateChecker();
  }, []);

  useEffect(() => {
    if (user && !localStorage.getItem("mutqin_onboarding_done")) {
      setShowWelcome(true);
    }
  }, [user]);

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
        <UpdateBanner />
        <Switch>
          <Route path="/parent-report/:token" component={PublicParentReportPage} />
        </Switch>
        <Toaster />
      </>
    );
  }

  if (window.location.pathname.startsWith("/register-mosque")) {
    return (
      <>
        <UpdateBanner />
        <Switch>
          <Route path="/register-mosque" component={RegisterMosquePage} />
        </Switch>
        <Toaster />
      </>
    );
  }

  if (window.location.pathname === "/welcome" ||
      window.location.pathname.startsWith("/welcome") ||
      window.location.pathname === "/") {
    if (!user) {
      return (
        <>
          <Switch>
            <Route path="/welcome" component={LandingPage} />
            <Route path="/" component={LandingPage} />
          </Switch>
          <Toaster />
        </>
      );
    }
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
        <UpdateBanner />
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

  if (isMobile) {
    return (
      <>
        <UpdateBanner />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
          <MobileApp />
        </Suspense>
        <Toaster />
      </>
    );
  }

  return (
    <SidebarLayout>
      <UpdateBanner />
      {showWelcome && user && (
        <WelcomeWizard
          role={user.actualRole || user.role}
          userName={user.name}
          onComplete={() => setShowWelcome(false)}
        />
      )}
      <Switch>
        <Route path="/daily" component={TeacherDailyPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/mosques/:id/dashboard" component={MosqueDashboardPage} />
        <Route path="/mosques">{() => <RoleGuard roles={["admin"]} Component={MosquesPage} />}</Route>
        <Route path="/students" component={StudentsPage} />
        <Route path="/teachers" component={TeachersPage} />
        <Route path="/supervisors">{() => <RoleGuard roles={["admin"]} Component={SupervisorsPage} />}</Route>
        <Route path="/assignments" component={AssignmentsExamsPage} />
        <Route path="/ratings" component={RatingsPage} />
        <Route path="/courses" component={CoursesGraduationPage} />
        <Route path="/quran" component={QuranTracker} />
        <Route path="/library" component={LibraryPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/id-cards" component={IDCardsQRPage} />
        <Route path="/scan-qr" component={QRScannerPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/activity-logs" component={ActivityLogsPage} />
        <Route path="/teacher-activities">{() => <RoleGuard roles={["admin", "supervisor"]} Component={TeacherActivitiesPage} />}</Route>
        <Route path="/notifications" component={NotificationsPage} />
        <Route path="/users">{() => <RoleGuard roles={["admin"]} Component={AllUsersPage} />}</Route>
        <Route path="/monitoring">{() => <RoleGuard roles={["admin"]} Component={MonitoringPage} />}</Route>
        <Route path="/online-users" component={OnlineUsersPage} />
        <Route path="/attendance" component={AttendancePage} />
        <Route path="/competitions" component={CompetitionsPage} />
        <Route path="/parent-portal" component={ParentPortalPage} />
        <Route path="/feature-control">{() => <RoleGuard roles={["admin"]} Component={FeatureControlPage} />}</Route>
        <Route path="/testimonials-manage">{() => <RoleGuard roles={["admin"]} Component={TestimonialsManagePage} />}</Route>
        <Route path="/messages" component={MessagesPage} />
        <Route path="/points-rewards" component={PointsRewardsPage} />
        <Route path="/schedules" component={SchedulesPage} />
        <Route path="/smart-alerts" component={SmartAlertsPage} />
        <Route path="/crisis-management" component={CrisisManagementPage} />
        <Route path="/graduation">{() => <CoursesGraduationPage />}</Route>
        <Route path="/certificates">{() => <CoursesGraduationPage />}</Route>
        <Route path="/institutional" component={InstitutionalPage} />
        <Route path="/family-system" component={FamilySystemPage} />
        <Route path="/knowledge-base" component={KnowledgeBasePage} />
        <Route path="/maintenance" component={MaintenancePage} />
        <Route path="/educational-content" component={EducationalContentPage} />
        <Route path="/floor-plan" component={FloorPlanPage} />
        <Route path="/whiteboard" component={WhiteboardPage} />
        <Route path="/spread" component={SpreadPage} />
        <Route path="/changelog" component={ChangelogPage} />
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
