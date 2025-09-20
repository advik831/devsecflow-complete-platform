import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";

export default function StatusCards() {
  const { isAuthenticated } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: isAuthenticated,
  });

  const cards = [
    {
      title: "Active Pipelines",
      value: (stats as any)?.activePipelines || 0,
      icon: "fas fa-play",
      color: "text-success",
      bgColor: "bg-success/10"
    },
    {
      title: "Failed Builds",
      value: (stats as any)?.failedBuilds || 0,
      icon: "fas fa-exclamation-triangle",
      color: "text-destructive",
      bgColor: "bg-destructive/10"
    },
    {
      title: "Security Issues",
      value: (stats as any)?.securityIssues || 0,
      icon: "fas fa-shield-alt",
      color: "text-warning",
      bgColor: "bg-warning/10"
    },
    {
      title: "Deployments",
      value: (stats as any)?.deployments || 0,
      icon: "fas fa-rocket",
      color: "text-primary",
      bgColor: "bg-primary/10"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="status-cards">
      {cards.map((card, index) => (
        <Card key={index} data-testid={`status-card-${index}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground" data-testid={`card-title-${index}`}>
                  {card.title}
                </p>
                <p className={`text-2xl font-bold ${card.color}`} data-testid={`card-value-${index}`}>
                  {isLoading ? '-' : card.value}
                </p>
              </div>
              <div className={`w-10 h-10 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                <i className={`${card.icon} ${card.color}`}></i>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
