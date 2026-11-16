import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'About Voxzin',
  description: 'Learn about Voxzin, our coverage, and the editorial principles behind our global news and insights.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-accent-ink">About us</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight">The voice of today's trending stories.</h1>
      <div className="article-body mt-8">
        <p>
          Voxzin is an independent digital publication covering the developments, ideas and conversations shaping people&apos;s lives. We make complex and fast-moving topics easier to understand, with context readers can use.
        </p>

        <h2>What we cover</h2>
        <p>
          Our coverage spans global news, technology, artificial intelligence, business, science, culture, sports and practical lifestyle topics. We publish explainers, analysis, reported updates and stories about subjects attracting public attention.
        </p>

        <h2>Our editorial approach</h2>
        <ul>
          <li>We aim for accuracy, clarity, fairness and useful context.</li>
          <li>We prefer primary documents, official sources, research institutions and reputable reporting when verifying claims.</li>
          <li>We distinguish established facts from estimates, uncertainty and commentary.</li>
          <li>We correct material errors when identified and update stories when significant facts change.</li>
          <li>We do not promise that a topic is trending, breaking or current unless the available evidence supports that description.</li>
        </ul>

        <h2>Technology and editorial responsibility</h2>
        <p>
          Digital tools, including artificial intelligence, may assist parts of research or production. They do not make a claim true: published material should be checked for accuracy, sourcing and context, and tools are not represented as human authors. We do not publish fabricated sources, quotations or statistics.
        </p>

        <h2>Corrections and contact</h2>
        <p>
          If you spot a factual error or have a question about our work, contact us using the email address shown in the site footer. Voxzin values specific, verifiable feedback and will review it.
        </p>

        <p><strong>Voxzin — The voice of today's trending stories.</strong></p>
      </div>
    </article>
  );
}
