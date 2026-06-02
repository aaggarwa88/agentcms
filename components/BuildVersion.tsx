import { getCommitUrl, getVersionLabel } from '@/lib/version'

export default function BuildVersion() {
  const label = getVersionLabel()
  const commitUrl = getCommitUrl()

  return (
    <footer className="fixed bottom-0 inset-x-0 z-50 pointer-events-none pb-3 text-center">
      <span className="text-[11px] font-mono text-gray-400 dark:text-gray-600">
        AgentCMS{' '}
        {commitUrl ? (
          <a
            href={commitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto hover:text-gray-600 dark:hover:text-gray-400 underline underline-offset-2"
          >
            {label}
          </a>
        ) : (
          <span>{label}</span>
        )}
      </span>
    </footer>
  )
}
