import { card } from '@/components/admin/ui';
import { adminGet, requireRole } from '@/lib/admin-server';

type SecurityOverview = {
  requestInspectionActive: boolean;
  requestsObserved: number;
  startedAt: string;
  securityEvents: number;
  blockedRequests: number;
  suspiciousIps: number;
  temporaryBlocks: number;
  attackClassifications: { attack: string; count: number }[];
  activeTemporaryBlocks: { sourceIp: string; expiresAt: string }[];
  recentEvents: {
    timestamp: string;
    sourceIp: string;
    attack: string;
    rule: string;
    request: string;
    action: string;
    status: number;
  }[];
};

const dateTime = (value: string) => new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export default async function SecurityPage() {
  await requireRole('super_admin', 'admin');
  const overview = await adminGet<SecurityOverview>('/admin/security/overview');
  const metrics = [
    { title: 'Requests observed', value: overview.requestsObserved, note: `Since ${dateTime(overview.startedAt)}` },
    { title: 'Security events', value: overview.securityEvents, note: 'Last 24 hours' },
    { title: 'Requests blocked', value: overview.blockedRequests, note: 'Last 24 hours' },
    { title: 'Suspicious IPs', value: overview.suspiciousIps, note: 'Among the latest 100 events' },
    { title: 'Temporary blocks', value: overview.temporaryBlocks, note: 'Active on this API instance' },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Origin Guard</h1>
          <p className="mt-2 text-sm text-muted">Request inspection and security events from this API instance.</p>
        </div>
        <a href="/admin/security" className="rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium hover:bg-bg">Refresh</a>
      </header>

      <section className="space-y-5 rounded-xl bg-navy p-4 text-white sm:p-6" aria-label="Origin Guard status and events">
        <p role="status" className="flex items-center gap-2 text-sm">
          <span aria-hidden="true" className={overview.requestInspectionActive ? 'text-green-400' : 'text-red-400'}>●</span>
          Request inspection {overview.requestInspectionActive ? 'active' : 'inactive'}
        </p>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {metrics.map((metric) => (
            <div key={metric.title} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-white/65">{metric.title}</p>
              <p className="mt-2 text-3xl font-semibold">{metric.value.toLocaleString()}</p>
              <p className="mt-1 text-xs text-white/60">{metric.note}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_2fr]">
          <section className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h2 className="font-semibold">Attack classifications</h2>
            {overview.attackClassifications.length === 0 ? (
              <p className="mt-3 text-sm text-white/65">No security events in the last 24 hours.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {overview.attackClassifications.map((item) => (
                  <li key={item.attack} className="flex justify-between gap-3">
                    <span>{item.attack}</span><strong>{item.count}</strong>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h2 className="font-semibold">Active temporary blocks</h2>
            {overview.activeTemporaryBlocks.length === 0 ? (
              <p className="mt-3 text-sm text-white/65">No temporary blocks active.</p>
            ) : (
              <ul className="mt-3 divide-y divide-white/10 text-sm">
                {overview.activeTemporaryBlocks.map((block) => (
                  <li key={block.sourceIp} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>{block.sourceIp}</span><span className="text-white/65">Expires {dateTime(block.expiresAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
          <div className="border-b border-white/10 p-4">
            <h2 className="font-semibold">Recent security events</h2>
            <p className="mt-1 text-xs text-white/60">Latest {overview.recentEvents.length} blocked requests. Query strings are not stored.</p>
          </div>
          {overview.recentEvents.length === 0 ? (
            <p className="p-4 text-sm text-white/65">No blocked requests recorded since this API process started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="text-xs uppercase text-white/60">
                  <tr>
                    <th className="px-4 py-3">Time</th><th className="px-4 py-3">Source IP</th>
                    <th className="px-4 py-3">Attack / rule</th><th className="px-4 py-3">Request</th>
                    <th className="px-4 py-3">Action</th><th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.recentEvents.map((event, index) => (
                    <tr key={`${event.timestamp}-${event.sourceIp}-${index}`} className="border-t border-white/10 align-top">
                      <td className="whitespace-nowrap px-4 py-3">{dateTime(event.timestamp)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{event.sourceIp}</td>
                      <td className="px-4 py-3"><strong>{event.attack}</strong><br /><span className="text-xs text-white/60">{event.rule}</span></td>
                      <td className="max-w-sm break-all px-4 py-3 font-mono text-xs">{event.request}</td>
                      <td className="px-4 py-3">{event.action}</td>
                      <td className="px-4 py-3">{event.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>

      <section className={card}>
        <h2 className="font-semibold">Operational limits</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Signatures are heuristic and may miss attacks or block unusual but valid paths.</li>
          <li>Events and temporary blocks are process-local, reset on API restart, and are not shared across replicas.</li>
          <li>IP reputation, geolocation, ISP/ASN checks, and email alerts are not configured.</li>
          <li>Keep Cloudflare WAF, Nginx rate limits, and origin firewall restrictions enabled.</li>
        </ul>
      </section>
    </div>
  );
}
