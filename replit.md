# DevSecFlow - DevOps & DevSecOps Platform

## Overview

DevSecFlow is a comprehensive lifecycle management platform that provides CI/CD pipelines, security scanning, and Kubernetes cluster management for modern development teams. The application integrates with GitHub for source control management and offers a complete DevSecOps workflow including pipeline creation, security analysis, artifact management, and template-based deployments.

The platform follows a full-stack architecture with a React frontend, Express.js backend, and PostgreSQL database, designed to streamline development workflows and enhance security practices throughout the software development lifecycle.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, utilizing functional components and hooks
- **Routing**: Wouter for client-side routing with protected routes based on authentication state
- **State Management**: TanStack Query for server state management and caching
- **UI Library**: shadcn/ui components built on Radix UI primitives with Tailwind CSS
- **Form Handling**: React Hook Form with Zod validation schemas
- **Build Tool**: Vite with custom configuration for development and production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **API Design**: RESTful API with structured error handling and request logging middleware
- **Authentication**: OpenID Connect (OIDC) integration with Replit Auth using Passport.js
- **Session Management**: Express sessions with PostgreSQL store using connect-pg-simple
- **Database ORM**: Drizzle ORM with type-safe queries and schema management

### Data Storage
- **Primary Database**: PostgreSQL with Neon serverless driver
- **Schema Management**: Drizzle Kit for migrations and database schema evolution
- **Session Storage**: Database-backed sessions with automatic expiration
- **Data Models**: Comprehensive schema covering users, projects, pipelines, security scans, Kubernetes clusters, and artifacts

### Authentication and Authorization
- **Provider**: Replit OIDC integration with automatic token refresh
- **Session Security**: HTTP-only cookies with secure settings and CSRF protection
- **Route Protection**: Middleware-based authentication checks on API endpoints
- **User Management**: Automatic user creation and profile synchronization

### External Service Integrations
- **GitHub API**: Repository access, branch management, and commit history via Octokit
- **Container Registries**: Support for Docker image storage and retrieval
- **Cloud Providers**: Kubernetes cluster integration for AWS, GCP, and Azure
- **Security Scanners**: SAST/DAST integration for vulnerability detection

### Pipeline Architecture
- **Visual Pipeline Builder**: Drag-and-drop interface for creating CI/CD workflows
- **Template System**: Pre-built pipeline templates for common technologies (Node.js, Docker, etc.)
- **Stage Types**: Modular stages including source control, build, test, security scan, and deployment
- **Execution Engine**: Pipeline orchestration with real-time status updates and logging

### Security Features
- **Vulnerability Scanning**: Automated security analysis with severity classification
- **Compliance Reporting**: Security issue tracking and remediation workflows
- **Access Control**: Role-based permissions and audit logging
- **Secrets Management**: Secure handling of API keys and credentials