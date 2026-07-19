import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { TOOLS } from '@/lib/tools/registry';
import { CATEGORY_META } from '@/lib/tools/types';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function HomePage() {
  const grouped = new Map<string, typeof TOOLS>();
  for (const t of TOOLS) {
    const list = grouped.get(t.category) ?? [];
    list.push(t);
    grouped.set(t.category, list);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 pt-2 pb-14">
      {[...grouped.entries()].map(([cat, tools]) => {
        const meta = CATEGORY_META[cat as keyof typeof CATEGORY_META];
        if (!meta) return null;
        return (
          <section key={cat} className="mb-10">
            <div className="mb-3.5">
              <h2 className="type-section">{meta.label}</h2>
              <p className="type-caption text-muted-foreground">{meta.description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((t) => {
                const Icon = t.Icon;
                return (
                  <Link
                    key={t.id}
                    href={`/${t.id}`}
                    className="group rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {/* Borderless: the card reads as a raised surface, and lifts
                        one more step on hover instead of gaining an outline. */}
                    <Card className="h-full bg-surface-2 transition-colors group-hover:bg-surface-3">
                      <CardHeader>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                            <Icon className="size-4" />
                          </span>
                          <CardTitle className="type-body font-semibold">{t.title}</CardTitle>
                          <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                        <CardDescription className="type-caption">
                          {t.description}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="mt-12 text-xs text-muted-foreground">
        More tools rolling out across edit, optimize, convert, security, OCR, and forms categories.
      </p>
    </div>
  );
}
