import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Analytics from "./pages/Analytics";
import Attendance from "./pages/Attendance";
import Home from "./pages/Home";
import Members from "./pages/Members";
import NotFound from "./pages/NotFound";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/attendance" component={Attendance} />
        <Route path="/members" component={Members} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster richColors position="top-center" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
