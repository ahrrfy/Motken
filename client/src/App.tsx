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
import DonationsPage from "@/pages/DonationsPage";
import SettingsPage from "@/pages/SettingsPage";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { Toaster } from "@/components/ui/toaster";

function App() {
  const { user } = useAuth();

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
        <Route path="/students" component={StudentsPage} />
        <Route path="/teachers" component={TeachersPage} />
        <Route path="/quran" component={QuranTracker} />
        <Route path="/library" component={LibraryPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/id-cards" component={IDCardsPage} />
        <Route path="/donations" component={DonationsPage} />
        <Route path="/settings" component={SettingsPage} />
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
