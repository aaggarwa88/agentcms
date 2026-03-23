'use client'

import { Suspense, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

function LoginForm() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const redirect = searchParams.get('redirect') ?? `/p/${slug}`

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, projectSlug: slug, redirect }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong')
        setStatus('error')
      } else {
        setStatus('sent')
      }
    } catch {
      setErrorMsg('Network error — try again')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 w-full max-w-sm">

        {status === 'sent' ? (
          <div className="text-center">
            <div className="text-3xl mb-4">📬</div>
            <h1 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h1>
            <p className="text-sm text-gray-500">
              We sent a magic link to <strong>{email}</strong>.
              Click it to sign in — it expires in 15 minutes.
            </p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-6 text-sm text-violet-600 hover:text-violet-800"
            >
              Try a different email
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="w-8 h-8 bg-violet-600 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <h1 className="text-lg font-semibold text-gray-900">Sign in to AgentCMS</h1>
              <p className="text-sm text-gray-500 mt-1">
                Enter your admin email to get a magic link.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 mb-4"
              />

              {status === 'error' && (
                <p className="text-sm text-red-500 mb-3">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-violet-600 text-white py-2 rounded text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
              >
                {status === 'loading' ? 'Sending…' : 'Send magic link'}
              </button>
            </form>
          </>
        )}

        <p className="text-xs text-gray-400 text-center mt-6">
          /{slug} · AgentCMS
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
