import Link from 'next/link';
import {
  ArrowRight,
  Blocks,
  BookOpen,
  Box,
  Braces,
  Check,
  Cloud,
  Code2,
  Container,
  FileStack,
  GitFork,
  Layers3,
  LockKeyhole,
  MonitorUp,
  ServerCog,
  Sparkles,
  Terminal,
  Workflow,
} from 'lucide-react';

import { CONSOLE_URL, REPOSITORY_URL } from '@/lib/layout.shared';

const TOOL_GROUPS = [
  {
    label: 'Organize',
    count: 7,
    icon: FileStack,
    body: 'Merge, split, rotate, crop, reorder, remove, and extract pages.',
  },
  {
    label: 'Edit',
    count: 3,
    icon: Sparkles,
    body: 'Add watermarks and page numbers, or update document metadata.',
  },
  {
    label: 'Convert',
    count: 4,
    icon: Braces,
    body: 'Create PDFs from images, HTML, or Markdown, and extract text.',
  },
  {
    label: 'Forms',
    count: 3,
    icon: Blocks,
    body: 'Inspect fields, fill values, and flatten interactive forms.',
  },
  {
    label: 'Page geometry',
    count: 2,
    icon: Layers3,
    body: 'Resize pages or convert a document to a standard page size.',
  },
  {
    label: 'One API',
    count: 19,
    icon: Code2,
    body: 'Every console action maps to the same versioned public REST API.',
  },
];

const DEPLOYMENT_LAYERS = [
  {
    icon: MonitorUp,
    title: 'Web + docs',
    body: 'Static Next.js output that can live on a CDN or edge asset host.',
  },
  {
    icon: ServerCog,
    title: 'Nest API gateway',
    body: 'The stable public contract for validation, uploads, results, and policy.',
  },
  {
    icon: Container,
    title: 'Execution workers',
    body: 'Two independently scalable images: PDF core and Chromium rendering.',
  },
];

export default function HomePage() {
  return (
    <main className="flex-1">
      <section className="hero-section site-section-inner grid min-h-svh gap-10 pb-16 sm:pb-20 lg:grid-cols-[minmax(0,1.08fr)_minmax(24rem,0.92fr)] lg:items-center lg:gap-[clamp(3rem,6vw,7rem)] lg:pb-24">
        <div>
          <div className="type-eyebrow inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1.5 text-brand">
            <Sparkles className="size-3.5" />
            Open-source PDF infrastructure
          </div>
          <h1 className="type-hero mt-5 max-w-3xl text-balance">
            Every PDF workflow.
            <span className="block text-brand">One clean API.</span>
          </h1>
          <p className="type-body mt-6 max-w-2xl text-pretty text-muted-foreground sm:text-[1rem]">
            Use the polished console, call the REST API directly, or self-host the complete stack.
            The UI and external clients use the same versioned endpoints and execution workers.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={CONSOLE_URL}
              className="type-body inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 font-semibold text-brand-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Terminal className="size-4" />
              Open the console
              <ArrowRight className="size-4" />
            </a>
            <Link
              href="/docs"
              className="type-body inline-flex h-11 items-center gap-2 rounded-xl bg-surface-2 px-5 font-semibold transition-colors hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <BookOpen className="size-4" />
              Read the docs
            </Link>
            <a
              href={REPOSITORY_URL}
              className="type-body inline-flex h-11 items-center gap-2 rounded-xl px-3 font-medium text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <GitFork className="size-4" />
              GitHub
            </a>
          </div>

          <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
            <div>
              <dt className="type-display">19</dt>
              <dd className="type-caption text-muted-foreground">PDF operations</dd>
            </div>
            <div>
              <dt className="type-display">2</dt>
              <dd className="type-caption text-muted-foreground">execution workers</dd>
            </div>
            <div>
              <dt className="type-display">1</dt>
              <dd className="type-caption text-muted-foreground">public API contract</dd>
            </div>
          </dl>
        </div>

        <div className="overflow-hidden rounded-2xl bg-[#111113] text-white shadow-2xl shadow-black/10">
          <div className="flex items-center justify-between bg-white/5 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#ff6b6b]" />
              <span className="size-2 rounded-full bg-[#ffd43b]" />
              <span className="size-2 rounded-full bg-[#51cf66]" />
            </div>
            <span className="font-mono text-[11px] text-white/45">merge.pdf.sh</span>
          </div>
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-[#9b8cff] uppercase">
              <Workflow className="size-3.5" />
              Same request the console sends
            </div>
            <pre className="mt-5 overflow-x-auto font-mono text-[12px] leading-6 text-white/80">
              <code>
                <span className="text-[#9b8cff]">curl</span> -X POST{` \\\n`}
                {'  '}$API_ORIGIN/api/v1/organize/merge{` \\\n`}
                {'  '}-F <span className="text-[#8ce99a]">&quot;files=@one.pdf&quot;</span>
                {` \\\n`}
                {'  '}-F <span className="text-[#8ce99a]">&quot;files=@two.pdf&quot;</span>
                {` \\\n`}
                {'  '}-F <span className="text-[#8ce99a]">&apos;options=&#123;&#125;&apos;</span>
                {` \\\n`}
                {'  '}-o merged.pdf
              </code>
            </pre>

            <div className="mt-6 grid grid-cols-2 gap-2">
              {[
                'Validated by Nest',
                'Executed by workers',
                'Streams the result',
                'RFC 9457 errors',
              ].map((item) => (
                <div
                  key={item}
                  className="type-caption flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2.5 text-white/70"
                >
                  <Check className="size-3.5 text-[#8ce99a]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="toolbox" className="min-h-svh bg-surface-1">
        <div className="site-section-inner flex min-h-svh flex-col justify-center py-16 sm:py-20">
          <div className="max-w-2xl">
            <p className="type-eyebrow text-brand">Toolbox</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
              The common jobs are already wired.
            </h2>
            <p className="type-body mt-3 text-muted-foreground">
              Every tool has a purpose-built console workflow, validated request schema, worker
              implementation, and documented endpoint.
            </p>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TOOL_GROUPS.map(({ label, count, icon: Icon, body }) => (
              <article
                key={label}
                className="group rounded-2xl bg-surface-2 p-5 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                    <Icon className="size-4.5" />
                  </span>
                  <span className="type-caption rounded-full bg-surface-3 px-2.5 py-1 text-muted-foreground">
                    {count} {count === 1 ? 'operation' : 'operations'}
                  </span>
                </div>
                <h3 className="type-title mt-5">{label}</h3>
                <p className="type-caption mt-1.5 text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="architecture"
        className="site-section-inner flex min-h-svh items-center py-16 sm:py-24"
      >
        <div className="grid w-full gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-16">
          <div className="lg:sticky lg:top-24">
            <p className="type-eyebrow text-brand">Architecture</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
              Simple where it should be. Isolated where it matters.
            </h2>
            <p className="type-body mt-4 text-muted-foreground">
              Next.js stays focused on presentation. Nest owns the public contract. Heavy PDF and
              browser work stays inside separately scalable workers.
            </p>
            <Link
              href="/docs/architecture"
              className="type-body mt-6 inline-flex items-center gap-2 font-semibold text-brand hover:opacity-75"
            >
              Explore the architecture
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {[
              {
                icon: MonitorUp,
                step: '01',
                title: 'Console or external client',
                body: 'Choose a visual workflow or send the same HTTP request yourself.',
              },
              {
                icon: LockKeyhole,
                step: '02',
                title: 'NestJS API gateway',
                body: 'Validate input, enforce policy, persist results, and route execution.',
              },
              {
                icon: Box,
                step: '03',
                title: 'Purpose-built worker',
                body: 'Run PDF core operations or Chromium rendering in the right runtime.',
              },
            ].map(({ icon: Icon, step, title, body }) => (
              <article
                key={step}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl bg-surface-1 p-5 sm:p-6"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-surface-2 text-brand">
                  <Icon className="size-5" />
                </span>
                <div>
                  <h3 className="type-title">{title}</h3>
                  <p className="type-caption mt-1 text-muted-foreground">{body}</p>
                </div>
                <span className="font-mono text-xs text-subtle-foreground">{step}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="deployment" className="min-h-svh bg-[#111113] text-white">
        <div className="site-section-inner flex min-h-svh flex-col justify-center py-16 sm:py-20">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="type-eyebrow text-[#9b8cff]">Deploy your way</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
                Public images. Private documents.
              </h2>
              <p className="type-body mt-4 text-white/60">
                The source and worker images are public. Your documents remain inside the
                infrastructure you choose and control.
              </p>
            </div>
            <Link
              href="/docs/deployment"
              className="type-body inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-xl bg-white px-4 font-semibold text-black transition-opacity hover:opacity-90 md:self-auto"
            >
              Deployment guide
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="mt-9 grid gap-3 md:grid-cols-3">
            {DEPLOYMENT_LAYERS.map(({ icon: Icon, title, body }) => (
              <article key={title} className="rounded-2xl bg-white/5 p-5">
                <Icon className="size-5 text-[#9b8cff]" />
                <h3 className="type-title mt-5">{title}</h3>
                <p className="type-caption mt-1.5 text-white/55">{body}</p>
              </article>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl bg-white/5 px-5 py-4 text-[12px] text-white/55">
            <span className="flex items-center gap-2">
              <Cloud className="size-3.5 text-[#8ce99a]" />
              Cloud Run, Lambda, ECS, Kubernetes, or Docker
            </span>
            <span className="flex items-center gap-2">
              <Container className="size-3.5 text-[#8ce99a]" />
              Immutable image tags
            </span>
            <span className="flex items-center gap-2">
              <LockKeyhole className="size-3.5 text-[#8ce99a]" />
              Private worker boundary
            </span>
          </div>
        </div>
      </section>

      <footer className="min-h-svh bg-brand-soft">
        <div className="site-section-inner flex min-h-svh flex-col">
          <div className="flex flex-1 items-center justify-center py-24 sm:py-28">
            <div className="w-full max-w-5xl text-center">
              <p className="type-eyebrow text-brand">Ready to use</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
                Start in the console. Keep the API.
              </h2>
              <p className="type-body mx-auto mt-5 max-w-2xl text-muted-foreground">
                Test a workflow visually, then move the same operation into your application without
                learning a second system.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a
                  href={CONSOLE_URL}
                  className="type-body inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 font-semibold text-brand-foreground"
                >
                  Open the console
                  <ArrowRight className="size-4" />
                </a>
                <Link
                  href="/docs/quickstart"
                  className="type-body inline-flex h-11 items-center gap-2 rounded-xl bg-background px-5 font-semibold text-foreground"
                >
                  API quickstart
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5 pb-7 sm:flex-row sm:items-end sm:justify-between sm:pb-9">
            <div>
              <p className="type-section">pdf-everything</p>
              <p className="type-caption mt-1 text-muted-foreground">
                Open-source PDF infrastructure for your own applications.
              </p>
            </div>
            <nav
              aria-label="Footer"
              className="type-caption flex flex-wrap items-center gap-x-5 gap-y-2 text-muted-foreground"
            >
              <Link href="/docs" className="hover:text-foreground">
                Documentation
              </Link>
              <Link href="/docs/deployment" className="hover:text-foreground">
                Deployment
              </Link>
              <a href={CONSOLE_URL} className="hover:text-foreground">
                Console
              </a>
              <a href={REPOSITORY_URL} className="hover:text-foreground">
                GitHub
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}
