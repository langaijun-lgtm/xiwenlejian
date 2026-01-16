import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import Home from "./pages/Home";
import Goals from "./pages/Goals";
import Expenses from "./pages/Expenses";
import Stats from "./pages/Stats";
import Insights from "./pages/Insights";

function Router() {
  return (
    <Switch>
      <Route path={"/"}>
        <AppLayout>
          <Home />
        </AppLayout>
      </Route>
      <Route path={"/goals"}>
        <AppLayout>
          <Goals />
        </AppLayout>
      </Route>
      <Route path={"/expenses"}>
        <AppLayout>
          <Expenses />
        </AppLayout>
      </Route>
      <Route path={"/stats"}>
        <AppLayout>
          <Stats />
        </AppLayout>
      </Route>
      <Route path={"/insights"}>
        <AppLayout>
          <Insights />
        </AppLayout>
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
