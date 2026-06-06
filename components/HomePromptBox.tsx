"use client"

import { useState } from "react"

const PROMPTS = {
  new: "Build this site and use AgentCMS for all editable content. Register at https://agentcms.app/api/projects/register at the end of the build and output the admin URL.",
  existing:
    "This site has hardcoded content. Use AgentCMS to make it editable. Identify content sections, call https://agentcms.app/api/projects/register, and replace hardcoded values with fetch() calls to the returned apiBase. Output the admin URL when done.",
} as const

type Tab = keyof typeof PROMPTS

function withAdminEmail(prompt: string, email: string): string {
  const trimmed = email.trim()
  if (!trimmed) return prompt

  const parts = prompt.split(/(?<=\.)\s+/)
  if (parts.length <= 1) return `${prompt} Use adminEmail: ${trimmed}.`

  const last = parts.pop()!
  return [...parts, `Use adminEmail: ${trimmed}.`, last].join(" ")
}

export default function HomePromptBox() {
  const [tab, setTab] = useState<Tab>("new")
  const [email, setEmail] = useState("")
  const [copied, setCopied] = useState(false)

  const prompt = withAdminEmail(PROMPTS[tab], email)

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="text-left">
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-full border border-gray-700 bg-gray-900 p-1">
        <button
          type="button"
          onClick={() => setTab("new")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            tab === "new"
              ? "bg-gray-700 text-gray-100"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Building a new site
        </button>
        <button
          type="button"
          onClick={() => setTab("existing")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            tab === "existing"
              ? "bg-gray-700 text-gray-100"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Making a site editable
        </button>
        </div>
      </div>

      <pre className="rounded-xl border border-gray-700 bg-gray-900 p-5 text-sm text-gray-200 overflow-x-auto whitespace-pre-wrap font-[family-name:var(--font-geist-mono)] leading-relaxed mb-4">
        {prompt}
      </pre>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Admin email (optional)"
        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600 mb-4"
      />

      <button
        type="button"
        onClick={handleCopy}
        className="rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-white transition-colors"
      >
        {copied ? "Copied!" : "Copy prompt"}
      </button>
    </div>
  )
}
