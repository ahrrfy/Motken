import { useState, useEffect, lazy, Suspense } from "react";
import { Route, Switch, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AnimatePresence, motion } from "framer-motion";
import MobileLayout from "./MobileLayout";
import MobileSidebar from "./MobileSidebar";
import MobileFAB from "./MobileFAB";
import MobileOfflineBanner from "./MobileOfflineBanner";
import WelcomeWizard from "@/components/WelcomeWizard";
import { DashboardSkeleton, ListSkeleton, CardsSkeleton, GenericSkeleton } from "./MobileSkeleton";

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const TeacherDailyPage = lazy(() => import("@/pages/TeacherDailyPage"));
const StudentsPage = lazy(() => import("@/pages/StudentsPage"));
const TeachersPage = lazy(() => import("@/pages/TeachersPage"));
const SupervisorsPage = lazy(() => import("@/pages/SupervisorsPage"));
const AllUsersPage = lazy(() => import("@/pages/AllUsersPage"));
const AssignmentsExamsPage = lazy(() => import("@/pages/AssignmentsExamsPage"));
const QuranTracker = lazy(() => import("@/pages/QuranTracker"));
const CoursesGraduationPage = lazy(() => import("@/pages/CoursesGraduationPage"));
const LibraryPage = lazy(() => import("@/pages/LibraryPage"));
const KnowledgeBasePage = lazy(() => import("@/pages/KnowledgeBasePage"));
const EducationalContentPage = lazy(() => import("@/pages/EducationalContentPage"));
const AttendancePage = lazy(() => import("@/pages/AttendancePage"));
const PointsRewardsPage = lazy(() => import("@/pages/PointsRewardsPage"));
const RatingsPage = lazy(() => import("@/pages/RatingsPage"));
const SchedulesPage = lazy(() => import("@/pages/SchedulesPage"));
const CompetitionsPage = lazy(() => import("@/pages/CompetitionsPage"));
const MessagesPage = lazy(() => import("@/pages/MessagesPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const SmartAlertsPage = lazy(() => import("@/pages/SmartAlertsPage"));
const ParentPortalPage = lazy(() => import("@/pages/ParentPortalPage"));
const FamilySystemPage = lazy(() => import("@/pages/FamilySystemPage"));
const WhiteboardPage = lazy(() => import("@/pages/WhiteboardPage"));
const SpreadPage = lazy(() => import("@/pages/SpreadPage"));
const MosquesPage = lazy(() => import("@/pages/MosquesPage"));
const MosqueDashboardPage = lazy(() => import("@/pages/MosqueDashboardPage"));
const FloorPlanPage = lazy(() => import("@/pages/FloorPlanPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const IDCardsQRPage = lazy(() => import("@/pages/IDCardsQRPage"));
const QRScannerPage = lazy(() => import("@/pages/QRScannerPage"));
const MonitoringPage = lazy(() => import("@/pages/MonitoringPage"));
const TeacherActivitiesPage = lazy(() => import("@/pages/TeacherActivitiesPage"));
const FeatureControlPage = lazy(() => import("@/pages/FeatureControlPage"));
const TestimonialsManagePage = lazy(() => import("@/pages/TestimonialsManagePage"));
const CrisisManagementPage = lazy(() => import("@/pages/CrisisManagementPage"));
const InstitutionalPage = lazy(() => import("@/pages/InstitutionalPage"));
const MaintenancePage = lazy(() => import("@/pages/MaintenancePage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const ActivityLogsPage = lazy(() => import("@/pages/ActivityLogsPage"));
const OnlineUsersPage = lazy(() => import("@/pages/OnlineUsersPage"));
const ChangelogPage = lazy(() => import("@/pages/ChangelogPage"));

function getSkeleton(path: string) {
  if (path === "/" || path === "/dashboard") return <DashboardSkeleton />;
  if (["/students", "/teachers", "/supervisors", "/users"].some(p => path.startsWith(p))) return <ListSkeleton />;
  if (["/assignments", "/attendance", "/points-rewards", "/ratings"].some(p => path.startsWith(p))) return <CardsSkeleton />;
  return <GenericSkeleton />;
}

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: "easeOut" },
};

export default function MobileApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    if (user && !localStorage.getItem("mutqin_onboarding_done")) {
      setShowWelcome(true);
    }
  }, [user]);

  return (
    <>
      {showWelcome && user && (
        <WelcomeWizard
          role={(user as any).actualRole || user.role}
          userName={user.name}
          onComplete={() => setShowWelcome(false)}
        />
      )}
      <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <MobileOfflineBanner />
      <MobileLayout onMenuOpen={() => setSidebarOpen(true)}>
        <AnimatePresence mode="wait">
          <motion.div key={location} {...pageTransition}>
            <Suspense fallback={getSkeleton(location)}>
              <Switch>
                <Route path="/daily" component={TeacherDailyPage} />
                <Route path="/dashboard" component={DashboardPage} />
                <Route path="/mosques/:id/dashboard" component={MosqueDashboardPage} />
                <Route path="/mosques" component={MosquesPage} />
                <Route path="/students" component={StudentsPage} />
                <Route path="/teachers" component={TeachersPage} />
                <Route path="/supervisors" component={SupervisorsPage} />
                <Route path="/users" component={AllUsersPage} />
                <Route path="/assignments" component={AssignmentsExamsPage} />
                <Route path="/quran" component={QuranTracker} />
                <Route path="/courses" component={CoursesGraduationPage} />
                <Route path="/library" component={LibraryPage} />
                <Route path="/knowledge-base" component={KnowledgeBasePage} />
                <Route path="/educational-content" component={EducationalContentPage} />
                <Route path="/graduation" component={CoursesGraduationPage} />
                <Route path="/certificates" component={CoursesGraduationPage} />
                <Route path="/attendance" component={AttendancePage} />
                <Route path="/points-rewards" component={PointsRewardsPage} />
                <Route path="/ratings" component={RatingsPage} />
                <Route path="/schedules" component={SchedulesPage} />
                <Route path="/competitions" component={CompetitionsPage} />
                <Route path="/messages" component={MessagesPage} />
                <Route path="/notifications" component={NotificationsPage} />
                <Route path="/smart-alerts" component={SmartAlertsPage} />
                <Route path="/parent-portal" component={ParentPortalPage} />
                <Route path="/family-system" component={FamilySystemPage} />
                <Route path="/whiteboard" component={WhiteboardPage} />
                <Route path="/spread" component={SpreadPage} />
                <Route path="/floor-plan" component={FloorPlanPage} />
                <Route path="/reports" component={ReportsPage} />
                <Route path="/id-cards" component={IDCardsQRPage} />
                <Route path="/scan-qr" component={QRScannerPage} />
                <Route path="/monitoring" component={MonitoringPage} />
                <Route path="/teacher-activities" component={TeacherActivitiesPage} />
                <Route path="/feature-control" component={FeatureControlPage} />
                <Route path="/testimonials-manage" component={TestimonialsManagePage} />
                <Route path="/crisis-management" component={CrisisManagementPage} />
                <Route path="/institutional" component={InstitutionalPage} />
                <Route path="/maintenance" component={MaintenancePage} />
                <Route path="/settings" component={SettingsPage} />
                <Route path="/activity-logs" component={ActivityLogsPage} />
                <Route path="/online-users" component={OnlineUsersPage} />
                <Route path="/changelog" component={ChangelogPage} />
                <Route path="/" component={DashboardPage} />
                <Route>
                  {() => (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6" dir="rtl">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <span className="text-2xl">404</span>
                      </div>
                      <h2 className="text-lg font-bold mb-2">الصفحة غير موجودة</h2>
                      <p className="text-sm text-muted-foreground mb-4">الصفحة التي تبحث عنها غير متوفرة</p>
                      <a href="/dashboard" className="text-sm text-primary font-medium hover:underline">العودة للوحة التحكم</a>
                    </div>
                  )}
                </Route>
              </Switch>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </MobileLayout>
      <MobileFAB />
    </>
  );
}
