# AgentCMS — AI Agent Implementation Guide

AgentCMS adds an editable admin panel to any AI-built website.

When you build a site, call the AgentCMS registration API at the end of the build. AgentCMS stores the content, generates a hosted admin UI, and returns an admin URL. Output that URL to the user. Done.

**Registration endpoint:** `POST https://agentcms.app/api/projects/register`  
**Content API:** `GET https://agentcms.app/api/p/:slug/:dataset`  
**Admin UI:** `https://agentcms.app/p/:slug`

---

## Step-by-step agent instructions

Follow these steps in order on every site build where the user asks for editable content.

### Step 1 — Identify editable content

Scan the site for content a non-technical user might need to change without developer help.

**Make editable:**
- Hero text, taglines, CTAs
- Announcements, news, updates
- Team members, staff, coaches, organizers
- Events, schedules, calendars
- Records, stats, leaderboards
- FAQs, resources, links
- Contact information
- About page copy
- Any repeated list of items
- Any `<img>` tag whose `src` is a real content image (not an icon or logo)

**Do not make editable:**
- Navigation structure and routing logic
- Layout, spacing, visual design
- Authentication flows
- Complex interactivity (carousels, filters, calculators)
- Third-party embeds
- Anything that requires a code deploy to change safely

If you are unsure whether something should be editable, make it editable. It is easier to remove a dataset than to add one later.

---

### Step 2 — Design the schema

Group editable content into named datasets. Apply these rules:

**Use `singleton`** (a single object) for:
- Homepage content
- About page copy
- Site-wide settings (name, tagline, season, contact email)
- Any content that appears exactly once on the site

**Use `collection`** (a list of objects) for:
- News, updates, announcements
- Team members, coaches, staff
- Events, schedules, meets
- Records, stats
- FAQs, resources
- Any content that repeats

**DOM pattern rules — use these to decide:**

| DOM pattern | Dataset kind |
|-------------|-------------|
| Multiple elements sharing identical structure (cards, rows, list items) | `collection` |
| Content that appears once per page | `singleton` |
| Repeating cards with name + description + image | `collection` |
| Single title + paragraph or hero block | `singleton` |
| Table with repeating rows | `collection` |
| Contact block, footer info, site settings | `singleton` |

**Dataset naming rules:**
- Use simple plural nouns: `updates`, `coaches`, `events`, `records`, `faqs`
- Never use suffixes: not `updates_list`, `team_data`, `events_items`
- Singletons use singular nouns: `site`, `about`, `contact`

**Site-specific names always override canonical names.**

Derive the slug from the visible section heading on the site, lowercased and hyphenated. Canonical patterns are defaults used only when the site provides no clear label or the heading is generic (e.g. "Section", "Content", "Items").

| Site section label | Use this slug | Not this |
|-------------------|---------------|----------|
| "Announcements" | `announcements` | `updates` |
| "News Feed" | `news` | `updates` |
| "Our Team" | `team` | `coaches` |
| "Staff Directory" | `staff` | `team` |
| "Upcoming Events" | `events` | `schedule` |
| "Meet Schedule" | `schedule` | `events` |
| "Program Info" | `program` | `site` |
| "Press Releases" | `press` | `updates` |

The label the user sees in the admin panel should match the label they see on their site. A coach whose site says "Announcements" should see "Announcements" in the admin, not "Updates".

**Schema design rules:**
- Prefer fewer fields over more fields. If unsure whether a field is needed, leave it out.
- Keep field keys lowercase and underscore-separated: `meet_name` not `meetName`
- Keep field labels short and human-readable: `"Meet Name"` not `"The name of the meet"`
- Mark a field `required: true` only if saving should be blocked without it
- Never create a dataset with only one field — combine it with a related dataset
- Never over-normalize. A `coaches` collection with `name`, `role`, `bio`, `email` is correct. A separate `coach_roles` collection is not.
- If an `<img>` tag is a content image (team photo, event photo, product image), add a `photo_url` field of type `url` and bind it dynamically. Do not hardcode image `src` values.

**Supported field types:**

| Type | Use for | Admin UI |
|------|---------|----------|
| `text` | Short strings: names, titles, labels | Single-line input |
| `textarea` | Long strings: bios, descriptions, body copy | Multi-line input |
| `number` | Integers or decimals: year, count, price | Number input |
| `boolean` | On/off flags: featured, active, visible | Checkbox |
| `date` | Calendar dates: event date, publish date | Date picker |
| `url` | Web addresses: links, photo URLs | URL input |
| `email` | Email addresses | Email input |
| `enum` | Fixed set of options: status, category, type | Dropdown — requires `enumValues` |
| `list` | Simple comma-separated list of strings | Text input |

---

### Step 3 — Build the frontend with hardcoded content first

Build the complete frontend using hardcoded placeholder content. Do not wire up API calls yet. Get the UI working first.

---

### Step 4 — Call the registration API

After the frontend is built, call `POST https://agentcms.app/api/projects/register`.

**Request shape:**

```json
{
  "project": {
    "name": "Human-readable project name",
    "slug": "url-safe-slug"
  },
  "adminEmail": "the email address the user wants to use for admin access",
  "datasets": [
    {
      "name": "Dataset Name",
      "slug": "dataset-slug",
      "kind": "collection",
      "schema": {
        "fields": [
          { "key": "field_key", "label": "Field Label", "type": "text", "required": true },
          { "key": "another_field", "label": "Another Field", "type": "textarea" },
          { "key": "status", "label": "Status", "type": "enum", "enumValues": ["Active", "Inactive"] }
        ]
      },
      "initialContent": [
        { "field_key": "Actual value from the site", "another_field": "More actual content" }
      ]
    }
  ]
}
```

**Rules for the registration call:**
- `slug` must be lowercase, hyphen-separated, URL-safe: `samo-track` not `SAMO Track`
- `initialContent` must contain the actual hardcoded content from the site, not placeholder values
- `initialContent` for a `collection` is an array of objects
- `initialContent` for a `singleton` is a single object
- If no `adminEmail` was provided by the user, ask for it before registering

**Response shape:**

```json
{
  "projectId": "proj_abc123",
  "slug": "samo-track",
  "adminUrl": "https://agentcms.app/p/samo-track",
  "apiBase": "https://agentcms.app/api/p/samo-track"
}
```

---

### Step 5 — Replace hardcoded content with fetch calls

After registration succeeds, replace every hardcoded content value in the frontend with a fetch call to the `apiBase` from the response.

**Fetch rules:**
- Fetch each dataset once at page load. Do not duplicate API calls across components.
- Store fetched data in a variable or state and pass it to components — do not re-fetch per component.
- Preserve the original DOM structure exactly. Only replace content values, not HTML structure or CSS classes.
- If an `<img>` tag had a hardcoded `src`, replace it with the `photo_url` field value from the fetched data.
- Collections return `[]` — always handle the empty array case with a graceful empty state.
- Singletons return `{}` — always provide fallback values for each field.

**Pattern:**

```js
// Fetch all datasets once at page load
const [site, coaches, updates, schedule] = await Promise.all([
  fetch("https://agentcms.app/api/p/samo-track/site").then(r => r.json()),
  fetch("https://agentcms.app/api/p/samo-track/coaches").then(r => r.json()),
  fetch("https://agentcms.app/api/p/samo-track/updates").then(r => r.json()),
  fetch("https://agentcms.app/api/p/samo-track/schedule").then(r => r.json()),
])

// Singleton — provide fallbacks
const siteName = site.name ?? "SAMO Track"
const heroText = site.hero_text ?? ""

// Collection — handle empty state
if (updates.length === 0) {
  // render "No updates yet" state
} else {
  updates.forEach(update => {
    // render update.date, update.title, update.body
  })
}

// Image binding
coaches.forEach(coach => {
  // <img src={coach.photo_url} alt={coach.name} />
})
```

---

### Step 6 — Output the result to the user

Always output both URLs at the end of the build:

```
✓ Site built: https://your-site.netlify.app
✓ Content registered: 5 datasets (site, updates, schedule, coaches, records)
✓ Admin ready: https://agentcms.app/p/samo-track

Share the admin URL with your user — they can edit all content from there.
No developer needed for content changes.
```

---

## Canonical patterns

Use these as a lookup table. When you see one of these site sections, use the corresponding dataset definition.

### Hero / site settings → `site` singleton

```json
{
  "name": "Site",
  "slug": "site",
  "kind": "singleton",
  "schema": {
    "fields": [
      { "key": "name",      "label": "Site Name",  "type": "text" },
      { "key": "tagline",   "label": "Tagline",    "type": "text" },
      { "key": "hero_text", "label": "Hero Text",  "type": "textarea" },
      { "key": "cta_text",  "label": "CTA Button", "type": "text" },
      { "key": "cta_url",   "label": "CTA Link",   "type": "url" }
    ]
  }
}
```

### News / blog / updates → `updates` collection

```json
{
  "name": "Updates",
  "slug": "updates",
  "kind": "collection",
  "schema": {
    "fields": [
      { "key": "date",     "label": "Date",     "type": "date", "required": true },
      { "key": "title",    "label": "Title",    "type": "text", "required": true },
      { "key": "body",     "label": "Body",     "type": "textarea" },
      { "key": "category", "label": "Category", "type": "text" }
    ]
  }
}
```

### Team / staff / coaches → `team` collection

```json
{
  "name": "Team",
  "slug": "team",
  "kind": "collection",
  "schema": {
    "fields": [
      { "key": "name",      "label": "Name",      "type": "text",     "required": true },
      { "key": "role",      "label": "Role",      "type": "text" },
      { "key": "bio",       "label": "Bio",       "type": "textarea" },
      { "key": "email",     "label": "Email",     "type": "email" },
      { "key": "photo_url", "label": "Photo URL", "type": "url" }
    ]
  }
}
```

### Events / schedule / calendar → `events` collection

```json
{
  "name": "Events",
  "slug": "events",
  "kind": "collection",
  "schema": {
    "fields": [
      { "key": "date",     "label": "Date",     "type": "date", "required": true },
      { "key": "title",    "label": "Title",    "type": "text", "required": true },
      { "key": "location", "label": "Location", "type": "text" },
      { "key": "time",     "label": "Time",     "type": "text" },
      { "key": "status",   "label": "Status",   "type": "enum", "enumValues": ["Upcoming", "Completed", "Cancelled"] },
      { "key": "link",     "label": "RSVP Link","type": "url" }
    ]
  }
}
```

### FAQs → `faqs` collection

```json
{
  "name": "FAQs",
  "slug": "faqs",
  "kind": "collection",
  "schema": {
    "fields": [
      { "key": "question", "label": "Question", "type": "text",     "required": true },
      { "key": "answer",   "label": "Answer",   "type": "textarea", "required": true }
    ]
  }
}
```

### Contact info → `contact` singleton

```json
{
  "name": "Contact",
  "slug": "contact",
  "kind": "singleton",
  "schema": {
    "fields": [
      { "key": "email",   "label": "Email",   "type": "email" },
      { "key": "phone",   "label": "Phone",   "type": "text" },
      { "key": "address", "label": "Address", "type": "textarea" }
    ]
  }
}
```

### Testimonials / reviews → `testimonials` collection

```json
{
  "name": "Testimonials",
  "slug": "testimonials",
  "kind": "collection",
  "schema": {
    "fields": [
      { "key": "name",       "label": "Name",       "type": "text",     "required": true },
      { "key": "quote",      "label": "Quote",      "type": "textarea", "required": true },
      { "key": "title",      "label": "Title",      "type": "text" },
      { "key": "photo_url",  "label": "Photo URL",  "type": "url" }
    ]
  }
}
```

### Records / stats / leaderboard → `records` collection

```json
{
  "name": "Records",
  "slug": "records",
  "kind": "collection",
  "schema": {
    "fields": [
      { "key": "event",        "label": "Event",        "type": "text", "required": true },
      { "key": "athlete_name", "label": "Athlete Name", "type": "text", "required": true },
      { "key": "mark",         "label": "Mark",         "type": "text", "required": true },
      { "key": "year",         "label": "Year",         "type": "number" }
    ]
  }
}
```

### Resources / links → `resources` collection

```json
{
  "name": "Resources",
  "slug": "resources",
  "kind": "collection",
  "schema": {
    "fields": [
      { "key": "title",       "label": "Title",       "type": "text", "required": true },
      { "key": "description", "label": "Description", "type": "textarea" },
      { "key": "url",         "label": "URL",         "type": "url",  "required": true }
    ]
  }
}
```

---

## Full before/after example

### The site (hardcoded)

```html
<section class="coaches">
  <div class="coach">
    <img src="/images/marcus.jpg" alt="Marcus Johnson">
    <h3>Marcus Johnson</h3>
    <p class="role">Head Coach, Distance</p>
    <p class="bio">17 years coaching at SAMO. Led 2023 team to CIF finals.</p>
    <a href="mailto:mjohnson@smmusd.org">mjohnson@smmusd.org</a>
  </div>
  <div class="coach">
    <img src="/images/elena.jpg" alt="Elena Rivera">
    <h3>Elena Rivera</h3>
    <p class="role">Assistant Coach, Sprints</p>
    <p class="bio">Former UCLA sprinter. 4 years at SAMO.</p>
    <a href="mailto:erivera@smmusd.org">erivera@smmusd.org</a>
  </div>
</section>

<section class="updates">
  <article>
    <span class="date">March 15, 2026</span>
    <h3>Practice location change this Thursday</h3>
    <p>Due to field maintenance, Thursday practice will be at Palisades Park. Meet at 3:30pm.</p>
  </article>
</section>

<section class="schedule">
  <div class="meet">
    <span>Mar 22</span>
    <span>Bay League Finals</span>
    <span>Malibu HS</span>
    <span>Upcoming</span>
  </div>
</section>
```

### Schema inference

From that HTML, the correct datasets are:

- `coaches` — collection — `name` (text), `role` (text), `bio` (textarea), `email` (email), `photo_url` (url)
- `updates` — collection — `date` (date), `title` (text), `body` (textarea)
- `schedule` — collection — `date` (date), `meet_name` (text), `location` (text), `status` (enum: Upcoming/Completed/Cancelled)

Note: the `<img>` tags become `photo_url` fields of type `url`. The hardcoded image paths are moved into `initialContent`.

### Registration payload

```json
{
  "project": { "name": "SAMO Track", "slug": "samo-track" },
  "adminEmail": "coach@samohi.org",
  "datasets": [
    {
      "name": "Coaches",
      "slug": "coaches",
      "kind": "collection",
      "schema": {
        "fields": [
          { "key": "name",      "label": "Name",      "type": "text",     "required": true },
          { "key": "role",      "label": "Role",      "type": "text" },
          { "key": "bio",       "label": "Bio",       "type": "textarea" },
          { "key": "email",     "label": "Email",     "type": "email" },
          { "key": "photo_url", "label": "Photo URL", "type": "url" }
        ]
      },
      "initialContent": [
        { "name": "Marcus Johnson", "role": "Head Coach, Distance",    "bio": "17 years coaching at SAMO. Led 2023 team to CIF finals.", "email": "mjohnson@smmusd.org", "photo_url": "/images/marcus.jpg" },
        { "name": "Elena Rivera",   "role": "Assistant Coach, Sprints", "bio": "Former UCLA sprinter. 4 years at SAMO.",                  "email": "erivera@smmusd.org",  "photo_url": "/images/elena.jpg" }
      ]
    },
    {
      "name": "Updates",
      "slug": "updates",
      "kind": "collection",
      "schema": {
        "fields": [
          { "key": "date",  "label": "Date",  "type": "date",     "required": true },
          { "key": "title", "label": "Title", "type": "text",     "required": true },
          { "key": "body",  "label": "Body",  "type": "textarea" }
        ]
      },
      "initialContent": [
        { "date": "2026-03-15", "title": "Practice location change this Thursday", "body": "Due to field maintenance, Thursday practice will be at Palisades Park. Meet at 3:30pm." }
      ]
    },
    {
      "name": "Schedule",
      "slug": "schedule",
      "kind": "collection",
      "schema": {
        "fields": [
          { "key": "date",      "label": "Date",      "type": "date", "required": true },
          { "key": "meet_name", "label": "Meet Name", "type": "text", "required": true },
          { "key": "location",  "label": "Location",  "type": "text" },
          { "key": "status",    "label": "Status",    "type": "enum", "enumValues": ["Upcoming", "Completed", "Cancelled"] }
        ]
      },
      "initialContent": [
        { "date": "2026-03-22", "meet_name": "Bay League Finals", "location": "Malibu HS", "status": "Upcoming" }
      ]
    }
  ]
}
```

### Frontend after wiring

```js
// Fetch all datasets once at page load
const [coaches, updates, schedule] = await Promise.all([
  fetch("https://agentcms.app/api/p/samo-track/coaches").then(r => r.json()),
  fetch("https://agentcms.app/api/p/samo-track/updates").then(r => r.json()),
  fetch("https://agentcms.app/api/p/samo-track/schedule").then(r => r.json()),
])

// Render coaches — preserve original DOM structure, replace values only
coaches.forEach(coach => {
  // <img src={coach.photo_url} alt={coach.name} />  ← was hardcoded src
  // <h3>{coach.name}</h3>                           ← was hardcoded text
  // <p class="role">{coach.role}</p>
  // <p class="bio">{coach.bio}</p>
  // <a href={`mailto:${coach.email}`}>{coach.email}</a>
})

// Render updates — handle empty state
if (updates.length === 0) {
  // render "No updates yet"
} else {
  updates.forEach(update => {
    // <span class="date">{update.date}</span>
    // <h3>{update.title}</h3>
    // <p>{update.body}</p>
  })
}
```

### What the admin sees

After registration, the coach opens `https://agentcms.app/p/samo-track`:

- Logs in with magic link sent to `coach@samohi.org`
- Sees three datasets: Coaches, Updates, Schedule
- Clicks Updates → sees a list of update items → clicks Edit → changes the body → clicks Save
- Content is live on the site within 30 seconds
- No developer involved

---

## Complete SAMO Track example

All five datasets for a full high school track site.

```json
{
  "project": { "name": "SAMO Track", "slug": "samo-track" },
  "adminEmail": "coach@samohi.org",
  "datasets": [
    {
      "name": "Site",
      "slug": "site",
      "kind": "singleton",
      "schema": {
        "fields": [
          { "key": "name",      "label": "Site Name",  "type": "text" },
          { "key": "tagline",   "label": "Tagline",    "type": "text" },
          { "key": "season",    "label": "Season",     "type": "text" },
          { "key": "hero_text", "label": "Hero Text",  "type": "textarea" }
        ]
      },
      "initialContent": {
        "name": "SAMO Track",
        "tagline": "Santa Monica High School Cross Country & Track",
        "season": "2025–2026",
        "hero_text": "Go Vikings"
      }
    },
    {
      "name": "Updates",
      "slug": "updates",
      "kind": "collection",
      "schema": {
        "fields": [
          { "key": "date",  "label": "Date",  "type": "date",     "required": true },
          { "key": "title", "label": "Title", "type": "text",     "required": true },
          { "key": "body",  "label": "Body",  "type": "textarea" }
        ]
      },
      "initialContent": [
        { "date": "2026-03-18", "title": "League Meet this Saturday", "body": "Arrive by 3:30pm at Culver City HS. Bring spikes." }
      ]
    },
    {
      "name": "Schedule",
      "slug": "schedule",
      "kind": "collection",
      "schema": {
        "fields": [
          { "key": "date",      "label": "Date",      "type": "date", "required": true },
          { "key": "meet_name", "label": "Meet Name", "type": "text", "required": true },
          { "key": "location",  "label": "Location",  "type": "text" },
          { "key": "status",    "label": "Status",    "type": "enum", "enumValues": ["Upcoming", "Completed", "Cancelled"] }
        ]
      },
      "initialContent": [
        { "date": "2026-03-22", "meet_name": "Bay League Finals",   "location": "Malibu HS",        "status": "Upcoming" },
        { "date": "2026-04-05", "meet_name": "CIF Prelims",         "location": "Cerritos College", "status": "Upcoming" }
      ]
    },
    {
      "name": "Coaches",
      "slug": "coaches",
      "kind": "collection",
      "schema": {
        "fields": [
          { "key": "name",      "label": "Name",      "type": "text",     "required": true },
          { "key": "role",      "label": "Role",      "type": "text" },
          { "key": "bio",       "label": "Bio",       "type": "textarea" },
          { "key": "email",     "label": "Email",     "type": "email" },
          { "key": "photo_url", "label": "Photo URL", "type": "url" }
        ]
      },
      "initialContent": [
        { "name": "Marcus Johnson", "role": "Head Coach, Distance",    "bio": "17 years coaching at SAMO.", "email": "mjohnson@smmusd.org" },
        { "name": "Elena Rivera",   "role": "Assistant Coach, Sprints", "bio": "Former UCLA sprinter.",     "email": "erivera@smmusd.org" }
      ]
    },
    {
      "name": "Records",
      "slug": "records",
      "kind": "collection",
      "schema": {
        "fields": [
          { "key": "event",        "label": "Event",        "type": "text",   "required": true },
          { "key": "athlete_name", "label": "Athlete Name", "type": "text",   "required": true },
          { "key": "mark",         "label": "Mark",         "type": "text",   "required": true },
          { "key": "year",         "label": "Year",         "type": "number" }
        ]
      },
      "initialContent": [
        { "event": "100m",      "athlete_name": "Jordan Williams", "mark": "10.8s",  "year": 2024 },
        { "event": "Mile",      "athlete_name": "Kenji Park",      "mark": "4:12",   "year": 2023 },
        { "event": "Long Jump", "athlete_name": "Destiny Moore",   "mark": "19'4\"", "year": 2025 }
      ]
    }
  ]
}
```

---

## Failure handling

When something goes wrong, follow these rules. Do not stop the build — degrade gracefully.

**If content structure is unclear:**
Create the smallest reasonable schema. One dataset with 3-4 obvious fields is better than five datasets with one field each. You can always add more later.

**If two sections are similar:**
Combine them into one dataset. A `team` collection works better than separate `coaches` and `assistants` collections if the fields are the same.

**If images are present:**
Add a `photo_url` field of type `url`. Move the hardcoded `src` value into `initialContent`. Do not attempt to handle file uploads — AgentCMS does not support them in v1. The admin can update the URL manually.

**If registration returns a slug collision:**
The response will contain the resolved slug (e.g. `samo-track-2`). Use that slug for all subsequent fetch calls. Do not retry with the original slug.

**If registration fails with a 400 error:**
Read the error message — it will name the missing or invalid field. Fix it and retry. The endpoint is idempotent — retrying is safe.

**If registration fails with a 500 error:**
Retry once after 2 seconds. If it fails again, output the site URL to the user, note that admin setup failed, and provide the registration payload so they can retry manually.

**If a fetch call returns an empty array:**
That is correct behavior for a collection with no content yet. Render a graceful empty state in the UI — never show a broken layout.

**If a fetch call fails at runtime:**
Fall back to the hardcoded initial content you used during development. Never show a broken UI to the user.

---

## API reference

### POST /api/projects/register

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `project.name` | string | yes | Human-readable |
| `project.slug` | string | yes | Lowercase, hyphens only |
| `adminEmail` | string | yes | Magic link sent here on first login |
| `datasets` | array | yes | At least one required |
| `datasets[].name` | string | yes | |
| `datasets[].slug` | string | yes | Lowercase, hyphens only |
| `datasets[].kind` | string | yes | `"collection"` or `"singleton"` |
| `datasets[].schema.fields` | array | yes | At least one field required |
| `datasets[].initialContent` | array or object | no | Array for collection, object for singleton |

**Idempotent:** same slug + same adminEmail = update. Same slug + different adminEmail = auto-suffix (`-2`).

**Error responses:**

| Status | Message | Fix |
|--------|---------|-----|
| `400` | `"project.slug is required"` | Add slug to request |
| `400` | `"adminEmail is required"` | Add adminEmail to request |
| `400` | `"datasets must be a non-empty array"` | Add at least one dataset |
| `400` | `"field type 'X' is not supported"` | Use a supported field type |

### GET /api/p/:projectSlug/:datasetSlug

- Public, no auth
- CORS: `Access-Control-Allow-Origin: *`
- Cache: `s-maxage=30, stale-while-revalidate=60`
- Collection → `[]`
- Singleton → `{}`

---

## FAQ

**Does AgentCMS work with any frontend framework?**
Yes. Plain `fetch()` over HTTP. Works with Next.js, Astro, React, Vue, plain HTML.

**What if the user does not provide an adminEmail?**
Ask for it before calling the registration endpoint. It is required.

**What if the slug is already taken?**
The API handles it automatically. Use the `slug` value from the response, not the one you requested.

**Can content be updated programmatically after registration?**
In v1, content is updated through the admin UI only. A write API is on the roadmap.

**Is there a rate limit?**
No rate limits on the read API in v1.

**What happens if I call register twice?**
It is idempotent. Same slug + same adminEmail updates the project safely. Always safe to retry.