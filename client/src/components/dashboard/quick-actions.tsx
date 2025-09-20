import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

export default function QuickActions() {
  const { isAuthenticated } = useAuth();
  
  const { data: githubProfile } = useQuery({
    queryKey: ["/api/github/profile"],
    enabled: isAuthenticated,
  });

  const actions = [
    {
      icon: "fas fa-plus",
      label: "Create Pipeline",
      description: "Set up a new CI/CD pipeline",
      color: "text-primary",
      action: "createPipeline"
    },
    {
      icon: "fab fa-github",
      label: "Import Repository",
      description: "Connect a GitHub repository",
      color: "text-primary",
      action: "importRepo"
    },
    {
      icon: "fas fa-dharmachakra",
      label: "Connect K8s Cluster",
      description: "Add Kubernetes cluster",
      color: "text-primary",
      action: "connectCluster"
    },
    {
      icon: "fas fa-shield-alt",
      label: "Security Scan",
      description: "Run security analysis",
      color: "text-primary",
      action: "securityScan"
    }
  ];

  const integrations = [
    {
      name: "GitHub",
      icon: "fab fa-github",
      status: githubProfile ? "connected" : "disconnected"
    },
    {
      name: "Docker Hub",
      icon: "fab fa-docker",
      status: "connected"
    },
    {
      name: "Kubernetes",
      icon: "fas fa-dharmachakra",
      status: "connected"
    },
    {
      name: "SonarQube",
      icon: "fas fa-shield-alt",
      status: "warning"
    }
  ];

  const handleAction = (action: string) => {
    switch (action) {
      case 'createPipeline':
        window.location.href = '/pipelines';
        break;
      case 'importRepo':
        window.location.href = '/projects';
        break;
      case 'connectCluster':
        window.location.href = '/kubernetes';
        break;
      case 'securityScan':
        window.location.href = '/security';
        break;
    }
  };

  return (
    <>
      <Card data-testid="quick-actions">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-start p-3 h-auto"
                onClick={() => handleAction(action.action)}
                data-testid={`action-${action.action}`}
              >
                <i className={`${action.icon} ${action.color} mr-3`}></i>
                <div className="text-left">
                  <div className="font-medium">{action.label}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="integration-status">
        <CardHeader>
          <CardTitle className="text-lg">Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {integrations.map((integration, index) => (
              <div key={index} className="flex items-center justify-between" data-testid={`integration-${integration.name.toLowerCase()}`}>
                <div className="flex items-center space-x-3">
                  <i className={`${integration.icon} text-lg`}></i>
                  <span className="text-sm">{integration.name}</span>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  integration.status === 'connected' ? 'bg-success' :
                  integration.status === 'warning' ? 'bg-warning' :
                  'bg-muted'
                }`}></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
