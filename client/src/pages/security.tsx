import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

export default function Security() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: securitySummary, isLoading } = useQuery({
    queryKey: ["/api/security/summary"],
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

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

  const totalIssues = securitySummary ? 
    securitySummary.critical + securitySummary.high + securitySummary.medium + securitySummary.low : 0;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title="Security" />
        
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold" data-testid="text-security-title">Security Dashboard</h2>
              <p className="text-muted-foreground">Monitor and manage security vulnerabilities across your projects</p>
            </div>
            <Button className="bg-primary text-primary-foreground" data-testid="button-new-scan">
              <i className="fas fa-shield-alt mr-2"></i>
              New Scan
            </Button>
          </div>

          {/* Security Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
                <i className="fas fa-exclamation-triangle text-destructive"></i>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive" data-testid="text-critical-count">
                  {isLoading ? '-' : securitySummary?.critical || 0}
                </div>
                <p className="text-xs text-muted-foreground">Requires immediate attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Priority</CardTitle>
                <i className="fas fa-exclamation-circle text-destructive"></i>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive" data-testid="text-high-count">
                  {isLoading ? '-' : securitySummary?.high || 0}
                </div>
                <p className="text-xs text-muted-foreground">Should be addressed soon</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Medium Priority</CardTitle>
                <i className="fas fa-exclamation-triangle text-warning"></i>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning" data-testid="text-medium-count">
                  {isLoading ? '-' : securitySummary?.medium || 0}
                </div>
                <p className="text-xs text-muted-foreground">Monitor and plan fixes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Priority</CardTitle>
                <i className="fas fa-info-circle text-primary"></i>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary" data-testid="text-low-count">
                  {isLoading ? '-' : securitySummary?.low || 0}
                </div>
                <p className="text-xs text-muted-foreground">Nice to have fixes</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="vulnerabilities" className="space-y-6">
            <TabsList>
              <TabsTrigger value="vulnerabilities" data-testid="tab-vulnerabilities">Vulnerabilities</TabsTrigger>
              <TabsTrigger value="scans" data-testid="tab-scans">Recent Scans</TabsTrigger>
              <TabsTrigger value="tools" data-testid="tab-tools">Security Tools</TabsTrigger>
            </TabsList>

            <TabsContent value="vulnerabilities" className="space-y-4">
              {totalIssues === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-shield-check text-2xl text-success"></i>
                  </div>
                  <h3 className="text-lg font-medium mb-2">No security issues found</h3>
                  <p className="text-muted-foreground mb-4">
                    Your projects are currently secure. Run regular scans to maintain security.
                  </p>
                  <Button data-testid="button-run-scan">
                    Run Security Scan
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mock vulnerability entries */}
                  <Card className="border-l-4 border-l-destructive" data-testid="card-vulnerability-1">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <i className="fas fa-bug text-destructive"></i>
                          <div>
                            <CardTitle className="text-lg">SQL Injection Vulnerability</CardTitle>
                            <p className="text-sm text-muted-foreground">User input validation missing in login endpoint</p>
                          </div>
                        </div>
                        <Badge className={getSeverityColor('critical')}>
                          <i className={`${getSeverityIcon('critical')} mr-1`}></i>
                          Critical
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-muted-foreground">Project: frontend-app</span>
                          <span className="text-sm text-muted-foreground">File: /src/auth/login.js:45</span>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" data-testid="button-view-details-1">
                            View Details
                          </Button>
                          <Button size="sm" data-testid="button-fix-1">
                            Fix Now
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-warning" data-testid="card-vulnerability-2">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <i className="fas fa-exclamation-triangle text-warning"></i>
                          <div>
                            <CardTitle className="text-lg">Outdated Dependencies</CardTitle>
                            <p className="text-sm text-muted-foreground">Multiple packages have known vulnerabilities</p>
                          </div>
                        </div>
                        <Badge className={getSeverityColor('medium')}>
                          <i className={`${getSeverityIcon('medium')} mr-1`}></i>
                          Medium
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-muted-foreground">Project: microservices-api</span>
                          <span className="text-sm text-muted-foreground">Affected: 7 packages</span>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" data-testid="button-view-details-2">
                            View Details
                          </Button>
                          <Button size="sm" data-testid="button-fix-2">
                            Update Packages
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="scans" className="space-y-4">
              <div className="space-y-4">
                <Card data-testid="card-scan-1">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-success rounded-full"></div>
                        <div>
                          <CardTitle className="text-lg">SAST Scan - frontend-app</CardTitle>
                          <p className="text-sm text-muted-foreground">Static Application Security Testing</p>
                        </div>
                      </div>
                      <Badge className="bg-success/10 text-success">Completed</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm">Issues found: 3 High, 5 Medium</span>
                        <span className="text-sm text-muted-foreground">Duration: 2m 34s</span>
                      </div>
                      <span className="text-sm text-muted-foreground">2 hours ago</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" data-testid="button-view-report-1">
                        View Report
                      </Button>
                      <Button size="sm" variant="outline" data-testid="button-download-report-1">
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-scan-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-primary rounded-full status-running"></div>
                        <div>
                          <CardTitle className="text-lg">DAST Scan - api-gateway</CardTitle>
                          <p className="text-sm text-muted-foreground">Dynamic Application Security Testing</p>
                        </div>
                      </div>
                      <Badge className="bg-primary/10 text-primary">Running</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm">Progress: 67%</span>
                        <Progress value={67} className="w-32" />
                      </div>
                      <span className="text-sm text-muted-foreground">Started 45m ago</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" data-testid="button-cancel-scan-2">
                        Cancel Scan
                      </Button>
                      <Button size="sm" variant="outline" data-testid="button-view-logs-2">
                        View Logs
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tools" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card data-testid="card-tool-sonarqube">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
                        <i className="fas fa-shield-alt text-primary mr-2"></i>
                        SonarQube
                      </CardTitle>
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Static code analysis and quality gates
                    </p>
                    <div className="flex justify-between items-center">
                      <Badge variant="outline">SAST</Badge>
                      <Button size="sm" data-testid="button-configure-sonarqube">Configure</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-tool-owasp-zap">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
                        <i className="fas fa-bug text-warning mr-2"></i>
                        OWASP ZAP
                      </CardTitle>
                      <div className="w-2 h-2 bg-warning rounded-full"></div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Dynamic application security testing
                    </p>
                    <div className="flex justify-between items-center">
                      <Badge variant="outline">DAST</Badge>
                      <Button size="sm" data-testid="button-configure-zap">Configure</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-tool-dependency-check">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
                        <i className="fas fa-cubes text-success mr-2"></i>
                        Dependency Check
                      </CardTitle>
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Scan dependencies for known vulnerabilities
                    </p>
                    <div className="flex justify-between items-center">
                      <Badge variant="outline">SCA</Badge>
                      <Button size="sm" data-testid="button-configure-dependency">Configure</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
