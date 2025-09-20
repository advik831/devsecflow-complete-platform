import { Octokit } from '@octokit/rest'

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  console.log('GitHub connection status:', connectionSettings ? 'found' : 'not found');
  
  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGitHubClient() {
  try {
    const accessToken = await getAccessToken();
    return new Octokit({ auth: accessToken });
  } catch (error) {
    console.error('GitHub client initialization failed:', error);
    throw new Error('GitHub integration not configured');
  }
}

// Helper functions for common GitHub operations
export async function getRepositories() {
  const octokit = await getUncachableGitHubClient();
  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 100
  });
  return data;
}

export async function getRepository(owner: string, repo: string) {
  const octokit = await getUncachableGitHubClient();
  const { data } = await octokit.rest.repos.get({
    owner,
    repo
  });
  return data;
}

export async function getBranches(owner: string, repo: string) {
  const octokit = await getUncachableGitHubClient();
  const { data } = await octokit.rest.repos.listBranches({
    owner,
    repo
  });
  return data;
}

export async function getCommits(owner: string, repo: string, sha?: string) {
  const octokit = await getUncachableGitHubClient();
  const { data } = await octokit.rest.repos.listCommits({
    owner,
    repo,
    sha,
    per_page: 10
  });
  return data;
}

export async function getUserProfile() {
  const octokit = await getUncachableGitHubClient();
  const { data } = await octokit.rest.users.getAuthenticated();
  return data;
}
