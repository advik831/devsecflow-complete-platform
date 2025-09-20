import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const pipelineFormSchema = z.object({
  name: z.string().min(1, "Pipeline name is required"),
  description: z.string().optional(),
});

export default function Pipelines() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const form = useForm<z.infer<typeof pipelineFormSchema>>({
    resolver: zodResolver(pipelineFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const { data: recentRuns, isLoading } = useQuery({
    queryKey: ["/api/pipelines/recent"],
    enabled: isAuthenticated,
  });

  const handleUseTemplate = (templateName: string) => {
    setSelectedTemplate(templateName);
    form.reset({
      name: `${templateName} Pipeline`,
      description: `Pipeline created from ${templateName} template`,
    });
    setIsCreateDialogOpen(true);
  };

  const handleCreatePipeline = async (data: z.infer<typeof pipelineFormSchema>) => {
    try {
      toast({
        title: "Pipeline Created",
        description: `Pipeline "${data.name}" created using ${selectedTemplate} template`,
      });
      setIsCreateDialogOpen(false);
      form.reset();
      setSelectedTemplate(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create pipeline",
        variant: "destructive",
      });
    }
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-primary/10 text-primary';
      case 'success': return 'bg-success/10 text-success';
      case 'failed': return 'bg-destructive/10 text-destructive';
      case 'cancelled': return 'bg-muted/10 text-muted-foreground';
      default: return 'bg-muted/10 text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return 'fas fa-play';
      case 'success': return 'fas fa-check';
      case 'failed': return 'fas fa-times';
      case 'cancelled': return 'fas fa-stop';
      default: return 'fas fa-question';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'running': return 'bg-primary animate-pulse';
      case 'success': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title="Pipelines" />
        
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold" data-testid="text-pipelines-title">CI/CD Pipelines</h2>
              <p className="text-muted-foreground">Monitor and manage your pipeline executions</p>
            </div>
            <Button className="bg-primary text-primary-foreground" data-testid="button-create-pipeline">
              <i className="fas fa-plus mr-2"></i>
              New Pipeline
            </Button>
          </div>

          <Tabs defaultValue="recent" className="space-y-6">
            <TabsList>
              <TabsTrigger value="recent" data-testid="tab-recent">Recent Runs</TabsTrigger>
              <TabsTrigger value="active" data-testid="tab-active">Active Pipelines</TabsTrigger>
              <TabsTrigger value="templates" data-testid="tab-templates">Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="recent" className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading pipeline runs...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {!recentRuns || recentRuns.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-code-branch text-2xl text-muted-foreground"></i>
                      </div>
                      <h3 className="text-lg font-medium mb-2">No pipeline runs yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Create your first pipeline to start automating your deployments
                      </p>
                      <Button data-testid="button-create-first-pipeline">
                        Create Your First Pipeline
                      </Button>
                    </div>
                  ) : (
                    (recentRuns || []).map((run: any) => (
                      <Card key={run.id} className="hover:shadow-md transition-all duration-200 border-l-4 border-l-transparent hover:border-l-primary" data-testid={`card-pipeline-run-${run.id}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <div className={`w-3 h-3 rounded-full mt-1.5 ${getStatusDot(run.status)}`}></div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center space-x-3 mb-1">
                                  <CardTitle className="text-lg font-semibold truncate" data-testid={`text-pipeline-name-${run.id}`}>
                                    {run.pipelineName || 'Unknown Pipeline'}
                                  </CardTitle>
                                  <Badge className={getStatusColor(run.status)} data-testid={`badge-status-${run.id}`}>
                                    <i className={`${getStatusIcon(run.status)} mr-1 text-xs`}></i>
                                    {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                  <span data-testid={`text-project-name-${run.id}`}>
                                    {run.projectName}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center">
                                    <i className="fas fa-code-branch mr-1 text-xs"></i>
                                    {run.branch || 'main'}
                                  </span>
                                  {run.commitHash && (
                                    <>
                                      <span>•</span>
                                      <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono" data-testid={`text-commit-${run.id}`}>
                                        {run.commitHash.substring(0, 7)}
                                      </code>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" className="shrink-0" data-testid={`button-view-pipeline-${run.id}`}>
                              <i className="fas fa-external-link-alt text-xs"></i>
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span className="flex items-center">
                                <i className="fas fa-clock mr-1"></i>
                                {run.completedAt 
                                  ? new Date(run.completedAt).toLocaleString()
                                  : new Date(run.startedAt).toLocaleString()
                                }
                              </span>
                              {run.triggeredBy && (
                                <>
                                  <span>•</span>
                                  <span data-testid={`text-triggered-by-${run.id}`}>
                                    by {run.triggeredBy}
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              {run.status === 'running' && (
                                <Button size="sm" variant="outline" className="h-8 px-3" data-testid={`button-cancel-${run.id}`}>
                                  <i className="fas fa-stop mr-1 text-xs"></i>
                                  Cancel
                                </Button>
                              )}
                              {run.status === 'failed' && (
                                <Button size="sm" variant="outline" className="h-8 px-3" data-testid={`button-retry-${run.id}`}>
                                  <i className="fas fa-redo mr-1 text-xs"></i>
                                  Retry
                                </Button>
                              )}
                              <Button size="sm" variant="outline" className="h-8 px-3" data-testid={`button-logs-${run.id}`}>
                                <i className="fas fa-file-alt mr-1 text-xs"></i>
                                Logs
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="active" className="space-y-4">
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-play text-2xl text-muted-foreground"></i>
                </div>
                <h3 className="text-lg font-medium mb-2">No active pipelines</h3>
                <p className="text-muted-foreground">All pipelines are currently idle</p>
              </div>
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="border-dashed border-2 hover:border-primary transition-colors cursor-pointer" data-testid="card-create-template">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <i className="fas fa-plus text-primary text-xl"></i>
                    </div>
                    <h3 className="font-medium mb-2">Create Template</h3>
                    <p className="text-sm text-muted-foreground text-center">
                      Build a reusable pipeline template
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-template-nodejs">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <i className="fab fa-node-js text-success mr-2"></i>
                      Node.js CI/CD
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Complete pipeline for Node.js applications with testing and deployment
                    </p>
                    <div className="flex justify-between items-center">
                      <Badge variant="outline">Popular</Badge>
                      <Button size="sm" data-testid="button-use-nodejs-template" onClick={() => handleUseTemplate('Node.js CI/CD')}>Use Template</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-template-docker">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <i className="fab fa-docker text-primary mr-2"></i>
                      Docker Build
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Build and push Docker images with security scanning
                    </p>
                    <div className="flex justify-between items-center">
                      <Badge variant="outline">DevSecOps</Badge>
                      <Button size="sm" data-testid="button-use-docker-template" onClick={() => handleUseTemplate('Docker Build')}>Use Template</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Pipeline Creation Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle data-testid="text-create-pipeline-title">
              Create Pipeline from {selectedTemplate} Template
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreatePipeline)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pipeline Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Production Deployment Pipeline" 
                        {...field}
                        value={field.value || ""}
                        data-testid="input-pipeline-name" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what this pipeline does..." 
                        {...field}
                        value={field.value || ""}
                        data-testid="input-pipeline-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-confirm-create">
                  <i className="fas fa-plus mr-2"></i>
                  Create Pipeline
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
