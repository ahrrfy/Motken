import { useAuth, UserRole } from "@/lib/auth-context";
import { useEffect, useState, lazy, Suspense, ComponentType } from "react";
import { Route, Switch } from "wouter";
import { registerServiceWorker, startNotificationPolling, stopNotificationPolling, isNotificationsEnabled } from "@/lib/notifications";
import { startUpdateChecker, stopUpdateChecker, onUpdateAvailable, applyUpdate } from "@/lib/update-checker";
import SidebarLayout from "@/components/layout/SidebarLayout";
import WelcomeWizard from "@/components/WelcomeWizard";
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWebSocket } from "@/hooks/use-websocket";

// Lazy-loaded pages
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const StudentsPage = lazy(() => import("@/pages/StudentsPage"));
const QuranTracker = lazy(() => import("@/pages/QuranTracker"));
const LibraryPage = lazy(() => import("@/pages/LibraryPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const IDCardsQRPage = lazy(() => import("@/pages/IDCardsQRPage"));
const TeachersPage = lazy(() => import("@/pages/TeachersPage"));
const SupervisorsPage = lazy(() => import("@/pages/SupervisorsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const QRScannerPage = lazy(() => import("@/pages/QRScannerPage"));
const AssignmentsExamsPage = lazy(() => import("@/pages/AssignmentsExamsPage"));
const ActivityLogsPage = lazy(() => import("@/pages/ActivityLogsPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const MosquesPage = lazy(() => import("@/pages/MosquesPage"));
const MosqueDashboardPage = lazy(() => import("@/pages/MosqueDashboardPage"));
const AllUsersPage = lazy(() => import("@/pages/AllUsersPage"));

const TeacherActivitiesPage = lazy(() => import("@/pages/TeacherActivitiesPage"));
const CoursesGraduationPage = lazy(() => import("@/pages/CoursesGraduationPage"));
const TeacherDailyPage = lazy(() => import("@/pages/TeacherDailyPage"));
const OnlineUsersPage = lazy(() => import("@/pages/OnlineUsersPage"));
const MonitoringPage = lazy(() => import("@/pages/MonitoringPage"));
const AttendancePage = lazy(() => import("@/pages/AttendancePage"));
const CompetitionsPage = lazy(() => import("@/pages/CompetitionsPage"));
const ParentPortalPage = lazy(() => import("@/pages/ParentPortalPage"));
const FeatureControlPage = lazy(() => import("@/pages/FeatureControlPage"));
const TestimonialsManagePage = lazy(() => import("@/pages/TestimonialsManagePage"));
const MessagesPage = lazy(() => import("@/pages/MessagesPage"));
const PointsRewardsPage = lazy(() => import("@/pages/PointsRewardsPage"));

const SmartAlertsPage = lazy(() => import("@/pages/SmartAlertsPage"));
const CrisisManagementPage = lazy(() => import("@/pages/CrisisManagementPage"));
const InstitutionalPage = lazy(() => import("@/pages/InstitutionalPage"));
const FamilySystemPage = lazy(() => import("@/pages/FamilySystemPage"));

const MaintenancePage = lazy(() => import("@/pages/MaintenancePage"));

const FloorPlanPage = lazy(() => import("@/pages/FloorPlanPage"));
const WhiteboardPage = lazy(() => import("@/pages/WhiteboardPage"));
const PrivacyPolicyPage = lazy(() => import("@/pages/PrivacyPolicyPage"));
const ChangelogPage = lazy(() => import("@/pages/ChangelogPage"));
const PublicParentReportPage = lazy(() => import("@/pages/PublicParentReportPage"));
const RegisterMosquePage = lazy(() => import("@/pages/RegisterMosquePage"));
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const SpreadPage = lazy(() => import("@/pages/SpreadPage"));
const ParentDashboardPage = lazy(() => import("@/pages/ParentDashboardPage"));
const MobileApp = lazy(() => import("@/mobile/MobileApp"));

function PageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground">جاري التحميل...</p>
      </div>
    </div>
  );
}

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
        <Suspense fallback={<PageSkeleton />}>
          <Switch>
            <Route path="/parent-report/:token" component={PublicParentReportPage} />
          </Switch>
        </Suspense>
        <Toaster />
      </>
    );
  }

  if (window.location.pathname.startsWith("/register-mosque")) {
    return (
      <>
        <UpdateBanner />
        <Suspense fallback={<PageSkeleton />}>
          <Switch>
            <Route path="/register-mosque" component={RegisterMosquePage} />
          </Switch>
        </Suspense>
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
          <Suspense fallback={<PageSkeleton />}>
            <Switch>
              <Route path="/welcome" component={LandingPage} />
              <Route path="/" component={LandingPage} />
            </Switch>
          </Suspense>
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
        <Suspense fallback={<PageSkeleton />}>
          <LoginPage />
        </Suspense>
        <Toaster />
      </>
    );
  }

  if (!user.acceptedPrivacyPolicy && user.role !== "admin") {
    return (
      <>
        <Suspense fallback={<PageSkeleton />}>
          <PrivacyPolicyPage />
        </Suspense>
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
      <Suspense fallback={<PageSkeleton />}>
      <Switch>
        <Route path="/daily" component={TeacherDailyPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/mosques/:id/dashboard" component={MosqueDashboardPage} />
        <Route path="/mosques">{() => <RoleGuard roles={["admin"]} Component={MosquesPage} />}</Route>
        <Route path="/students" component={StudentsPage} />
        <Route path="/teachers" component={TeachersPage} />
        <Route path="/supervisors">{() => <RoleGuard roles={["admin"]} Component={SupervisorsPage} />}</Route>
        <Route path="/assignments" component={AssignmentsExamsPage} />

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

        <Route path="/smart-alerts" component={SmartAlertsPage} />
        <Route path="/crisis-management" component={CrisisManagementPage} />
        <Route path="/graduation">{() => <CoursesGraduationPage />}</Route>
        <Route path="/certificates">{() => <CoursesGraduationPage />}</Route>
        <Route path="/institutional" component={InstitutionalPage} />
        <Route path="/family-system" component={FamilySystemPage} />

        <Route path="/maintenance" component={MaintenancePage} />

        <Route path="/floor-plan" component={FloorPlanPage} />
        <Route path="/whiteboard" component={WhiteboardPage} />
        <Route path="/spread" component={SpreadPage} />
        <Route path="/changelog" component={ChangelogPage} />
        <Route path="/parent-dashboard">{() => <RoleGuard roles={["parent"]} Component={ParentDashboardPage} />}</Route>
        <Route path="/">{() => user?.role === "parent" ? <ParentDashboardPage /> : <DashboardPage />}</Route>
        <Route>
          <div className="p-10 text-center">
            <h2 className="text-2xl font-bold text-muted-foreground">الصفحة غير موجودة</h2>
            <p className="mt-2 text-muted-foreground">404 Not Found</p>
          </div>
        </Route>
      </Switch>
      </Suspense>
      <Toaster />
    </SidebarLayout>
  );
}

export default App;
