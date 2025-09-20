import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function RecentPipelines() {
  const { isAuthenticated } = useAuth();

  const { data: recentRuns, isLoading } = useQuery({
    queryKey: ["/api/pipelines/recent"],
    enabled: isAuthenticated,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-primary/10 text-primary';
      case 'success': return 'bg-success/10 text-success';
      case 'failed': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted/10 text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return 'fas fa-play';
      case 'success': return 'fas fa-check';
      case 'failed': return 'fas fa-times';
      default: return 'fas fa-question';
    }
  };

  const formatDuration = (startedAt: string, completedAt?: string) => {
    const start = new Date(startedAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    return `${diffMins}m ${diffSecs}s`;
  };

  return (
    <Card data-testid="recent-pipelines">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Recent Pipelines</CardTitle>
          <Button variant="ghost" size="sm" className="text-primary hover:underline" data-testid="button-view-all">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading pipelines...</p>
          </div>
        ) : !recentRuns || recentRuns.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-code-branch text-muted-foreground"></i>
            </div>
            <p className="text-sm text-muted-foreground">No recent pipeline runs</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(recentRuns || []).slice(0, 5).map((run: any) => (
              <div 
                key={run.id} 
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                data-testid={`pipeline-run-${run.id}`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-2 h-2 rounded-full ${
                    run.status === 'running' ? 'status-running bg-primary' : 
                    run.status === 'success' ? 'bg-success' : 
                    run.status === 'failed' ? 'bg-destructive' : 'bg-muted'
                  }`}></div>
                  <div>
                    <h3 className="font-medium" data-testid={`pipeline-name-${run.id}`}>
                      {run.pipelineName || 'Unknown Pipeline'}
                    </h3>
                    <p className="text-sm text-muted-foreground" data-testid={`pipeline-details-${run.id}`}>
                      {run.projectName} • {run.branch || 'main'} branch
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge className={getStatusColor(run.status)} data-testid={`status-${run.id}`}>
                    <i className={`${getStatusIcon(run.status)} mr-1`}></i>
                    {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                  </Badge>
                  <span className="text-xs text-muted-foreground" data-testid={`duration-${run.id}`}>
                    {formatDuration(run.startedAt, run.completedAt)}
                  </span>
                  <Button size="sm" variant="ghost" data-testid={`view-pipeline-${run.id}`}>
                    <i className="fas fa-external-link-alt text-xs"></i>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
