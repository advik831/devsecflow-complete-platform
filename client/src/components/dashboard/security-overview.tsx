import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function SecurityOverview() {
  const { isAuthenticated } = useAuth();

  const { data: securitySummary, isLoading } = useQuery({
    queryKey: ["/api/security/summary"],
    enabled: isAuthenticated,
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive/10 text-destructive';
      case 'high': return 'bg-destructive/10 text-destructive';
      case 'medium': return 'bg-warning/10 text-warning';
      case 'low': return 'bg-primary/10 text-primary';
      default: return 'bg-muted/10 text-muted-foreground';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return 'fas fa-exclamation-triangle';
      case 'high': return 'fas fa-exclamation-circle';
      case 'medium': return 'fas fa-exclamation-triangle';
      case 'low': return 'fas fa-info-circle';
      default: return 'fas fa-question-circle';
    }
  };

  // Mock security issues for display
  const mockIssues = [
    {
      id: 1,
      severity: 'critical',
      title: 'SQL Injection vulnerability',
      description: 'User input validation missing in login endpoint',
      project: 'frontend-app'
    },
    {
      id: 2,
      severity: 'medium',
      title: 'Dependency vulnerabilities',
      description: 'Multiple packages have known vulnerabilities',
      project: 'microservices-api'
    },
    {
      id: 3,
      severity: 'low',
      title: 'Code quality issues',
      description: 'Minor code style and complexity issues',
      project: 'data-processor'
    }
  ];

  const totalIssues = securitySummary ? 
    securitySummary.critical + securitySummary.high + securitySummary.medium + securitySummary.low : 0;

  return (
    <Card data-testid="security-overview">
      <CardHeader>
        <CardTitle className="text-lg">Security Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading security data...</p>
          </div>
        ) : totalIssues === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-shield-check text-success"></i>
            </div>
            <p className="text-sm font-medium mb-2">No security issues found</p>
            <p className="text-xs text-muted-foreground">Your projects are secure</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="text-lg font-bold text-destructive" data-testid="critical-high-count">
                  {(securitySummary?.critical || 0) + (securitySummary?.high || 0)}
                </div>
                <div className="text-xs text-muted-foreground">Critical/High</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-warning" data-testid="medium-low-count">
                  {(securitySummary?.medium || 0) + (securitySummary?.low || 0)}
                </div>
                <div className="text-xs text-muted-foreground">Medium/Low</div>
              </div>
            </div>

            {/* Issue list */}
            {mockIssues.slice(0, 3).map((issue) => (
              <div 
                key={issue.id} 
                className="flex items-center justify-between p-3 border border-border rounded-lg"
                data-testid={`security-issue-${issue.id}`}
              >
                <div className="flex items-center space-x-3">
                  <i className={`${getSeverityIcon(issue.severity)} ${
                    issue.severity === 'critical' || issue.severity === 'high' ? 'text-destructive' :
                    issue.severity === 'medium' ? 'text-warning' : 'text-primary'
                  }`}></i>
                  <div>
                    <h4 className="text-sm font-medium" data-testid={`issue-title-${issue.id}`}>
                      {issue.title}
                    </h4>
                    <p className="text-xs text-muted-foreground" data-testid={`issue-description-${issue.id}`}>
                      {issue.description}
                    </p>
                  </div>
                </div>
                <Badge className={getSeverityColor(issue.severity)} data-testid={`issue-severity-${issue.id}`}>
                  {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
                </Badge>
              </div>
            ))}

            <div className="flex justify-center">
              <Button variant="outline" size="sm" data-testid="button-view-all-security">
                View All Issues
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
