import Link from 'next/link';
import { ArrowRight, BookOpen, Terminal } from 'lucide-react';
import { CONSOLE_URL } from '@/lib/layout.shared';

const CATEGORIES = [
  { label: 'Organize', body: 'Merge, split, reorder, rotate, crop and extract pages.' },
  { label: 'Edit', body: 'Watermarks, page numbers and document metadata.' },
  { label: 'Convert', body: 'Images to PDF, and text back out of one.' },
  { label: 'Forms', body: 'Fill, flatten and extract PDF form data.' },
];

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-20 sm:py-28">
      <section>
        <p className="type-eyebrow text-muted-foreground">Free &amp; open source</p>
        <h1 className="type-hero mt-4 max-w-3xl text-balance">Every PDF tool, in one place.</h1>
        <p className="type-body mt-5 max-w-xl text-muted-foreground">
          Merge, split, convert, watermark and more — in the browser or over HTTP. The console and
          external clients run on exactly the same REST API.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {/* Plain <a>: the console is a separate Worker, so Next's <Link> must
              not prepend basePath to an already-absolute path. */}
          <a
            href={CONSOLE_URL}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 type-body font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Terminal className="size-4" />
            Open the console
            <ArrowRight className="size-4" />
          </a>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 rounded-lg bg-surface-2 px-4 py-2.5 type-body font-medium transition-colors hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <BookOpen className="size-4" />
            Read the docs
          </Link>
        </div>
      </section>

      <section className="mt-20">
        <h2 className="type-section">What&rsquo;s inside</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <div key={c.label} className="rounded-xl bg-surface-2 p-4">
              <h3 className="type-body font-semibold">{c.label}</h3>
              <p className="type-caption mt-1 text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
