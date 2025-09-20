import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-rocket text-primary-foreground text-sm"></i>
            </div>
            <span className="font-bold text-xl">DevSecFlow</span>
          </div>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="bg-primary text-primary-foreground hover:opacity-90"
            data-testid="button-login"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl font-bold mb-6">
            DevOps & DevSecOps <span className="text-primary">Simplified</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Complete lifecycle management platform with CI/CD pipelines, security scanning, 
            and Kubernetes cluster management. Built for modern development teams.
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/api/login'}
              className="bg-primary text-primary-foreground hover:opacity-90"
              data-testid="button-get-started"
            >
              Get Started
              <i className="fas fa-arrow-right ml-2"></i>
            </Button>
            <Button size="lg" variant="outline" data-testid="button-learn-more">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Powerful Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <i className="fas fa-code-branch text-primary text-xl"></i>
                </div>
                <CardTitle>CI/CD Pipelines</CardTitle>
                <CardDescription>
                  Visual pipeline builder with drag-and-drop interface and extensive template library
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-4">
                  <i className="fas fa-shield-alt text-success text-xl"></i>
                </div>
                <CardTitle>Security Scanning</CardTitle>
                <CardDescription>
                  Integrated SAST/DAST tools with dependency vulnerability scanning
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mb-4">
                  <i className="fas fa-dharmachakra text-warning text-xl"></i>
                </div>
                <CardTitle>Kubernetes Management</CardTitle>
                <CardDescription>
                  Connect and manage multiple K8s clusters across cloud and on-premises
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <i className="fab fa-github text-primary text-xl"></i>
                </div>
                <CardTitle>SCM Integration</CardTitle>
                <CardDescription>
                  Seamless integration with GitHub and other source control management tools
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mb-4">
                  <i className="fas fa-cube text-destructive text-xl"></i>
                </div>
                <CardTitle>Artifact Management</CardTitle>
                <CardDescription>
                  Track and manage build artifacts with version control and deployment history
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-4">
                  <i className="fas fa-rocket text-success text-xl"></i>
                </div>
                <CardTitle>Deploy Anywhere</CardTitle>
                <CardDescription>
                  Support for cloud and on-premises deployments with automated scaling
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Transform Your DevOps?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of teams already using DevSecFlow to streamline their development lifecycle.
          </p>
          <Button 
            size="lg" 
            onClick={() => window.location.href = '/api/login'}
            className="bg-primary text-primary-foreground hover:opacity-90"
            data-testid="button-start-free"
          >
            Start Free Today
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2024 DevSecFlow. Built with modern web technologies.</p>
        </div>
      </footer>
    </div>
  );
}
