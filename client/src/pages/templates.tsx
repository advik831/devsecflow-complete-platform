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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPipelineTemplateSchema } from "@shared/schema";
import { z } from "zod";
import { useLocation } from "wouter";

const templateFormSchema = insertPipelineTemplateSchema.extend({
  name: z.string().min(1, "Template name is required"),
  config: z.object({
    stages: z.array(z.object({
      name: z.string(),
      type: z.string(),
      config: z.record(z.any())
    }))
  })
});

const defaultTemplates = [
  {
    name: "Node.js CI/CD",
    description: "Complete pipeline for Node.js applications with testing, building, and deployment",
    category: "frontend",
    icon: "fab fa-node-js",
    color: "text-success",
    stages: ["Source", "Install", "Test", "Build", "Security", "Deploy"]
  },
  {
    name: "Docker Build & Push",
    description: "Build Docker images with security scanning and push to registry",
    category: "container",
    icon: "fab fa-docker",
    color: "text-primary",
    stages: ["Source", "Build", "Security Scan", "Registry Push"]
  },
  {
    name: "Python FastAPI",
    description: "Pipeline for Python FastAPI applications with pytest and deployment",
    category: "backend",
    icon: "fab fa-python",
    color: "text-warning",
    stages: ["Source", "Install", "Lint", "Test", "Build", "Deploy"]
  },
  {
    name: "React SPA",
    description: "Single Page Application pipeline with build optimization and CDN deployment",
    category: "frontend",
    icon: "fab fa-react",
    color: "text-primary",
    stages: ["Source", "Install", "Test", "Build", "Deploy to CDN"]
  },
  {
    name: "Spring Boot",
    description: "Java Spring Boot application with Maven, testing, and Kubernetes deployment",
    category: "backend",
    icon: "fas fa-coffee",
    color: "text-destructive",
    stages: ["Source", "Maven Build", "Test", "Package", "Deploy to K8s"]
  },
  {
    name: "Microservice Template",
    description: "Multi-service pipeline with service mesh deployment and monitoring",
    category: "microservice",
    icon: "fas fa-cubes",
    color: "text-success",
    stages: ["Source", "Build Services", "Integration Test", "Deploy", "Monitor"]
  }
];

export default function Templates() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [, setLocation] = useLocation();

  const handleUseTemplate = (templateName: string) => {
    // Store selected template in localStorage to pass to pipelines page
    localStorage.setItem('selectedTemplate', templateName);
    toast({
      title: "Template Selected",
      description: `Using ${templateName} template for pipeline creation`,
    });
    // Navigate to pipelines page where the template creation dialog will open
    setLocation('/pipelines');
  };

  const form = useForm<z.infer<typeof templateFormSchema>>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      isPublic: true,
      config: {
        stages: []
      }
    },
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ["/api/pipeline-templates"],
    enabled: isAuthenticated,
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof templateFormSchema>) => {
      await apiRequest("POST", "/api/pipeline-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-templates"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Pipeline template created successfully",
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
        description: "Failed to create template",
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

  const categories = [
    { value: "all", label: "All Templates" },
    { value: "frontend", label: "Frontend" },
    { value: "backend", label: "Backend" },
    { value: "fullstack", label: "Full Stack" },
    { value: "microservice", label: "Microservices" },
    { value: "container", label: "Container" },
  ];

  const filteredTemplates = selectedCategory === "all" 
    ? defaultTemplates 
    : defaultTemplates.filter(template => template.category === selectedCategory);

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title="Templates" />
        
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold" data-testid="text-templates-title">Pipeline Templates</h2>
              <p className="text-muted-foreground">Reusable pipeline configurations for common development workflows</p>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48" data-testid="select-category-filter">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground" data-testid="button-create-template">
                    <i className="fas fa-plus mr-2"></i>
                    New Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Create Pipeline Template</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => createTemplateMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Template Name</FormLabel>
                            <FormControl>
                              <Input placeholder="My Custom Pipeline" {...field} data-testid="input-template-name" />
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
                                placeholder="Describe your pipeline template..." 
                                {...field} 
                                data-testid="input-template-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-template-category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="frontend">Frontend</SelectItem>
                                <SelectItem value="backend">Backend</SelectItem>
                                <SelectItem value="fullstack">Full Stack</SelectItem>
                                <SelectItem value="microservice">Microservices</SelectItem>
                                <SelectItem value="container">Container</SelectItem>
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
                          data-testid="button-cancel-template"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createTemplateMutation.isPending}
                          data-testid="button-submit-template"
                        >
                          {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Create Custom Template Card */}
            <Card 
              className="border-dashed border-2 hover:border-primary transition-colors cursor-pointer"
              onClick={() => setIsDialogOpen(true)}
              data-testid="card-create-custom-template"
            >
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <i className="fas fa-plus text-primary text-xl"></i>
                </div>
                <h3 className="font-medium mb-2">Create Custom Template</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Build your own reusable pipeline template
                </p>
              </CardContent>
            </Card>

            {/* Built-in Templates */}
            {filteredTemplates.map((template, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow" data-testid={`card-template-${index}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center text-lg">
                      <i className={`${template.icon} ${template.color} mr-2`}></i>
                      <span data-testid={`text-template-name-${index}`}>{template.name}</span>
                    </CardTitle>
                    <Badge variant="outline" data-testid={`badge-category-${index}`}>
                      {template.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4" data-testid={`text-template-description-${index}`}>
                    {template.description}
                  </p>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Pipeline Stages:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.stages.map((stage, stageIndex) => (
                          <Badge key={stageIndex} variant="secondary" className="text-xs">
                            {stage}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <Badge className="bg-success/10 text-success">Popular</Badge>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" data-testid={`button-preview-${index}`}>
                        <i className="fas fa-eye mr-1"></i>
                        Preview
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleUseTemplate(template.name)}
                        data-testid={`button-use-template-${index}`}
                      >
                        <i className="fas fa-play mr-1"></i>
                        Use Template
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* User Created Templates */}
            {templates?.map((template: any) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow" data-testid={`card-user-template-${template.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center text-lg">
                      <i className="fas fa-user-cog text-primary mr-2"></i>
                      <span data-testid={`text-user-template-name-${template.id}`}>{template.name}</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">Custom</Badge>
                      {template.isPublic && <Badge variant="outline">Public</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4" data-testid={`text-user-template-description-${template.id}`}>
                    {template.description || "No description provided"}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      Created {new Date(template.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" data-testid={`button-edit-template-${template.id}`}>
                        <i className="fas fa-edit mr-1"></i>
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleUseTemplate(template.name)}
                        data-testid={`button-use-user-template-${template.id}`}
                      >
                        <i className="fas fa-play mr-1"></i>
                        Use
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTemplates.length === 0 && templates?.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-template text-2xl text-muted-foreground"></i>
              </div>
              <h3 className="text-lg font-medium mb-2">No templates found</h3>
              <p className="text-muted-foreground mb-4">
                No templates match your current filter. Try selecting a different category.
              </p>
              <Button onClick={() => setSelectedCategory("all")} data-testid="button-show-all">
                Show All Templates
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
