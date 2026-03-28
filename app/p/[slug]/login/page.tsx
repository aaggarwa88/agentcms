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
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm w-full max-w-sm overflow-hidden">

        {status === 'sent' ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-4">📬</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Check your inbox</h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              We sent a sign-in link to{' '}
              <span className="font-semibold text-gray-700">{email}</span>.
              <br />
              Click the link in that email to access the admin panel.
              <br />
              <span className="text-gray-400">The link expires in 15 minutes.</span>
            </p>
            <button
              onClick={() => { setStatus('idle'); setEmail('') }}
              className="mt-6 text-sm text-violet-600 hover:text-violet-800 underline underline-offset-2"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            {/* Header banner */}
            <div className="bg-violet-600 px-6 py-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-xs">A</span>
                </div>
                <span className="text-white/80 text-sm font-medium">AgentCMS</span>
              </div>
              <h1 className="text-white text-xl font-bold leading-snug">
                What&apos;s the admin email<br />for this site?
              </h1>
              <p className="text-violet-200 text-sm mt-1.5">
                Enter the email used when this site was set up. We&apos;ll send you a one-click sign-in link.
              </p>
            </div>

            {/* Form */}
            <div className="p-6">
              <form onSubmit={handleSubmit}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Admin email address
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="border border-gray-300 rounded-lg px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent mb-4"
                />

                {status === 'error' && (
                  <p className="text-sm text-red-500 mb-3">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full bg-violet-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  {status === 'loading' ? 'Sending…' : 'Send sign-in link →'}
                </button>
              </form>

              <p className="text-xs text-gray-400 text-center mt-4">
                /{slug} · AgentCMS
              </p>
            </div>
          </>
        )}
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
