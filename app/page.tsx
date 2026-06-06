import type { Metadata } from "next"
import HomePromptBox from "@/components/HomePromptBox"

export const metadata: Metadata = {
  title: "AgentCMS",
  description:
    "Hosted content backend for AI-built websites. One API call gives your site a built-in admin panel.",
}

const useCases = [
  {
    heading: "Editable content",
    body: "Non-technical users edit text, schedules, team members, and more — directly from a hosted admin panel.",
    link: "https://aaggarwa88.github.io/santamonicahigh-tack-website/",
    linkLabel: "See example →",
  },
  {
    heading: "Form & email capture",
    body: "Collect signups, RSVPs, and contact submissions from any AI-built site. Submissions go to an admin inbox with CSV export.",
    link: "https://aaggarwa88.github.io/swingleftla/",
    linkLabel: "See example →",
  },
  {
    heading: "One API call",
    body: "Works with Claude Code, Cursor, Bolt, and v0. Register a project, get an admin URL. No CMS configuration required.",
    link: "https://github.com/aaggarwa88/agentcms",
    linkLabel: "Read the docs →",
  },
]

const steps = [
  {
    title: "AI builds your site",
    body: "Your coding agent builds the frontend and structures content into named datasets.",
  },
  {
    title: "AgentCMS registers it",
    body: "One API call provisions the content schema, stores initial content, and generates a hosted admin UI.",
  },
  {
    title: "Admin URL appears in the build output",
    body: "Share it with whoever needs to edit. No developer needed again.",
  },
]

const examples = [
  {
    name: "SAMO Track",
    description:
      "Santa Monica High School track team site. Coach edits schedule, announcements, and records.",
    siteUrl: "https://aaggarwa88.github.io/santamonicahigh-tack-website/",
    adminUrl: "https://agentcms.app/p/samo-track",
  },
  {
    name: "SwingLeft LA",
    description:
      "Civic organizing site. Team edits events, resources, and volunteer information.",
    siteUrl: "https://aaggarwa88.github.io/swingleftla/",
    adminUrl: "https://agentcms.app/p/swingleftla",
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <main className="flex-1">
        <section className="px-6 pt-20 pb-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-100 mb-4 text-balance">
              Your AI built the site. Now who edits it?
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 mb-10 text-balance">
              One prompt. Your site gets a built-in admin panel.
            </p>
            <HomePromptBox />
          </div>
        </section>

        <section className="px-6 py-16 border-t border-gray-800">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {useCases.map((card) => (
                <div
                  key={card.heading}
                  className="border border-gray-800 rounded-xl p-6 flex flex-col"
                >
                  <h3 className="font-semibold text-gray-100 mb-2">
                    {card.heading}
                  </h3>
                  <p className="text-sm text-gray-400 mb-4 flex-1">
                    {card.body}
                  </p>
                  <a
                    href={card.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-300 hover:text-white underline underline-offset-2"
                  >
                    {card.linkLabel}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16 border-t border-gray-800">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-100 mb-10 text-center">
              How it works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {steps.map((step, i) => (
                <div key={step.title} className="text-center sm:text-left">
                  <div className="text-sm font-semibold text-gray-500 mb-2">
                    Step {i + 1}
                  </div>
                  <h3 className="font-semibold text-gray-100 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-400">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16 border-t border-gray-800">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-100 mb-10 text-center">
              Built with AgentCMS
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {examples.map((example) => (
                <div
                  key={example.name}
                  className="border border-gray-800 rounded-xl p-6"
                >
                  <h3 className="font-semibold text-gray-100 mb-2">
                    {example.name}
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    {example.description}
                  </p>
                  <div className="flex flex-col gap-2 text-sm">
                    <a
                      href={example.siteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-white underline underline-offset-2"
                    >
                      {example.siteUrl}
                    </a>
                    <a
                      href={example.adminUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-gray-300 underline underline-offset-2"
                    >
                      Admin: {example.adminUrl}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="px-6 py-8 border-t border-gray-800">
        <div className="max-w-5xl mx-auto text-center text-sm text-gray-500">
          <p className="mb-3">
            AgentCMS — hosted content backend for AI-built websites.
          </p>
          <p>
            <a
              href="https://github.com/aaggarwa88/agentcms"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-300 underline underline-offset-2"
            >
              GitHub
            </a>
            <span className="mx-2">|</span>
            <a
              href="https://github.com/aaggarwa88/agentcms#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-300 underline underline-offset-2"
            >
              Docs
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
