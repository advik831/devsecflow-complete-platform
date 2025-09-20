import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLogout } from "@/hooks/useLogout";
import { 
  LayoutDashboard,
  FolderOpen,
  GitBranch,
  Shield,
  Cpu,
  Package,
  FileText,
  Rocket,
  User,
  LogOut
} from "lucide-react";

interface SidebarProps {
  collapsed?: boolean;
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { logout, isLoggingOut } = useLogout();

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      active: location === "/"
    },
    {
      name: "Projects",
      href: "/projects",
      icon: FolderOpen,
      active: location === "/projects"
    },
    {
      name: "Pipelines",
      href: "/pipelines",
      icon: GitBranch,
      active: location === "/pipelines"
    },
    {
      name: "Security",
      href: "/security",
      icon: Shield,
      active: location === "/security"
    },
    {
      name: "Kubernetes",
      href: "/kubernetes",
      icon: Cpu,
      active: location === "/kubernetes"
    },
    {
      name: "Artifacts",
      href: "/artifacts",
      icon: Package,
      active: location === "/artifacts"
    },
    {
      name: "Templates",
      href: "/templates",
      icon: FileText,
      active: location === "/templates"
    },
  ];

  return (
    <nav 
      className={`${collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'} bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300`} 
      id="sidebar"
      data-testid="sidebar"
    >
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Rocket className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-lg sidebar-text" data-testid="text-app-name">
              DevSecFlow
            </span>
          )}
        </div>
      </div>
      
      <div className="flex-1 p-2">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const IconComponent = item.icon;
            return (
              <li key={item.name}>
                <Link 
                  href={item.href} 
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                    item.active 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                >
                  <IconComponent className="w-4 h-4" />
                  {!collapsed && (
                    <span className="sidebar-text">{item.name}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          {!collapsed && (
            <div className="sidebar-text">
              <div className="text-sm font-medium" data-testid="text-user-name">
                {user && user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user && user.username ? user.username : "User"}
              </div>
              <div className="text-xs text-muted-foreground" data-testid="text-user-email">
                {user && user.email ? user.email : user && user.username ? user.username : ""}
              </div>
            </div>
          )}
        </div>
        {!collapsed && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-2 text-muted-foreground hover:text-foreground"
            onClick={() => logout()}
            disabled={isLoggingOut}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {isLoggingOut ? "Signing out..." : "Sign Out"}
          </Button>
        )}
      </div>
    </nav>
  );
}
