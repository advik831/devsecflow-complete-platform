import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import { LoginForm } from "@/components/LoginForm";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import Pipelines from "@/pages/pipelines";
import Security from "@/pages/security";
import Kubernetes from "@/pages/kubernetes";
import Artifacts from "@/pages/artifacts";
import Templates from "@/pages/templates";
import ProjectDetails from "@/pages/project-details";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="*" component={LoginForm} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/projects" component={Projects} />
          <Route path="/projects/:id" component={ProjectDetails} />
          <Route path="/pipelines" component={Pipelines} />
          <Route path="/security" component={Security} />
          <Route path="/kubernetes" component={Kubernetes} />
          <Route path="/artifacts" component={Artifacts} />
          <Route path="/templates" component={Templates} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
