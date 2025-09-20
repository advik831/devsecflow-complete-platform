import {
  users,
  projects,
  pipelines,
  pipelineRuns,
  pipelineTemplates,
  kubernetesClusters,
  securityScans,
  artifacts,
  type User,
  type InsertUser,
  type Project,
  type InsertProject,
  type Pipeline,
  type InsertPipeline,
  type PipelineRun,
  type PipelineTemplate,
  type InsertPipelineTemplate,
  type KubernetesCluster,
  type InsertKubernetesCluster,
  type SecurityScan,
  type InsertSecurityScan,
  type Artifact,
  type InsertArtifact,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

export interface IStorage {
  // User operations (required for username/password auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Session store for authentication
  sessionStore: session.Store;

  // Project operations
  getUserProjects(userId: string): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject & { userId: string }): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;

  // Pipeline operations
  getProjectPipelines(projectId: number): Promise<Pipeline[]>;
  getPipeline(id: number): Promise<Pipeline | undefined>;
  createPipeline(pipeline: InsertPipeline): Promise<Pipeline>;
  updatePipeline(id: number, pipeline: Partial<InsertPipeline>): Promise<Pipeline>;
  deletePipeline(id: number): Promise<void>;
  getRecentPipelineRuns(limit?: number): Promise<(PipelineRun & { pipelineName: string; projectName: string })[]>;

  // Pipeline template operations
  getPipelineTemplates(): Promise<PipelineTemplate[]>;
  getPipelineTemplate(id: number): Promise<PipelineTemplate | undefined>;
  createPipelineTemplate(template: InsertPipelineTemplate & { userId?: string }): Promise<PipelineTemplate>;

  // Kubernetes cluster operations
  getUserClusters(userId: string): Promise<KubernetesCluster[]>;
  getCluster(id: number): Promise<KubernetesCluster | undefined>;
  createCluster(cluster: InsertKubernetesCluster & { userId: string }): Promise<KubernetesCluster>;
  updateCluster(id: number, cluster: Partial<InsertKubernetesCluster>): Promise<KubernetesCluster>;
  deleteCluster(id: number): Promise<void>;

  // Security scan operations
  getProjectSecurityScans(projectId: number): Promise<SecurityScan[]>;
  createSecurityScan(scan: InsertSecurityScan): Promise<SecurityScan>;
  getSecurityScansSummary(): Promise<{ critical: number; high: number; medium: number; low: number }>;

  // Artifact operations
  getProjectArtifacts(projectId: number): Promise<Artifact[]>;
  createArtifact(artifact: InsertArtifact): Promise<Artifact>;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;
  
  constructor() {
    // Initialize session store with PostgreSQL
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({ 
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      tableName: "user_sessions" // Use different table name to avoid conflicts
    });
  }

  // User operations (required for username/password auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(sql`lower(${users.username}) = lower(${username})`);
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  // Project operations
  async getUserProjects(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject & { userId: string }): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Pipeline operations
  async getProjectPipelines(projectId: number): Promise<Pipeline[]> {
    return await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.projectId, projectId))
      .orderBy(desc(pipelines.updatedAt));
  }

  async getPipeline(id: number): Promise<Pipeline | undefined> {
    const [pipeline] = await db.select().from(pipelines).where(eq(pipelines.id, id));
    return pipeline;
  }

  async createPipeline(pipeline: InsertPipeline): Promise<Pipeline> {
    const [newPipeline] = await db.insert(pipelines).values(pipeline).returning();
    return newPipeline;
  }

  async updatePipeline(id: number, pipeline: Partial<InsertPipeline>): Promise<Pipeline> {
    const [updatedPipeline] = await db
      .update(pipelines)
      .set({ ...pipeline, updatedAt: new Date() })
      .where(eq(pipelines.id, id))
      .returning();
    return updatedPipeline;
  }

  async deletePipeline(id: number): Promise<void> {
    await db.delete(pipelines).where(eq(pipelines.id, id));
  }

  async getRecentPipelineRuns(limit = 10): Promise<(PipelineRun & { pipelineName: string; projectName: string })[]> {
    const runs = await db
      .select({
        id: pipelineRuns.id,
        pipelineId: pipelineRuns.pipelineId,
        status: pipelineRuns.status,
        startedAt: pipelineRuns.startedAt,
        completedAt: pipelineRuns.completedAt,
        logs: pipelineRuns.logs,
        branch: pipelineRuns.branch,
        commitHash: pipelineRuns.commitHash,
        triggeredBy: pipelineRuns.triggeredBy,
        pipelineName: pipelines.name,
        projectName: projects.name,
      })
      .from(pipelineRuns)
      .leftJoin(pipelines, eq(pipelineRuns.pipelineId, pipelines.id))
      .leftJoin(projects, eq(pipelines.projectId, projects.id))
      .orderBy(desc(pipelineRuns.startedAt))
      .limit(limit);

    return runs as (PipelineRun & { pipelineName: string; projectName: string })[];
  }

  // Pipeline template operations
  async getPipelineTemplates(): Promise<PipelineTemplate[]> {
    return await db
      .select()
      .from(pipelineTemplates)
      .where(eq(pipelineTemplates.isPublic, true))
      .orderBy(desc(pipelineTemplates.createdAt));
  }

  async getPipelineTemplate(id: number): Promise<PipelineTemplate | undefined> {
    const [template] = await db.select().from(pipelineTemplates).where(eq(pipelineTemplates.id, id));
    return template;
  }

  async createPipelineTemplate(template: InsertPipelineTemplate & { userId?: string }): Promise<PipelineTemplate> {
    const [newTemplate] = await db.insert(pipelineTemplates).values(template).returning();
    return newTemplate;
  }

  // Kubernetes cluster operations
  async getUserClusters(userId: string): Promise<KubernetesCluster[]> {
    return await db
      .select()
      .from(kubernetesClusters)
      .where(eq(kubernetesClusters.userId, userId))
      .orderBy(desc(kubernetesClusters.updatedAt));
  }

  async getCluster(id: number): Promise<KubernetesCluster | undefined> {
    const [cluster] = await db.select().from(kubernetesClusters).where(eq(kubernetesClusters.id, id));
    return cluster;
  }

  async createCluster(cluster: InsertKubernetesCluster & { userId: string }): Promise<KubernetesCluster> {
    const [newCluster] = await db.insert(kubernetesClusters).values(cluster).returning();
    return newCluster;
  }

  async updateCluster(id: number, cluster: Partial<InsertKubernetesCluster>): Promise<KubernetesCluster> {
    const [updatedCluster] = await db
      .update(kubernetesClusters)
      .set({ ...cluster, updatedAt: new Date() })
      .where(eq(kubernetesClusters.id, id))
      .returning();
    return updatedCluster;
  }

  async deleteCluster(id: number): Promise<void> {
    await db.delete(kubernetesClusters).where(eq(kubernetesClusters.id, id));
  }

  // Security scan operations
  async getProjectSecurityScans(projectId: number): Promise<SecurityScan[]> {
    return await db
      .select()
      .from(securityScans)
      .where(eq(securityScans.projectId, projectId))
      .orderBy(desc(securityScans.createdAt));
  }

  async createSecurityScan(scan: InsertSecurityScan): Promise<SecurityScan> {
    const [newScan] = await db.insert(securityScans).values(scan).returning();
    return newScan;
  }

  async getSecurityScansSummary(): Promise<{ critical: number; high: number; medium: number; low: number }> {
    const scans = await db.select().from(securityScans).where(eq(securityScans.status, 'completed'));
    
    const summary = { critical: 0, high: 0, medium: 0, low: 0 };
    scans.forEach(scan => {
      if (scan.severity === 'critical') summary.critical++;
      else if (scan.severity === 'high') summary.high++;
      else if (scan.severity === 'medium') summary.medium++;
      else if (scan.severity === 'low') summary.low++;
    });
    
    return summary;
  }

  // Artifact operations
  async getProjectArtifacts(projectId: number): Promise<Artifact[]> {
    return await db
      .select()
      .from(artifacts)
      .where(eq(artifacts.projectId, projectId))
      .orderBy(desc(artifacts.createdAt));
  }

  async createArtifact(artifact: InsertArtifact): Promise<Artifact> {
    const [newArtifact] = await db.insert(artifacts).values(artifact).returning();
    return newArtifact;
  }
}

export const storage = new DatabaseStorage();
