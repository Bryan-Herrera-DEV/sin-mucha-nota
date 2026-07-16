const GITHUB_API_URL = 'https://api.github.com'
const GITHUB_OAUTH_URL = 'https://github.com/login/oauth'
const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code'
const DEV_GITHUB_OAUTH_PROXY_BASE = '/github-oauth'

export type GithubDeviceCodeResponse = {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

export type GithubTokenResponse = {
  access_token: string
  token_type: string
  scope: string
}

export type GithubUserResponse = {
  login: string
  avatar_url: string | null
}

export type GithubRepository = {
  id: number
  name: string
  full_name: string
  private: boolean
  default_branch: string
  owner: {
    login: string
  }
  permissions?: {
    push?: boolean
  }
}

export type GithubRefResponse = {
  object: {
    sha: string
  }
}

export type GithubCommitResponse = {
  sha: string
  tree: {
    sha: string
  }
}

export type GithubTreeItem = {
  path?: string
  mode?: string
  type?: 'blob' | 'tree' | 'commit'
  sha?: string
}

export type GithubTreeResponse = {
  sha: string
  tree: GithubTreeItem[]
  truncated: boolean
}

export type GithubBlobResponse = {
  sha: string
  content: string
  encoding: string
}

export type GithubCreatedBlobResponse = {
  sha: string
}

export type GithubCreatedTreeResponse = {
  sha: string
}

export type GithubCreatedCommitResponse = {
  sha: string
}

export type GithubTreeUpdateEntry = {
  path: string
  mode: '100644'
  type: 'blob'
  sha: string | null
}

export async function requestGithubDeviceCode(clientId: string): Promise<GithubDeviceCodeResponse> {
  return fetchGithubDeviceCode<GithubDeviceCodeResponse>({
    client_id: clientId,
    scope: 'repo read:user',
  })
}

export async function pollGithubDeviceToken(clientId: string, deviceCode: string): Promise<GithubTokenResponse> {
  return fetchGithubOAuth<GithubTokenResponse>('access_token', {
    client_id: clientId,
    device_code: deviceCode,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
  })
}

export async function getGithubUser(accessToken: string): Promise<GithubUserResponse> {
  return fetchGithubApi<GithubUserResponse>(accessToken, '/user')
}

export async function listGithubRepositories(accessToken: string): Promise<GithubRepository[]> {
  const repositories = await fetchGithubApi<GithubRepository[]>(
    accessToken,
    '/user/repos?affiliation=owner,collaborator,organization_member&sort=updated&per_page=100',
  )

  return repositories.filter((repository) => repository.permissions?.push !== false)
}

export async function getGithubBranchRef(accessToken: string, owner: string, repo: string, branch: string): Promise<GithubRefResponse> {
  return fetchGithubApi<GithubRefResponse>(accessToken, `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`)
}

export async function getGithubCommit(accessToken: string, owner: string, repo: string, commitSha: string): Promise<GithubCommitResponse> {
  return fetchGithubApi<GithubCommitResponse>(accessToken, `/repos/${owner}/${repo}/git/commits/${commitSha}`)
}

export async function getGithubTree(accessToken: string, owner: string, repo: string, treeSha: string): Promise<GithubTreeResponse> {
  return fetchGithubApi<GithubTreeResponse>(accessToken, `/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`)
}

export async function getGithubBlob(accessToken: string, owner: string, repo: string, blobSha: string): Promise<GithubBlobResponse> {
  return fetchGithubApi<GithubBlobResponse>(accessToken, `/repos/${owner}/${repo}/git/blobs/${blobSha}`)
}

export async function createGithubBlob(accessToken: string, owner: string, repo: string, content: string): Promise<GithubCreatedBlobResponse> {
  return fetchGithubApi<GithubCreatedBlobResponse>(accessToken, `/repos/${owner}/${repo}/git/blobs`, {
    method: 'POST',
    body: JSON.stringify({ content: encodeBase64(content), encoding: 'base64' }),
  })
}

export async function createGithubTree(
  accessToken: string,
  owner: string,
  repo: string,
  baseTreeSha: string,
  tree: GithubTreeUpdateEntry[],
): Promise<GithubCreatedTreeResponse> {
  return fetchGithubApi<GithubCreatedTreeResponse>(accessToken, `/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: baseTreeSha, tree }),
  })
}

export async function createGithubCommit(
  accessToken: string,
  owner: string,
  repo: string,
  message: string,
  treeSha: string,
  parentSha: string,
): Promise<GithubCreatedCommitResponse> {
  return fetchGithubApi<GithubCreatedCommitResponse>(accessToken, `/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message, tree: treeSha, parents: [parentSha] }),
  })
}

export async function updateGithubBranchRef(accessToken: string, owner: string, repo: string, branch: string, commitSha: string): Promise<void> {
  await fetchGithubApi<unknown>(accessToken, `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commitSha, force: false }),
  })
}

export function decodeGithubBlobContent(blob: GithubBlobResponse): string {
  if (blob.encoding !== 'base64') {
    return blob.content
  }

  return decodeBase64(blob.content.replace(/\s/g, ''))
}

async function fetchGithubOAuth<T>(path: string, body: Record<string, string>): Promise<T> {
  const response = await fetch(createGithubOAuthUrl(path, `${GITHUB_OAUTH_URL}/${path}`), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
  })
  const payload = (await response.json()) as T & { error?: string; error_description?: string }

  if (!response.ok || payload.error) {
    throw new Error(payload.error ?? payload.error_description ?? 'GitHub OAuth no respondio correctamente')
  }

  return payload
}

async function fetchGithubDeviceCode<T>(body: Record<string, string>): Promise<T> {
  const response = await fetch(createGithubOAuthUrl('device/code', GITHUB_DEVICE_CODE_URL), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
  })
  const payload = (await response.json()) as T & { error?: string; error_description?: string }

  if (!response.ok || payload.error) {
    throw new Error(payload.error ?? payload.error_description ?? 'GitHub OAuth no respondio correctamente')
  }

  return payload
}

function createGithubOAuthUrl(path: string, fallbackUrl: string): string {
  const proxyBaseUrl = import.meta.env.VITE_GITHUB_OAUTH_PROXY_URL?.trim().replace(/\/$/, '')

  if (proxyBaseUrl) {
    return `${proxyBaseUrl}/${path}`
  }

  if (import.meta.env.DEV) {
    return `${DEV_GITHUB_OAUTH_PROXY_BASE}/${path}`
  }

  if (import.meta.env.PROD) {
    throw new Error('Configura VITE_GITHUB_OAUTH_PROXY_URL para usar OAuth de GitHub en produccion.')
  }

  return fallbackUrl
}

async function fetchGithubApi<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${GITHUB_API_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const message = await readGithubError(response)

    throw new Error(message)
  }

  if (response.status === 204) {
    return null as T
  }

  return (await response.json()) as T
}

async function readGithubError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string }

    return payload.message ?? `GitHub respondio ${response.status}`
  } catch {
    return `GitHub respondio ${response.status}`
  }
}

function encodeBase64(content: string): string {
  const bytes = new TextEncoder().encode(content)
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

function decodeBase64(content: string): string {
  const binary = atob(content)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new TextDecoder().decode(bytes)
}
