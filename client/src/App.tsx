import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import AdminPanel from "@/pages/AdminPanel";
import AccountPanel from "@/pages/AccountPanel";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/account" component={AccountPanel} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { theme } = useTheme();
  return (
    <TooltipProvider>
      <Toaster theme={theme === "dark" ? "dark" : "light"} position="top-center" richColors />
      <Router />
    </TooltipProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
