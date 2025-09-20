import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function Artifacts() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedProject, setSelectedProject] = useState<string>("all");

  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  const { data: artifacts, isLoading } = useQuery({
    queryKey: ["/api/projects", selectedProject, "artifacts"],
    enabled: isAuthenticated && selectedProject !== "all",
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

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'docker-image': return 'fab fa-docker';
      case 'jar': case 'war': return 'fas fa-file-archive';
      case 'zip': case 'tar': return 'fas fa-file-archive';
      case 'binary': return 'fas fa-file-code';
      default: return 'fas fa-cube';
    }
  };

  const formatFileSize = (size: string) => {
    if (!size) return 'Unknown';
    return size;
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title="Artifacts" />
        
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold" data-testid="text-artifacts-title">Build Artifacts</h2>
              <p className="text-muted-foreground">Track and manage your build artifacts and deployment packages</p>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-48" data-testid="select-project-filter">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects?.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="bg-primary text-primary-foreground" data-testid="button-upload-artifact">
                <i className="fas fa-upload mr-2"></i>
                Upload Artifact
              </Button>
            </div>
          </div>

          <Tabs defaultValue="recent" className="space-y-6">
            <TabsList>
              <TabsTrigger value="recent" data-testid="tab-recent-artifacts">Recent</TabsTrigger>
              <TabsTrigger value="by-type" data-testid="tab-by-type">By Type</TabsTrigger>
              <TabsTrigger value="by-project" data-testid="tab-by-project">By Project</TabsTrigger>
            </TabsList>

            <TabsContent value="recent" className="space-y-4">
              {selectedProject === "all" ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-cube text-2xl text-muted-foreground"></i>
                  </div>
                  <h3 className="text-lg font-medium mb-2">Select a project</h3>
                  <p className="text-muted-foreground">
                    Choose a project from the dropdown to view its artifacts
                  </p>
                </div>
              ) : isLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading artifacts...</p>
                </div>
              ) : artifacts?.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-cube text-2xl text-muted-foreground"></i>
                  </div>
                  <h3 className="text-lg font-medium mb-2">No artifacts found</h3>
                  <p className="text-muted-foreground mb-4">
                    This project doesn't have any build artifacts yet
                  </p>
                  <Button data-testid="button-create-first-artifact">
                    Upload First Artifact
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {artifacts?.map((artifact: any) => (
                    <Card key={artifact.id} className="hover:shadow-lg transition-shadow" data-testid={`card-artifact-${artifact.id}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center text-lg">
                            <i className={`${getTypeIcon(artifact.type)} mr-2 text-primary`}></i>
                            <span className="truncate" data-testid={`text-artifact-name-${artifact.id}`}>
                              {artifact.name}
                            </span>
                          </CardTitle>
                          <Badge variant="outline" data-testid={`badge-type-${artifact.id}`}>
                            {artifact.type || 'Unknown'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {artifact.version && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Version:</span>
                              <span className="font-mono" data-testid={`text-version-${artifact.id}`}>
                                {artifact.version}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Size:</span>
                            <span data-testid={`text-size-${artifact.id}`}>
                              {formatFileSize(artifact.size)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Created:</span>
                            <span data-testid={`text-created-${artifact.id}`}>
                              {new Date(artifact.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" data-testid={`button-download-${artifact.id}`}>
                              <i className="fas fa-download mr-1"></i>
                              Download
                            </Button>
                            <Button size="sm" variant="outline" data-testid={`button-info-${artifact.id}`}>
                              <i className="fas fa-info-circle mr-1"></i>
                              Info
                            </Button>
                          </div>
                          <Button size="sm" data-testid={`button-deploy-${artifact.id}`}>
                            <i className="fas fa-rocket mr-1"></i>
                            Deploy
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="by-type" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card data-testid="card-type-docker">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <i className="fab fa-docker text-primary mr-2"></i>
                      Docker Images
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">0</div>
                    <p className="text-sm text-muted-foreground">Container images</p>
                  </CardContent>
                </Card>

                <Card data-testid="card-type-archive">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <i className="fas fa-file-archive text-warning mr-2"></i>
                      Archives
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">0</div>
                    <p className="text-sm text-muted-foreground">JAR, WAR, ZIP files</p>
                  </CardContent>
                </Card>

                <Card data-testid="card-type-binary">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <i className="fas fa-file-code text-success mr-2"></i>
                      Binaries
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">0</div>
                    <p className="text-sm text-muted-foreground">Executable files</p>
                  </CardContent>
                </Card>

                <Card data-testid="card-type-other">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <i className="fas fa-cube text-muted-foreground mr-2"></i>
                      Other
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">0</div>
                    <p className="text-sm text-muted-foreground">Miscellaneous files</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="by-project" className="space-y-4">
              {projects?.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-project-diagram text-2xl text-muted-foreground"></i>
                  </div>
                  <h3 className="text-lg font-medium mb-2">No projects found</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first project to start generating artifacts
                  </p>
                  <Button data-testid="button-create-project">
                    Create Project
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects?.map((project: any) => (
                    <Card key={project.id} data-testid={`card-project-artifacts-${project.id}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center">
                            <i className="fas fa-project-diagram text-primary mr-2"></i>
                            {project.name}
                          </CardTitle>
                          <Badge variant="outline">0 artifacts</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {project.description || "No description provided"}
                        </p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">
                            Last updated: {new Date(project.updatedAt).toLocaleDateString()}
                          </span>
                          <Button size="sm" data-testid={`button-view-project-artifacts-${project.id}`}>
                            View Artifacts
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
