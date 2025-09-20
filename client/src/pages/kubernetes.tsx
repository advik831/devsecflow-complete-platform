import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertKubernetesClusterSchema } from "@shared/schema";
import { z } from "zod";

const clusterFormSchema = insertKubernetesClusterSchema.extend({
  name: z.string().min(1, "Cluster name is required"),
});

export default function Kubernetes() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<any>(null);

  const form = useForm<z.infer<typeof clusterFormSchema>>({
    resolver: zodResolver(clusterFormSchema),
    defaultValues: {
      name: "",
      provider: "",
      endpoint: "",
      region: "",
      nodeCount: 3,
    },
  });

  const { data: clusters, isLoading } = useQuery({
    queryKey: ["/api/kubernetes/clusters"],
    enabled: isAuthenticated,
  });

  const createClusterMutation = useMutation({
    mutationFn: async (data: z.infer<typeof clusterFormSchema>) => {
      await apiRequest("POST", "/api/kubernetes/clusters", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kubernetes/clusters"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Cluster connection added successfully",
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
        description: "Failed to add cluster connection",
        variant: "destructive",
      });
    },
  });

  const handleViewCluster = (cluster: any) => {
    setSelectedCluster(cluster);
    setIsDetailsOpen(true);
  };

  const handleManageCluster = (cluster: any) => {
    toast({
      title: "Manage Cluster",
      description: `Opening management interface for ${cluster.name}`,
    });
    // In a real implementation, this would navigate to a management page
    // or open advanced management tools
  };

  const getHealthColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy': return 'bg-green-500/10 text-green-500';
      case 'warning': return 'bg-yellow-500/10 text-yellow-500';
      case 'unhealthy': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
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
      case 'healthy': return 'bg-success/10 text-success';
      case 'warning': return 'bg-warning/10 text-warning';
      case 'error': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted/10 text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return 'fas fa-check-circle';
      case 'warning': return 'fas fa-exclamation-triangle';
      case 'error': return 'fas fa-times-circle';
      default: return 'fas fa-question-circle';
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider?.toLowerCase()) {
      case 'aws': return 'fab fa-aws';
      case 'gcp': case 'google': return 'fab fa-google';
      case 'azure': return 'fab fa-microsoft';
      case 'local': return 'fas fa-server';
      default: return 'fas fa-dharmachakra';
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title="Kubernetes" />
        
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold" data-testid="text-kubernetes-title">Kubernetes Clusters</h2>
              <p className="text-muted-foreground">Manage and monitor your Kubernetes cluster connections</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground" data-testid="button-add-cluster">
                  <i className="fas fa-plus mr-2"></i>
                  Add Cluster
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Kubernetes Cluster</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => createClusterMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cluster Name</FormLabel>
                          <FormControl>
                            <Input placeholder="production-cluster" {...field} data-testid="input-cluster-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="provider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provider</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || "aws"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-cluster-provider">
                                <SelectValue placeholder="Select provider" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="aws">Amazon EKS</SelectItem>
                              <SelectItem value="gcp">Google GKE</SelectItem>
                              <SelectItem value="azure">Azure AKS</SelectItem>
                              <SelectItem value="local">Local/On-premises</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endpoint"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Endpoint</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://k8s-api.example.com" 
                              {...field} 
                              value={field.value || ""}
                              data-testid="input-cluster-endpoint"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Region</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="us-west-2" 
                                {...field} 
                                value={field.value || ""}
                                data-testid="input-cluster-region"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="nodeCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Node Count</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="3" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
                                data-testid="input-cluster-nodes"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                        data-testid="button-cancel-cluster"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createClusterMutation.isPending}
                        data-testid="button-submit-cluster"
                      >
                        {createClusterMutation.isPending ? "Adding..." : "Add Cluster"}
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
              <p className="text-muted-foreground">Loading clusters...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {!clusters || clusters.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-dharmachakra text-2xl text-muted-foreground"></i>
                  </div>
                  <h3 className="text-lg font-medium mb-2">No clusters connected</h3>
                  <p className="text-muted-foreground mb-4">
                    Connect your first Kubernetes cluster to start managing deployments
                  </p>
                  <Button 
                    onClick={() => setIsDialogOpen(true)}
                    data-testid="button-add-first-cluster"
                  >
                    Add Your First Cluster
                  </Button>
                </div>
              ) : (
                <>
                  {(clusters || []).map((cluster: any) => (
                    <Card key={cluster.id} className="hover:shadow-lg transition-shadow" data-testid={`card-cluster-${cluster.id}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center text-lg">
                            <i className={`${getProviderIcon(cluster.provider)} mr-2 text-primary`}></i>
                            <span data-testid={`text-cluster-name-${cluster.id}`}>{cluster.name}</span>
                          </CardTitle>
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${cluster.status === 'healthy' ? 'bg-success' : cluster.status === 'warning' ? 'bg-warning' : 'bg-muted'}`}></div>
                            <Badge className={getStatusColor(cluster.status || 'unknown')} data-testid={`badge-status-${cluster.id}`}>
                              <i className={`${getStatusIcon(cluster.status || 'unknown')} mr-1`}></i>
                              {cluster.status || 'Unknown'}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Provider:</span>
                            <span data-testid={`text-provider-${cluster.id}`}>
                              {cluster.provider === 'aws' ? 'Amazon EKS' :
                               cluster.provider === 'gcp' ? 'Google GKE' :
                               cluster.provider === 'azure' ? 'Azure AKS' :
                               cluster.provider === 'local' ? 'Local/On-premises' :
                               cluster.provider}
                            </span>
                          </div>
                          {cluster.region && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Region:</span>
                              <span data-testid={`text-region-${cluster.id}`}>{cluster.region}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Nodes:</span>
                            <span data-testid={`text-nodes-${cluster.id}`}>{cluster.nodeCount || 'Unknown'}</span>
                          </div>
                          {cluster.endpoint && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Endpoint:</span>
                              <span className="text-xs truncate max-w-32" data-testid={`text-endpoint-${cluster.id}`}>
                                {cluster.endpoint}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between items-center mt-4">
                          <span className="text-xs text-muted-foreground">
                            Added {new Date(cluster.createdAt).toLocaleDateString()}
                          </span>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleViewCluster(cluster)}
                              data-testid={`button-view-cluster-${cluster.id}`}
                            >
                              <i className="fas fa-eye mr-1"></i>
                              View
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => handleManageCluster(cluster)}
                              data-testid={`button-manage-cluster-${cluster.id}`}
                            >
                              <i className="fas fa-cog mr-1"></i>
                              Manage
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Add New Cluster Card */}
                  <Card 
                    className="border-dashed border-2 hover:border-primary transition-colors cursor-pointer"
                    onClick={() => setIsDialogOpen(true)}
                    data-testid="card-add-cluster"
                  >
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                        <i className="fas fa-plus text-primary text-xl"></i>
                      </div>
                      <h3 className="font-medium mb-2">Add New Cluster</h3>
                      <p className="text-sm text-muted-foreground text-center">
                        Connect another Kubernetes cluster
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Cluster Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle data-testid="text-cluster-details-title">
              {selectedCluster?.name} - Cluster Details
            </DialogTitle>
          </DialogHeader>
          {selectedCluster && (
            <div className="space-y-6">
              {/* Cluster Status */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Cluster Status</h3>
                  <p className="text-sm text-muted-foreground">Current health and connectivity</p>
                </div>
                <Badge className={getHealthColor(selectedCluster.status || 'unknown')} data-testid="badge-cluster-status">
                  <i className="fas fa-circle mr-2 text-xs"></i>
                  {selectedCluster.status || 'Unknown'}
                </Badge>
              </div>

              {/* Cluster Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Provider</h4>
                  <p className="text-sm" data-testid="text-details-provider">
                    {selectedCluster.provider === 'aws' ? 'Amazon EKS' :
                     selectedCluster.provider === 'gcp' ? 'Google GKE' :
                     selectedCluster.provider === 'azure' ? 'Azure AKS' :
                     selectedCluster.provider === 'local' ? 'Local/On-premises' :
                     selectedCluster.provider}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Region</h4>
                  <p className="text-sm" data-testid="text-details-region">{selectedCluster.region || 'N/A'}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Node Count</h4>
                  <p className="text-sm" data-testid="text-details-nodes">{selectedCluster.nodeCount || 'Unknown'}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Added</h4>
                  <p className="text-sm" data-testid="text-details-created">
                    {new Date(selectedCluster.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Endpoint Information */}
              {selectedCluster.endpoint && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">API Endpoint</h4>
                  <div className="bg-muted/30 rounded-md p-3">
                    <code className="text-sm break-all" data-testid="text-details-endpoint">
                      {selectedCluster.endpoint}
                    </code>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDetailsOpen(false)}
                  data-testid="button-close-details"
                >
                  Close
                </Button>
                <Button 
                  onClick={() => handleManageCluster(selectedCluster)}
                  data-testid="button-manage-from-details"
                >
                  <i className="fas fa-cog mr-2"></i>
                  Manage Cluster
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
