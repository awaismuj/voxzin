import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Read how VoxZin handles newsletter details, essential account cookies and information needed to operate and protect the website.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-accent-ink">Legal</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight">Privacy Policy</h1>
      <p className="mt-3 text-sm text-muted">Effective date: November 13, 2026</p>
      <div className="article-body mt-8">
        <p>
          This notice describes how VoxZin handles information when you visit voxzin.com, subscribe to our newsletter, or use an authorized administration account. It is intended to explain the site&apos;s current practices; the identity of the legal operator and any rights that apply depend on where the operator and reader are located.
        </p>

        <h2>Information we handle</h2>
        <ul>
          <li><strong>Newsletter:</strong> If you subscribe, we process your email address and subscription status. We send a confirmation message before adding you to the confirmed mailing list. You can unsubscribe using the unsubscribe link or contact us.</li>
          <li><strong>Administration and security:</strong> If you have an authorized account, we process account details and authentication information. The site uses an essential, HTTP-only session cookie for sign-in. Authentication and security records may include IP address, browser user-agent, session expiry and administrative actions.</li>
          <li><strong>Media and editorial operations:</strong> Images and descriptions submitted by authorized editors may be stored and displayed as part of published content.</li>
          <li><strong>Technical information:</strong> The website host, content-delivery network and security services may process request and device information, such as IP address, browser details and access times, to deliver and protect the site.</li>
        </ul>

        <h2>Cookies and similar technologies</h2>
        <p>
          The VoxZin application uses a session cookie for administrator authentication; it is not used to sign ordinary readers into accounts. The cookie is configured as HTTP-only and same-site, and is secure in production. Hosting, CDN or security providers may use their own technologies to operate or protect the service. Your browser can control or block cookies, but blocking essential cookies may prevent administrator sign-in.
        </p>

        <h2>How information is used</h2>
        <p>
          We use information to provide the requested newsletter, operate the editorial system, secure accounts, prevent abuse, maintain the website, and respond to requests. The current website application does not include a configured advertising pixel or analytics product. If that changes, this notice should be updated and any legally required choices or consent should be provided.
        </p>

        <h2>Service providers and retention</h2>
        <p>
          Information may be processed by providers that host the site or database, deliver email, provide CDN or security services, or support authorized site operations. We do not sell personal information. We retain information for as long as needed for the purposes above, to maintain subscription choices and security records, and to meet applicable legal obligations. Retention periods may differ by record type.
        </p>

        <h2>Choices and privacy requests</h2>
        <p>
          You may unsubscribe from the newsletter at any time using its unsubscribe link. Depending on your location, you may also have rights to request access, correction, deletion, restriction or portability of personal information, or to object to certain processing. Contact us using the email address in the site footer; we may need to verify your request and may retain information where the law permits or requires it.
        </p>

        <h2>Children and external links</h2>
        <p>
          VoxZin is a general-audience publication and is not designed to collect personal information from children. Our pages may link to third-party websites; their privacy practices are governed by their own notices, not this policy.
        </p>

        <h2>Changes and contact</h2>
        <p>
          We may revise this policy as the website or applicable requirements change. The effective date above identifies the latest revision. For privacy questions or requests, use the contact email shown in the site footer.
        </p>
        <p className="text-sm text-muted">
          This notice is general website information, not legal advice. The site operator should confirm the applicable jurisdiction, data-controller identity, provider details and retention requirements before relying on it as a complete legal notice.
        </p>
      </div>
    </article>
  );
}
