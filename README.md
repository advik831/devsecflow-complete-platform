# 🚀 DevOps Platform

A simple yet powerful DevOps platform that helps you build, test, and deploy your applications with CI/CD pipelines, GitHub integration, and Kubernetes support.

![DevOps Platform](https://img.shields.io/badge/DevOps-Platform-blue?style=for-the-badge&logo=kubernetes)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?style=for-the-badge&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js)

## ✨ Features

### 🔧 **CI/CD Pipeline Management**
- **Visual Pipeline Builder** - Drag-and-drop interface for creating complex CI/CD workflows
- **Pipeline Templates** - Pre-built templates for Node.js, Docker, and DevSecOps workflows  
- **Real-time Monitoring** - Live pipeline execution tracking with detailed logs
- **YAML Export** - Professional code editor with syntax highlighting and export capabilities

### 🔐 **GitHub Integration**
- **Repository Management** - Browse, select, and manage GitHub repositories
- **Branch & Commit Tracking** - Real-time branch information and commit history display
- **Automated Project Setup** - Seamless project creation with repository linking
- **Developer Analytics** - Comprehensive repository statistics and insights

### ☸️ **Kubernetes Cluster Management**
- **Multi-Provider Support** - AWS EKS, Google GKE, Azure AKS, and on-premises clusters
- **Cluster Health Monitoring** - Real-time status, node count, and resource utilization
- **Deployment Management** - Streamlined application deployment and scaling
- **Resource Visualization** - Interactive cluster topology and resource allocation views

### 🛡️ **Security & Compliance**
- **Secure Authentication** - Username/password authentication with bcrypt hashing and secure sessions
- **DevSecOps Integration** - Built-in SAST/DAST security scanning workflows
- **Vulnerability Dashboard** - Comprehensive security overview with risk categorization
- **Compliance Monitoring** - Automated compliance checks and reporting
- **Security Policy Management** - Centralized security configuration and enforcement

### 🎨 **Modern User Experience**
- **Responsive Design** - Optimized for desktop, tablet, and mobile devices
- **Dark Mode Support** - Professional dark/light theme switching
- **Real-time Updates** - Live data synchronization across all components
- **Intuitive Navigation** - Clean, modern interface with smooth transitions

## 🛠️ Technology Stack

**Frontend:**
- **React 18+** with TypeScript for type-safe development
- **Tailwind CSS** for responsive, utility-first styling
- **shadcn/ui** components for professional UI consistency
- **Tanstack Query** for efficient state management and caching
- **Framer Motion** for smooth animations and transitions

**Backend:**
- **Node.js** with Express for robust API development
- **TypeScript** for end-to-end type safety
- **PostgreSQL** with Drizzle ORM for reliable data persistence
- **Local Authentication** with secure username/password system and session management
- **GitHub API** integration for repository management

**DevOps & Infrastructure:**
- **Vite** for lightning-fast development and building
- **Docker** containerization support
- **Kubernetes** orchestration capabilities  
- **GitHub Actions** CI/CD integration
- **Security scanning** with industry-standard tools

## 🚀 Getting Started

**Choose the setup that works for you:**

### 🏠 **Easy Local Setup** (Recommended for beginners)

**What you need:**
- [Docker Desktop](https://docs.docker.com/get-docker/) installed on your computer
- That's it! No database installation required.

**Steps:**

1. **Get the code**
   ```bash
   git clone https://github.com/advik831/devsecflow-complete-platform.git
   cd devsecflow-complete-platform
   ```

2. **Run the automatic setup**
   
   **On Mac/Linux:**
   ```bash
   chmod +x scripts/setup-local.sh
   ./scripts/setup-local.sh
   ```
   
   **On Windows:**
   ```batch
   scripts\setup-local.bat
   ```

3. **Start the application**
   ```bash
   node scripts/dev-local.js
   ```

4. **Open your browser**: http://localhost:5000

5. **Create your account**: Register with username and password to get started

**What this does:**
- Creates a PostgreSQL database automatically (no manual setup needed)
- Configures everything for you
- Sets up the database schema with secure authentication
- Gets you ready to start building pipelines!

---

### 🐳 **Docker Setup** (For production-like environment)

**What you need:**
- [Docker Desktop](https://docs.docker.com/get-docker/) installed

**Steps:**

1. **Get the code**
   ```bash
   git clone https://github.com/advik831/devsecflow-complete-platform.git
   cd devsecflow-complete-platform
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```

3. **Start everything with Docker**
   ```bash
   docker-compose up -d
   ```

4. **Open your browser**: http://localhost:5000

---

### ☸️ **Kubernetes Setup** (For advanced users)

If you have a Kubernetes cluster and want to deploy there:

```bash
# For bundled database (includes PostgreSQL)
kubectl apply -k k8s/overlays/bundled-db

# For external database (you provide the database)
kubectl apply -k k8s/overlays/external-db
```

See [k8s/README.md](k8s/README.md) for detailed Kubernetes instructions.

## 📖 How to Use

### Getting Started with Authentication

1. Open http://localhost:5000 in your browser
2. **Register** a new account with username and password
3. **Sign in** to access the platform features

### Creating Your First Pipeline

1. After signing in, click **"Pipelines"** → **"New Pipeline"**
2. Choose a template (Node.js, Docker, or start from scratch)
3. Drag and drop stages to build your pipeline
4. Click **"Save & Run"** to test it

### Connecting Your GitHub Account (Optional)

1. Go to **"Projects"** → **"Create Project"**
2. Click **"Connect GitHub"** and sign in
3. Pick a repository from your account
4. Start building CI/CD pipelines for your code

### Managing Applications

1. Use the **Dashboard** to see all your projects
2. Monitor pipeline runs and deployments
3. Check security scans and fix any issues
4. Scale your applications as needed

## 🏗️ Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React App] --> B[Component Library]
        A --> C[State Management]
        A --> D[Authentication]
    end
    
    subgraph "API Layer" 
        E[Express Server] --> F[GitHub Integration]
        E --> G[Kubernetes APIs]
        E --> H[Pipeline Engine]
    end
    
    subgraph "Data Layer"
        I[PostgreSQL] --> J[User Management]
        I --> K[Project Data]
        I --> L[Pipeline Configs]
    end
    
    subgraph "External Services"
        M[GitHub API]
        N[Kubernetes Clusters]
        O[Security Scanners]
    end
    
    A --> E
    F --> M
    G --> N
    H --> O
    E --> I
```

## 🔧 Configuration (Optional)

The automatic setup handles most configuration for you. If you want to customize:

### GitHub Integration (Optional)

To connect your GitHub repositories:

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set callback URL: `http://localhost:5000/auth/github/callback`
4. Copy the Client ID and Client Secret
5. Add them to your `.env.local` file:
   ```
   GITHUB_CLIENT_ID=your_client_id_here
   GITHUB_CLIENT_SECRET=your_client_secret_here
   ```

### Database Settings

The setup script creates a local database automatically. If you want to use your own database, edit the `.env.local` file:

```bash
DATABASE_URL=postgresql://username:password@hostname:5432/database_name
```

## 📊 Project Structure

```
devsecflow-complete-platform/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utility functions
├── server/                 # Backend Express server
│   ├── routes.ts           # API route definitions
│   ├── storage.ts          # Database operations
│   ├── githubClient.ts     # GitHub API integration
│   └── auth.ts             # Local authentication logic
├── shared/                 # Shared types and schemas
└── docs/                   # Documentation
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests for new features
- Ensure responsive design compatibility
- Follow the established code style
- Update documentation as needed

## 🛠️ Useful Commands

### Local Development

```bash
# Start the application
node scripts/dev-local.js

# Update database schema (after making changes)
node scripts/db-push-local.js

# Stop the local database
docker compose -f docker-compose.local.yml down

# View database logs
docker compose -f docker-compose.local.yml logs postgres
```

### Docker Commands

```bash
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# View application logs
docker-compose logs app

# Restart the application
docker-compose restart app
```

## 🧹 Clean Start

If something goes wrong, you can start fresh:

```bash
# Stop everything
docker compose -f docker-compose.local.yml down -v

# Remove local config
rm -f .env.local

# Run setup again
./scripts/setup-local.sh
```

## 🐛 Troubleshooting

### Common Issues

**"Port 5432 already in use"**
- You might have PostgreSQL running locally. Stop it:
  ```bash
  # Mac
  brew services stop postgresql
  
  # Linux
  sudo systemctl stop postgresql
  
  # Windows
  net stop postgresql-x64-14
  ```

**"Docker not found"**
- Make sure Docker Desktop is installed and running
- Check with: `docker --version`

**"Database connection failed"**
1. Make sure Docker container is running: `docker ps`
2. Restart the database: `docker compose -f docker-compose.local.yml restart postgres`
3. Check logs: `docker compose -f docker-compose.local.yml logs postgres`

**Application not loading**
- Wait a minute for everything to start up
- Check if the port 5000 is available
- Look at the application logs for error messages

### Need Help?

- Check the [Issues page](https://github.com/advik831/devsecflow-complete-platform/issues) for common problems
- Create a new issue if you find a bug

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Replit** for the amazing development platform
- **shadcn/ui** for the beautiful component library
- **Tailwind CSS** for the utility-first CSS framework
- **Open Source Community** for the incredible tools and libraries

## 📞 Support

- **Documentation**: [View Docs](docs/)
- **Issues**: [GitHub Issues](https://github.com/advik831/devsecflow-complete-platform/issues)
- **Discussions**: [GitHub Discussions](https://github.com/advik831/devsecflow-complete-platform/discussions)

---

<div align="center">

**Built with ❤️ by developers, for developers**

[![GitHub stars](https://img.shields.io/github/stars/advik831/devsecflow-complete-platform?style=social)](https://github.com/advik831/devsecflow-complete-platform/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/advik831/devsecflow-complete-platform?style=social)](https://github.com/advik831/devsecflow-complete-platform/network/members)
[![GitHub issues](https://img.shields.io/github/issues/advik831/devsecflow-complete-platform)](https://github.com/advik831/devsecflow-complete-platform/issues)

</div>