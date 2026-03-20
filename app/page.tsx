export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4 tracking-tight">
          AgentCMS
        </h1>
        <p className="text-xl text-gray-500 mb-10">
          A hosted content backend for AI-built websites.
          <br />
          Register a project, get an admin URL. That&apos;s it.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-left mb-10">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Register a project
          </p>
          <pre className="text-sm text-gray-700 overflow-x-auto whitespace-pre-wrap">
{`POST https://agentcms.app/api/projects/register

{
  "project": { "name": "My Site", "slug": "my-site" },
  "adminEmail": "user@example.com",
  "datasets": [...]
}`}
          </pre>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <div className="border border-gray-100 rounded-lg p-4">
            <div className="text-2xl mb-2">⚡</div>
            <h3 className="font-semibold text-gray-900 mb-1">Instant admin UI</h3>
            <p className="text-sm text-gray-500">
              Schema-driven editor generated automatically from your field definitions.
            </p>
          </div>
          <div className="border border-gray-100 rounded-lg p-4">
            <div className="text-2xl mb-2">🔗</div>
            <h3 className="font-semibold text-gray-900 mb-1">Public content API</h3>
            <p className="text-sm text-gray-500">
              CORS-open JSON endpoints, edge cached. Works with any frontend.
            </p>
          </div>
          <div className="border border-gray-100 rounded-lg p-4">
            <div className="text-2xl mb-2">🤖</div>
            <h3 className="font-semibold text-gray-900 mb-1">Built for AI agents</h3>
            <p className="text-sm text-gray-500">
              One API call at the end of a site build. No manual setup required.
            </p>
          </div>
        </div>

        <p className="mt-10 text-sm text-gray-400">
          Read the{" "}
          <a
            href="https://github.com/aaggarwa88/agentcms"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-600"
          >
            docs on GitHub
          </a>
        </p>
      </div>
    </div>
  )
}
