import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign-in error · AgentCMS',
}

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { reason?: string }
}) {
  const messages: Record<string, string> = {
    'missing-token': 'No token was provided.',
    'invalid-token': 'This link has already been used or is invalid.',
    'expired': 'This link has expired. Magic links are valid for 15 minutes.',
  }

  const reason = searchParams.reason ?? 'unknown'
  const message = messages[reason] ?? 'Something went wrong with the sign-in link.'

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-xl p-8 w-full max-w-sm text-center">
        <div className="text-3xl mb-4">⚠️</div>
        <h1 className="text-lg font-semibold text-gray-100 mb-2">Sign-in failed</h1>
        <p className="text-sm text-gray-400 mb-6">{message}</p>
        <a href="/" className="text-sm text-violet-400 hover:text-violet-300">
          ← Back to home
        </a>
      </div>
    </div>
  )
}
