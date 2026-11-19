import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description: 'Terms for accessing VoxZin, using its content and interacting with its website.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-accent-ink">Legal</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight">Terms and Conditions</h1>
      <p className="mt-3 text-sm text-muted">Effective date: November 17, 2026</p>
      <div className="article-body mt-8">
        <p>
          These terms apply when you access voxzin.com. By using the website, you agree to use it lawfully and in accordance with these terms. If you do not agree, please stop using the site.
        </p>

        <h2>Editorial content is informational</h2>
        <p>
          VoxZin publishes news, explainers, commentary and general information. Content is provided for informational purposes, not as medical, legal, financial, investment or other professional advice. It may become outdated, and it may not suit your circumstances. Verify important information with primary sources and a qualified professional before relying on it.
        </p>
        <p>
          We work to make coverage accurate and useful, but information can be incomplete, out of date, disputed or mistaken. We cannot guarantee that every article, image, translation, summary, trend indicator or other item is completely accurate or current. Verify important claims with original documents, official sources and other reliable reporting before relying on them. Contact us if you believe something needs correction.
        </p>

        <h2>Third-party sources and trend information</h2>
        <p>
          Our reporting and summaries may draw on information published by other websites, news organizations, public institutions and other third-party sources. We identify or link to sources where available, but a citation does not mean that VoxZin controls or independently confirms every statement on the source site. Sources may change, remove or correct material after we publish.
        </p>
        <p>
          Some search-interest or trend information may be based on data or tools provided by Google or other third parties, and may reflect activity or information gathered across third-party services or websites. These signals can be estimated, sampled, delayed or changed by their providers. They describe interest, not whether a claim is true, how many people hold a view, or what will happen next. Google and other providers are independent of VoxZin; use of their information does not imply their endorsement.
        </p>

        <h2>Artificial intelligence and images</h2>
        <p>
          Some images or illustrations may be generated or edited with artificial intelligence. Unless an image is clearly identified as a photograph or otherwise described, do not assume it is a documentary image of a real person, place or event. AI-generated or AI-edited visuals may contain invented or inaccurate details and are illustrative, not evidence that an event happened exactly as shown. We may also use images from third-party sources, subject to the applicable rights and attribution.
        </p>

        <h2>Intellectual property</h2>
        <p>
          Unless otherwise stated, VoxZin website design, branding and original editorial material are protected by applicable intellectual-property laws. You may access and share links to our public pages for personal, non-commercial use. Reproduction, republication, commercial use or substantial copying requires permission from the relevant rights holder. Third-party material remains the property of its respective owner and should be used in accordance with its license and attribution requirements.
        </p>

        <h2>Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>use the website in violation of applicable law or another person&apos;s rights;</li>
          <li>attempt to gain unauthorized access to accounts, systems or data, or interfere with the website&apos;s security or operation;</li>
          <li>introduce malicious code, send abusive traffic, or use automated access in a way that disrupts the service; or</li>
          <li>misrepresent VoxZin content, authorship, endorsement or sources.</li>
        </ul>

        <h2>Third-party websites</h2>
        <p>
          Articles and pages may link to external websites for reference or convenience. VoxZin does not control and is not responsible for third-party content, services, availability or privacy practices. A link does not necessarily mean endorsement.
        </p>

        <h2>Limitation and changes</h2>
        <p>
          To the extent allowed by applicable law, VoxZin is not liable for indirect or consequential loss arising from use of, or inability to use, the website or reliance on its general informational content. Nothing in these terms limits liability where the law does not permit that limitation, or affects rights that cannot legally be excluded.
        </p>
        <p>
          We may update the website or these terms. Changes take effect when posted, with the effective date revised above. Continued use after a change means you accept the updated terms.
        </p>

        <h2>Contact</h2>
        <p>
          For questions about these terms or permissions to reuse content, contact VoxZin using the email address shown in the site footer.
        </p>
        <p className="text-sm text-muted">
          These terms are a general draft and are not legal advice. The site operator should have them reviewed for the operator&apos;s identity, jurisdiction, applicable consumer laws and intended content licensing.
        </p>
      </div>
    </article>
  );
}
