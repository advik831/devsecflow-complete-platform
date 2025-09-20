import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { 
  insertProjectSchema, 
  insertPipelineSchema, 
  insertPipelineTemplateSchema,
  insertKubernetesClusterSchema,
  insertSecurityScanSchema 
} from "@shared/schema";
import { getRepositories, getRepository, getBranches, getCommits, getUserProfile } from "./githubClient";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  // Note: /api/user route is now handled directly in auth.ts

  // GitHub integration routes
  app.get('/api/github/repositories', isAuthenticated, async (req, res) => {
    try {
      const repositories = await getRepositories();
      res.json(repositories);
    } catch (error) {
      console.error("Error fetching repositories:", error);
      const errorMsg = (error as any)?.message ?? String(error);
      if (errorMsg.includes('not configured') || errorMsg.includes('not connected')) {
        res.status(200).json([]);
      } else {
        res.status(500).json({ message: "Failed to fetch repositories" });
      }
    }
  });

  app.get('/api/github/repository/:owner/:repo', isAuthenticated, async (req, res) => {
    const { owner, repo } = req.params;
    try {
      const repository = await getRepository(owner, repo);
      res.json(repository);
    } catch (error) {
      console.error("Error fetching repository:", error);
      const errorMsg = (error as any)?.message ?? String(error);
      if (errorMsg.includes('not configured') || errorMsg.includes('not connected')) {
        res.status(200).json({ name: `${owner}/${repo}`, message: 'GitHub integration not configured' });
      } else {
        res.status(500).json({ message: "Failed to fetch repository" });
      }
    }
  });

  app.get('/api/github/repository/:owner/:repo/branches', isAuthenticated, async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const branches = await getBranches(owner, repo);
      res.json(branches);
    } catch (error) {
      console.error("Error fetching branches:", error);
      const errorMsg = (error as any)?.message ?? String(error);
      if (errorMsg.includes('not configured') || errorMsg.includes('not connected')) {
        res.status(200).json([]);
      } else {
        res.status(500).json({ message: "Failed to fetch branches" });
      }
    }
  });

  app.get('/api/github/profile', isAuthenticated, async (req, res) => {
    try {
      const profile = await getUserProfile();
      res.json(profile);
    } catch (error) {
      console.error("Error fetching GitHub profile:", error);
      const errorMsg = (error as any)?.message ?? String(error);
      if (errorMsg.includes('not configured') || errorMsg.includes('not connected')) {
        res.status(200).json({ login: null, name: 'GitHub Not Configured', bio: null });
      } else {
        res.status(500).json({ message: "Failed to fetch GitHub profile" });
      }
    }
  });

  app.get('/api/github/repository/:owner/:repo/commits', isAuthenticated, async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const commits = await getCommits(owner, repo);
      res.json(commits);
    } catch (error) {
      console.error("Error fetching commits:", error);
      const errorMsg = (error as any)?.message ?? String(error);
      if (errorMsg.includes('not configured') || errorMsg.includes('not connected')) {
        res.status(200).json([]);
      } else {
        res.status(500).json({ message: "Failed to fetch commits" });
      }
    }
  });

  // Project routes
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const projects = await storage.getUserProjects(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject({ ...projectData, userId });
      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.put('/api/projects/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const projectData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, projectData);
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete('/api/projects/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProject(id);
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Pipeline routes
  app.get('/api/projects/:projectId/pipelines', isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const pipelines = await storage.getProjectPipelines(projectId);
      res.json(pipelines);
    } catch (error) {
      console.error("Error fetching pipelines:", error);
      res.status(500).json({ message: "Failed to fetch pipelines" });
    }
  });

  app.post('/api/pipelines', isAuthenticated, async (req, res) => {
    try {
      const pipelineData = insertPipelineSchema.parse(req.body);
      const pipeline = await storage.createPipeline(pipelineData);
      res.json(pipeline);
    } catch (error) {
      console.error("Error creating pipeline:", error);
      res.status(500).json({ message: "Failed to create pipeline" });
    }
  });

  app.get('/api/pipelines/recent', isAuthenticated, async (req, res) => {
    try {
      const runs = await storage.getRecentPipelineRuns(10);
      res.json(runs);
    } catch (error) {
      console.error("Error fetching recent pipeline runs:", error);
      res.status(500).json({ message: "Failed to fetch recent pipeline runs" });
    }
  });

  // Pipeline template routes
  app.get('/api/pipeline-templates', isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getPipelineTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching pipeline templates:", error);
      res.status(500).json({ message: "Failed to fetch pipeline templates" });
    }
  });

  app.post('/api/pipeline-templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const templateData = insertPipelineTemplateSchema.parse(req.body);
      const template = await storage.createPipelineTemplate({ ...templateData, userId });
      res.json(template);
    } catch (error) {
      console.error("Error creating pipeline template:", error);
      res.status(500).json({ message: "Failed to create pipeline template" });
    }
  });

  // Kubernetes cluster routes
  app.get('/api/kubernetes/clusters', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const clusters = await storage.getUserClusters(userId);
      res.json(clusters);
    } catch (error) {
      console.error("Error fetching clusters:", error);
      res.status(500).json({ message: "Failed to fetch clusters" });
    }
  });

  app.post('/api/kubernetes/clusters', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const clusterData = insertKubernetesClusterSchema.parse(req.body);
      const cluster = await storage.createCluster({ ...clusterData, userId });
      res.json(cluster);
    } catch (error) {
      console.error("Error creating cluster:", error);
      res.status(500).json({ message: "Failed to create cluster" });
    }
  });

  app.put('/api/kubernetes/clusters/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const clusterData = insertKubernetesClusterSchema.partial().parse(req.body);
      const cluster = await storage.updateCluster(id, clusterData);
      res.json(cluster);
    } catch (error) {
      console.error("Error updating cluster:", error);
      res.status(500).json({ message: "Failed to update cluster" });
    }
  });

  // Security scan routes
  app.get('/api/security/summary', isAuthenticated, async (req, res) => {
    try {
      const summary = await storage.getSecurityScansSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching security summary:", error);
      res.status(500).json({ message: "Failed to fetch security summary" });
    }
  });

  app.get('/api/projects/:projectId/security/scans', isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const scans = await storage.getProjectSecurityScans(projectId);
      res.json(scans);
    } catch (error) {
      console.error("Error fetching security scans:", error);
      res.status(500).json({ message: "Failed to fetch security scans" });
    }
  });

  app.post('/api/security/scans', isAuthenticated, async (req, res) => {
    try {
      const scanData = insertSecurityScanSchema.parse(req.body);
      const scan = await storage.createSecurityScan(scanData);
      res.json(scan);
    } catch (error) {
      console.error("Error creating security scan:", error);
      res.status(500).json({ message: "Failed to create security scan" });
    }
  });

  // Artifact routes
  app.get('/api/projects/:projectId/artifacts', isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const artifacts = await storage.getProjectArtifacts(projectId);
      res.json(artifacts);
    } catch (error) {
      console.error("Error fetching artifacts:", error);
      res.status(500).json({ message: "Failed to fetch artifacts" });
    }
  });

  // Dashboard stats route
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const [projects, clusters, securitySummary, recentRuns] = await Promise.all([
        storage.getUserProjects(userId),
        storage.getUserClusters(userId),
        storage.getSecurityScansSummary(),
        storage.getRecentPipelineRuns(5)
      ]);

      const activePipelines = recentRuns.filter(run => run.status === 'running').length;
      const failedBuilds = recentRuns.filter(run => run.status === 'failed').length;
      const totalDeployments = recentRuns.filter(run => run.status === 'success').length;

      const stats = {
        activePipelines,
        failedBuilds,
        securityIssues: securitySummary.critical + securitySummary.high,
        deployments: totalDeployments,
        projects: projects.length,
        clusters: clusters.length
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
