import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import StatusCards from "@/components/dashboard/status-cards";
import RecentPipelines from "@/components/dashboard/recent-pipelines";
import QuickActions from "@/components/dashboard/quick-actions";
import PipelineBuilder from "@/components/dashboard/pipeline-builder";
import SecurityOverview from "@/components/dashboard/security-overview";
import KubernetesClusters from "@/components/dashboard/kubernetes-clusters";
import { LoginForm } from "@/components/LoginForm";

export default function Dashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // If not authenticated, show login form
  if (!isLoading && !isAuthenticated) {
    return <LoginForm />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-60'} transition-all duration-300`}>
        <Sidebar collapsed={sidebarCollapsed} />
      </div>
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title="DevOps Dashboard" onToggleSidebar={toggleSidebar} />
        
        <div className="flex-1 overflow-auto p-6">
          <StatusCards />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            <div className="lg:col-span-2">
              <RecentPipelines />
            </div>
            <div className="space-y-6">
              <QuickActions />
            </div>
          </div>

          <PipelineBuilder />

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SecurityOverview />
            <KubernetesClusters />
          </div>
        </div>
      </main>
    </div>
  );
}
