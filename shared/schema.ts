import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  serial,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table is managed by connect-pg-simple, not by our schema

// User storage table (local username/password authentication)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 100 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  usernameUnique: uniqueIndex("users_username_unique").on(sql`lower(${table.username})`),
}));

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  repositoryUrl: varchar("repository_url"),
  repositoryProvider: varchar("repository_provider").default("github"),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pipelines table
export const pipelines = pgTable("pipelines", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  projectId: integer("project_id").notNull().references(() => projects.id),
  config: jsonb("config").notNull(), // Pipeline configuration
  status: varchar("status").default("inactive"), // active, inactive, running, failed, success
  lastRun: timestamp("last_run"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pipeline runs table
export const pipelineRuns = pgTable("pipeline_runs", {
  id: serial("id").primaryKey(),
  pipelineId: integer("pipeline_id").notNull().references(() => pipelines.id),
  status: varchar("status").notNull(), // running, success, failed, cancelled
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  logs: text("logs"),
  branch: varchar("branch"),
  commitHash: varchar("commit_hash"),
  triggeredBy: varchar("triggered_by"),
});

// Pipeline templates table
export const pipelineTemplates = pgTable("pipeline_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category"), // frontend, backend, fullstack, microservice, etc.
  config: jsonb("config").notNull(),
  isPublic: boolean("is_public").default(true),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Kubernetes clusters table
export const kubernetesClusters = pgTable("kubernetes_clusters", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  provider: varchar("provider"), // aws, gcp, azure, local
  endpoint: varchar("endpoint"),
  region: varchar("region"),
  nodeCount: integer("node_count"),
  status: varchar("status").default("unknown"), // healthy, warning, error, unknown
  config: jsonb("config"), // Cluster configuration details
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Security scans table
export const securityScans = pgTable("security_scans", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  scanType: varchar("scan_type").notNull(), // sast, dast, dependency
  severity: varchar("severity"), // critical, high, medium, low
  status: varchar("status").notNull(), // pending, running, completed, failed
  findings: jsonb("findings"),
  reportUrl: varchar("report_url"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Artifacts table
export const artifacts = pgTable("artifacts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type"), // docker-image, jar, war, zip, etc.
  version: varchar("version"),
  size: varchar("size"),
  projectId: integer("project_id").notNull().references(() => projects.id),
  pipelineRunId: integer("pipeline_run_id").references(() => pipelineRuns.id),
  downloadUrl: varchar("download_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  kubernetesClusters: many(kubernetesClusters),
  pipelineTemplates: many(pipelineTemplates),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  pipelines: many(pipelines),
  securityScans: many(securityScans),
  artifacts: many(artifacts),
}));

export const pipelinesRelations = relations(pipelines, ({ one, many }) => ({
  project: one(projects, {
    fields: [pipelines.projectId],
    references: [projects.id],
  }),
  runs: many(pipelineRuns),
}));

export const pipelineRunsRelations = relations(pipelineRuns, ({ one, many }) => ({
  pipeline: one(pipelines, {
    fields: [pipelineRuns.pipelineId],
    references: [pipelines.id],
  }),
  artifacts: many(artifacts),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  description: true,
  repositoryUrl: true,
  repositoryProvider: true,
});

export const insertPipelineSchema = createInsertSchema(pipelines).pick({
  name: true,
  description: true,
  projectId: true,
  config: true,
});

export const insertPipelineTemplateSchema = createInsertSchema(pipelineTemplates).pick({
  name: true,
  description: true,
  category: true,
  config: true,
  isPublic: true,
});

export const insertKubernetesClusterSchema = createInsertSchema(kubernetesClusters).pick({
  name: true,
  provider: true,
  endpoint: true,
  region: true,
  nodeCount: true,
  config: true,
});

export const insertSecurityScanSchema = createInsertSchema(securityScans).pick({
  projectId: true,
  scanType: true,
  severity: true,
  status: true,
});

export const insertArtifactSchema = createInsertSchema(artifacts).pick({
  name: true,
  type: true,
  version: true,
  size: true,
  projectId: true,
  pipelineRunId: true,
  downloadUrl: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type SafeUser = Omit<User, 'password'>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertPipeline = z.infer<typeof insertPipelineSchema>;
export type Pipeline = typeof pipelines.$inferSelect;
export type PipelineRun = typeof pipelineRuns.$inferSelect;
export type InsertPipelineTemplate = z.infer<typeof insertPipelineTemplateSchema>;
export type PipelineTemplate = typeof pipelineTemplates.$inferSelect;
export type InsertKubernetesCluster = z.infer<typeof insertKubernetesClusterSchema>;
export type KubernetesCluster = typeof kubernetesClusters.$inferSelect;
export type InsertSecurityScan = z.infer<typeof insertSecurityScanSchema>;
export type SecurityScan = typeof securityScans.$inferSelect;
export type InsertArtifact = z.infer<typeof insertArtifactSchema>;
export type Artifact = typeof artifacts.$inferSelect;
