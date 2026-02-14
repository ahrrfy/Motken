import { useAuth } from "@/lib/auth-context";
import { Route, Switch } from "wouter";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import StudentsPage from "@/pages/StudentsPage";
import QuranTracker from "@/pages/QuranTracker";
import LibraryPage from "@/pages/LibraryPage";
import ReportsPage from "@/pages/ReportsPage";
import IDCardsPage from "@/pages/IDCardsPage";
import TeachersPage from "@/pages/TeachersPage";
import SettingsPage from "@/pages/SettingsPage";
import QRScannerPage from "@/pages/QRScannerPage";
import AssignmentsPage from "@/pages/AssignmentsPage";
import ActivityLogsPage from "@/pages/ActivityLogsPage";
import NotificationsPage from "@/pages/NotificationsPage";
import MosquesPage from "@/pages/MosquesPage";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-islamic-pattern" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto border-2 border-primary/20">
            <span className="text-3xl font-bold text-primary">ح</span>
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

  return (
    <SidebarLayout>
      <Switch>
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/mosques" component={MosquesPage} />
        <Route path="/students" component={StudentsPage} />
        <Route path="/teachers" component={TeachersPage} />
        <Route path="/assignments" component={AssignmentsPage} />
        <Route path="/quran" component={QuranTracker} />
        <Route path="/library" component={LibraryPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/id-cards" component={IDCardsPage} />
        <Route path="/scan-qr" component={QRScannerPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/activity-logs" component={ActivityLogsPage} />
        <Route path="/notifications" component={NotificationsPage} />
        <Route path="/users" component={StudentsPage} />
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
