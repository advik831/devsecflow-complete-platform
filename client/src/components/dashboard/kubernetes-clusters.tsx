import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function KubernetesClusters() {
  const { isAuthenticated } = useAuth();

  const { data: clusters, isLoading } = useQuery({
    queryKey: ["/api/kubernetes/clusters"],
    enabled: isAuthenticated,
  });

  const getProviderIcon = (provider: string) => {
    switch (provider?.toLowerCase()) {
      case 'aws': return 'fab fa-aws';
      case 'gcp': case 'google': return 'fab fa-google';
      case 'azure': return 'fab fa-microsoft';
      case 'local': return 'fas fa-server';
      default: return 'fas fa-dharmachakra';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-success';
      case 'warning': return 'bg-warning';
      case 'error': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  return (
    <Card data-testid="kubernetes-clusters">
      <CardHeader>
        <CardTitle className="text-lg">Kubernetes Clusters</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading clusters...</p>
          </div>
        ) : !clusters || clusters.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-dharmachakra text-muted-foreground"></i>
            </div>
            <p className="text-sm font-medium mb-2">No clusters connected</p>
            <p className="text-xs text-muted-foreground mb-4">
              Connect your Kubernetes clusters to manage deployments
            </p>
            <Button size="sm" data-testid="button-add-cluster">
              Add Cluster
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {(clusters || []).slice(0, 3).map((cluster: any) => (
              <div 
                key={cluster.id} 
                className="flex items-center justify-between p-3 border border-border rounded-lg"
                data-testid={`cluster-${cluster.id}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(cluster.status || 'unknown')}`}></div>
                  <div>
                    <h4 className="text-sm font-medium flex items-center">
                      <i className={`${getProviderIcon(cluster.provider)} mr-2 text-primary`}></i>
                      <span data-testid={`cluster-name-${cluster.id}`}>{cluster.name}</span>
                    </h4>
                    <p className="text-xs text-muted-foreground" data-testid={`cluster-details-${cluster.id}`}>
                      {cluster.provider === 'aws' ? 'Amazon EKS' :
                       cluster.provider === 'gcp' ? 'Google GKE' :
                       cluster.provider === 'azure' ? 'Azure AKS' :
                       cluster.provider === 'local' ? 'Local/On-premises' :
                       cluster.provider} • {cluster.nodeCount || 'Unknown'} nodes
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" data-testid={`button-view-cluster-${cluster.id}`}>
                  View
                </Button>
              </div>
            ))}
            
            <Button 
              variant="outline" 
              className="w-full p-3 border-2 border-dashed border-border text-center text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              data-testid="button-add-new-cluster"
            >
              <i className="fas fa-plus mr-2"></i>Add New Cluster
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
