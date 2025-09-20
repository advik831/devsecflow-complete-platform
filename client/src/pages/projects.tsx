import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema } from "@shared/schema";
import { z } from "zod";

const projectFormSchema = insertProjectSchema.extend({
  name: z.string().min(1, "Project name is required"),
});

export default function Projects() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [repositoryMode, setRepositoryMode] = useState<'select' | 'manual'>('select');

  const form = useForm<z.infer<typeof projectFormSchema>>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      repositoryUrl: "",
      repositoryProvider: "github",
    },
  });

  const { data: projects, isLoading } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  const { data: repositories } = useQuery({
    queryKey: ["/api/github/repositories"],
    enabled: isAuthenticated,
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: z.infer<typeof projectFormSchema>) => {
      await apiRequest("POST", "/api/projects", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Project created successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    },
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

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title="Projects" />
        
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold" data-testid="text-projects-title">Projects</h2>
              <p className="text-muted-foreground">Manage your development projects and repositories</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground" data-testid="button-create-project">
                  <i className="fas fa-plus mr-2"></i>
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => createProjectMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Name</FormLabel>
                          <FormControl>
                            <Input placeholder="My Awesome Project" {...field} data-testid="input-project-name" />
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
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Project description..." 
                              {...field} 
                              value={field.value || ""}
                              data-testid="input-project-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Repository Selection Mode Toggle */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <FormLabel>Repository</FormLabel>
                        <div className="flex rounded-md border">
                          <button
                            type="button"
                            onClick={() => setRepositoryMode('select')}
                            className={`px-3 py-1 text-sm rounded-l-md ${
                              repositoryMode === 'select' 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                            data-testid="button-select-repository"
                          >
                            Select Repository
                          </button>
                          <button
                            type="button"
                            onClick={() => setRepositoryMode('manual')}
                            className={`px-3 py-1 text-sm rounded-r-md ${
                              repositoryMode === 'manual' 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                            data-testid="button-manual-repository"
                          >
                            Manual URL
                          </button>
                        </div>
                      </div>

                      {repositoryMode === 'select' ? (
                        <FormField
                          control={form.control}
                          name="repositoryUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Select GitHub Repository</FormLabel>
                              <Select 
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  // Auto-extract project name from repo
                                  const repoName = value.split('/').pop()?.replace('.git', '') || '';
                                  if (!form.getValues('name')) {
                                    form.setValue('name', repoName);
                                  }
                                }}
                                value={field.value || ""}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-github-repository">
                                    <SelectValue placeholder="Choose a repository" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {repositories && repositories.length > 0 ? (
                                    repositories.map((repo: any) => (
                                      <SelectItem key={repo.id} value={repo.clone_url}>
                                        <div className="flex items-center space-x-2">
                                          <i className="fab fa-github text-sm"></i>
                                          <span>{repo.name}</span>
                                          {repo.private && <i className="fas fa-lock text-xs text-muted-foreground"></i>}
                                        </div>
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="no-repos" disabled>
                                      {repositories === undefined ? 'Loading repositories...' : 'No repositories found'}
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <FormField
                          control={form.control}
                          name="repositoryUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Repository URL</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="https://github.com/username/repo" 
                                  {...field} 
                                  value={field.value || ""}
                                  data-testid="input-repository-url"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                    <FormField
                      control={form.control}
                      name="repositoryProvider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Repository Provider</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || "github"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-repository-provider">
                                <SelectValue placeholder="Select provider" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="github">GitHub</SelectItem>
                              <SelectItem value="gitlab">GitLab</SelectItem>
                              <SelectItem value="bitbucket">Bitbucket</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                        data-testid="button-cancel-project"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createProjectMutation.isPending}
                        data-testid="button-submit-project"
                      >
                        {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading projects...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {!projects || projects.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-project-diagram text-2xl text-muted-foreground"></i>
                  </div>
                  <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first project to get started with DevSecFlow
                  </p>
                  <Button 
                    onClick={() => setIsDialogOpen(true)}
                    data-testid="button-create-first-project"
                  >
                    Create Your First Project
                  </Button>
                </div>
              ) : (
                (projects || []).map((project: any) => (
                  <Card key={project.id} className="hover:shadow-lg transition-shadow" data-testid={`card-project-${project.id}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg" data-testid={`text-project-name-${project.id}`}>
                          {project.name}
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                          {project.repositoryProvider === 'github' && (
                            <i className="fab fa-github text-muted-foreground"></i>
                          )}
                          {project.repositoryProvider === 'gitlab' && (
                            <i className="fab fa-gitlab text-muted-foreground"></i>
                          )}
                          {project.repositoryProvider === 'bitbucket' && (
                            <i className="fab fa-bitbucket text-muted-foreground"></i>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4" data-testid={`text-project-description-${project.id}`}>
                        {project.description || "No description provided"}
                      </p>
                      {project.repositoryUrl && (
                        <p className="text-xs text-muted-foreground mb-4 truncate" data-testid={`text-repository-url-${project.id}`}>
                          {project.repositoryUrl}
                        </p>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          Created {new Date(project.createdAt).toLocaleDateString()}
                        </span>
                        <div className="flex space-x-2">
                          <Link href={`/projects/${project.id}`}>
                            <Button size="sm" variant="outline" data-testid={`button-view-project-${project.id}`}>
                              <i className="fas fa-eye mr-1"></i>
                              View
                            </Button>
                          </Link>
                          <Button size="sm" data-testid={`button-edit-project-${project.id}`}>
                            <i className="fas fa-edit mr-1"></i>
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
