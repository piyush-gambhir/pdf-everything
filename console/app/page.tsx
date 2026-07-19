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
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          Every PDF tool you need.
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Free and open-source. Same REST API powers the UI and external clients —
          see <Link className="underline" href="http://localhost:3001/api/docs">/api/docs</Link>.
        </p>
      </div>

      {[...grouped.entries()].map(([cat, tools]) => {
        const meta = CATEGORY_META[cat as keyof typeof CATEGORY_META];
        if (!meta) return null;
        return (
          <section key={cat} className="mb-10">
            <div className="mb-4">
              <h2 className="text-lg font-medium">{meta.label}</h2>
              <p className="text-sm text-muted-foreground">{meta.description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((t) => {
                const Icon = t.Icon;
                return (
                  <Link key={t.id} href={`/${t.id}`} className="group">
                    <Card className="h-full transition-colors group-hover:border-foreground/30 group-hover:bg-muted/30">
                      <CardHeader>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                            <Icon className="size-4" />
                          </span>
                          <CardTitle className="text-base">{t.title}</CardTitle>
                          <ArrowRight className="ml-auto size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                        <CardDescription className="text-xs">{t.description}</CardDescription>
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
