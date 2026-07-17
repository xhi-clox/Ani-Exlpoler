import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/layout";
import NotFound from "@/pages/not-found";
import Search from "@/pages/search";
import AnimeInfo from "@/pages/anime-info";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import BrowseAnalyses from "@/pages/BrowseAnalyses";
import AnalysisPage from "@/pages/AnalysisPage";
import WriteAnalysis from "@/pages/WriteAnalysis";
import UserProfile from "@/pages/UserProfile";
import SettingsPage from "@/pages/SettingsPage";
import WatchHistory from "@/pages/WatchHistory";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={BrowseAnalyses} />
        <Route path="/search" component={Search} />
        <Route path="/anime/:id" component={AnimeInfo} />
        <Route path="/login" component={LoginPage} />
        <Route path="/signup" component={SignupPage} />
        <Route path="/analyses" component={BrowseAnalyses} />
        <Route path="/analyses/:id" component={AnalysisPage} />
        <Route path="/write" component={WriteAnalysis} />
        <Route path="/users/:username" component={UserProfile} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/watch-history" component={WatchHistory} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
