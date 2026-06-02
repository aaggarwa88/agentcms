const REPO_URL = 'https://github.com/aaggarwa88/agentcms'

export function getGitCommitSha(): string {
  return process.env.NEXT_PUBLIC_GIT_COMMIT_SHA ?? 'development'
}

export function getVersionLabel(): string {
  const sha = getGitCommitSha()
  if (sha === 'development') return 'dev'
  return sha.slice(0, 7)
}

export function getCommitUrl(): string | null {
  const sha = getGitCommitSha()
  if (sha === 'development') return null
  return `${REPO_URL}/commit/${sha}`
}
