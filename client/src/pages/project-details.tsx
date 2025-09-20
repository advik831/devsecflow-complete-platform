import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  
  const { data: project, isLoading, error } = useQuery({
    queryKey: ['/api/projects', id],
    enabled: !!id
  });

  const { data: githubProfile } = useQuery({
    queryKey: ['/api/github/profile'],
    retry: false
  });

  // Extract owner and repo from project URL for GitHub API calls
  const getGitHubRepoDetails = (url: string) => {
    if (!url) return null;
    // Handle various GitHub URL formats: https://github.com/owner/repo, with/without .git, with/without trailing slash
    const match = url.match(/github\.com\/([^/]+)\/([^/.]+?)(\.git)?(\/$)?$/);
    return match ? { owner: match[1], repo: match[2] } : null;
  };

  const repoDetails = project?.repositoryUrl ? getGitHubRepoDetails(project.repositoryUrl) : null;

  const { data: repositoryInfo } = useQuery({
    queryKey: [`/api/github/repository/${repoDetails?.owner}/${repoDetails?.repo}`],
    enabled: !!repoDetails && githubProfile?.login,
    retry: false
  });

  const { data: branches } = useQuery({
    queryKey: [`/api/github/repository/${repoDetails?.owner}/${repoDetails?.repo}/branches`],
    enabled: !!repoDetails && githubProfile?.login,
    retry: false
  });

  const { data: commits } = useQuery({
    queryKey: [`/api/github/repository/${repoDetails?.owner}/${repoDetails?.repo}/commits`],
    enabled: !!repoDetails && githubProfile?.login,
    retry: false
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <div className="flex-1 p-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-8 w-64 mb-2" />
                  <Skeleton className="h-4 w-96" />
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-20" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <div className="flex-1 p-8">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-exclamation-triangle text-2xl text-muted-foreground"></i>
              </div>
              <h2 className="text-2xl font-semibold mb-2">Project Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The project you're looking for doesn't exist or has been deleted.
              </p>
              <Link href="/projects">
                <Button>
                  <i className="fas fa-arrow-left mr-2"></i>
                  Back to Projects
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getProviderIcon = (provider: string) => {
    switch (provider?.toLowerCase()) {
      case 'github':
        return 'fab fa-github';
      case 'gitlab':
        return 'fab fa-gitlab';
      case 'bitbucket':
        return 'fab fa-bitbucket';
      default:
        return 'fas fa-code-branch';
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider?.toLowerCase()) {
      case 'github':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'gitlab':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200';
      case 'bitbucket':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-4">
                  <Link href="/projects">
                    <Button variant="ghost" size="sm" data-testid="button-back-projects">
                      <i className="fas fa-arrow-left mr-2"></i>
                      Projects
                    </Button>
                  </Link>
                  <div>
                    <h1 className="text-3xl font-bold" data-testid="text-project-name">
                      {project.name}
                    </h1>
                    <p className="text-muted-foreground" data-testid="text-project-description">
                      {project.description || "No description provided"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" data-testid="button-edit-project">
                  <i className="fas fa-edit mr-2"></i>
                  Edit Project
                </Button>
                <Button data-testid="button-run-pipeline">
                  <i className="fas fa-play mr-2"></i>
                  Run Pipeline
                </Button>
              </div>
            </div>

            {/* Project Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Repository Information */}
              <Card data-testid="card-repository-info">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <i className={`${getProviderIcon(project.repositoryProvider)} mr-2`}></i>
                    Repository
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className={getProviderColor(project.repositoryProvider)}>
                        {project.repositoryProvider || 'Unknown'}
                      </Badge>
                    </div>
                    {project.repositoryUrl ? (
                      <a 
                        href={project.repositoryUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline dark:text-blue-400 break-all"
                        data-testid="link-repository-url"
                      >
                        {project.repositoryUrl}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">No repository URL configured</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* GitHub Repository Details */}
              <Card data-testid="card-github-integration">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <i className="fab fa-github mr-2"></i>
                    GitHub Repository
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {githubProfile && githubProfile.name && githubProfile.name !== 'GitHub Not Configured' && repositoryInfo ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200">
                          Connected
                        </Badge>
                        <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                          {repositoryInfo.stargazers_count !== undefined && (
                            <div className="flex items-center space-x-1">
                              <i className="fas fa-star text-yellow-500"></i>
                              <span data-testid="text-repo-stars">{repositoryInfo.stargazers_count}</span>
                            </div>
                          )}
                          {repositoryInfo.forks_count !== undefined && (
                            <div className="flex items-center space-x-1">
                              <i className="fas fa-code-branch"></i>
                              <span data-testid="text-repo-forks">{repositoryInfo.forks_count}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm">
                          <strong data-testid="text-repo-name">{repositoryInfo.full_name}</strong>
                        </p>
                        {repositoryInfo.description && (
                          <p className="text-sm text-muted-foreground" data-testid="text-repo-description">
                            {repositoryInfo.description}
                          </p>
                        )}
                      </div>

                      {repositoryInfo.language && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">Primary language:</span>
                          <Badge variant="secondary" data-testid="badge-repo-language">
                            {repositoryInfo.language}
                          </Badge>
                        </div>
                      )}

                      {branches && branches.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-sm text-muted-foreground">Branches ({branches.length}):</span>
                          <div className="flex flex-wrap gap-1">
                            {branches.slice(0, 3).map((branch: any) => (
                              <Badge 
                                key={branch.name} 
                                variant="outline" 
                                className="text-xs"
                                data-testid={`badge-branch-${branch.name}`}
                              >
                                {branch.name}
                                {branch.name === repositoryInfo.default_branch && (
                                  <i className="fas fa-check-circle ml-1 text-xs text-green-500"></i>
                                )}
                              </Badge>
                            ))}
                            {branches.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{branches.length - 3} more</Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <span>Last updated:</span>
                        <span data-testid="text-repo-updated">
                          {repositoryInfo.updated_at ? new Date(repositoryInfo.updated_at).toLocaleDateString() : 'Unknown'}
                        </span>
                      </div>
                    </div>
                  ) : repoDetails ? (
                    <div className="space-y-2">
                      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200">
                        GitHub Not Connected
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        Connect your GitHub account to see repository details
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        No Repository
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        No GitHub repository configured for this project
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Project Status */}
              <Card data-testid="card-project-status">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <i className="fas fa-info-circle mr-2"></i>
                    Project Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Created</span>
                    <span className="text-sm" data-testid="text-created-date">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">ID</span>
                    <span className="text-sm font-mono" data-testid="text-project-id">
                      {project.id}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Commits */}
            <Card data-testid="card-recent-commits">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-code-commit mr-2"></i>
                  Recent Commits
                </CardTitle>
              </CardHeader>
              <CardContent>
                {commits && commits.length > 0 ? (
                  <div className="space-y-3">
                    {commits.slice(0, 5).map((commit: any) => (
                      <div 
                        key={commit.sha} 
                        className="flex items-start space-x-3 p-3 bg-muted/20 rounded-md"
                        data-testid={`commit-${commit.sha?.slice(0, 7)}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-code-commit text-sm text-primary"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" data-testid={`commit-message-${commit.sha?.slice(0, 7)}`}>
                            {commit.commit?.message?.split('\n')[0] ?? 'No message'}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                            <span data-testid={`commit-author-${commit.sha?.slice(0, 7)}`}>
                              {commit.commit?.author?.name ?? 'Unknown'}
                            </span>
                            <span>•</span>
                            <span data-testid={`commit-date-${commit.sha?.slice(0, 7)}`}>
                              {commit.commit?.author?.date ? new Date(commit.commit.author.date).toLocaleDateString() : 'Unknown'}
                            </span>
                            <span>•</span>
                            <code className="text-xs bg-muted px-1 rounded" data-testid={`commit-sha-${commit.sha?.slice(0, 7)}`}>
                              {commit.sha?.slice(0, 7)}
                            </code>
                          </div>
                        </div>
                      </div>
                    ))}
                    {commits.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">+{commits.length - 5} more commits</p>
                    )}
                  </div>
                ) : commits?.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                      <i className="fas fa-code-commit text-lg text-muted-foreground"></i>
                    </div>
                    <p className="text-sm text-muted-foreground">No commits found</p>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-sm text-muted-foreground">Loading commits...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}