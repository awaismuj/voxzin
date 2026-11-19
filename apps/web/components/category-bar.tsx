import Link from 'next/link';
import { Briefcase, Clapperboard, Coffee, Cpu, FlaskConical, Globe, MessagesSquare, Sparkles, Trophy, type LucideIcon } from 'lucide-react';
import { getCategories } from '@/lib/api';
import { uniqueCategories } from '@/lib/nav';

const ICONS: Record<string, LucideIcon> = {
  technology: Cpu,
  ai: Sparkles,
  business: Briefcase,
  world: Globe,
  entertainment: Clapperboard,
  sports: Trophy,
  science: FlaskConical,
  lifestyle: Coffee,
  'internet-culture': MessagesSquare,
};

export async function CategoryBar() {
  const categories = await getCategories();
  return (
    <nav aria-label="Browse sections" className="mx-auto mt-8 w-full px-4 sm:px-6">
      <ul className="flex gap-2 overflow-x-auto rounded-xl bg-navy p-2">
        {uniqueCategories(categories).map((c) => {
          const Icon = ICONS[c.slug] ?? Globe;
          return (
            <li key={c.slug} className="shrink-0 grow">
              <Link
                href={`/${c.slug}`}
                className="flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white"
              >
                <Icon className="size-4 text-accent" aria-hidden />
                {c.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
