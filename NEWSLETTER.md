# VoxZin newsletters (free-tier setup)

VoxZin has two separate email jobs:

1. **Receive replies:** Cloudflare Email Routing forwards `newsletter@voxzin.com` to the verified `awais.muj@gmail.com` destination. Incoming messages appear in that Gmail inbox addressed to `newsletter@voxzin.com`. It is not a mailbox and does not provide outgoing SMTP.
2. **Send campaigns:** [Brevo's Free plan](https://www.brevo.com/pricing/see-all-features/) currently includes email campaigns and up to 300 emails per day, with no paid subscription required. VoxZin uses [Brevo's SMTP relay](https://developers.brevo.com/docs/smtp-integration) to send confirmed subscription emails and article campaigns. Provider plan limits can change; confirm the Free plan allowance in Brevo before relying on it.

VoxZin caps **all outbound SMTP email attempts** at **250 per UTC day**, including campaigns, subscription confirmations, invitations, and account messages. This leaves headroom under Brevo's stated 300/day free allowance for provider-side or untracked mail. Failed attempts also consume a slot. The API and worker share one atomic MongoDB quota, including when both send concurrently. A larger campaign continues on subsequent UTC days.

## What readers and editors see

- Readers submit the existing newsletter signup form and must confirm the email link before they become eligible for campaigns.
- Admins and editors open **Admin → Newsletter**, choose a published article, search/select confirmed subscribers, check the preview, and queue the send.
- VoxZin sends the article headline, image (when available), excerpt, and a **Read the full article on VoxZin** button. It does not email the entire article.
- Each recipient gets a personalized unsubscribe URL. The worker checks confirmation status atomically immediately before SMTP dispatch, so queued deliveries are skipped after an unsubscribe. If the unsubscribe races after that check, one in-flight message may still be delivered; later campaign attempts are blocked.
- The campaign list shows how many recipients were selected, sent, failed, or skipped. No campaign sends to unconfirmed subscribers or arbitrary pasted addresses.

## One-time free setup

### 1. Forward replies with Cloudflare Email Routing

In Cloudflare, open **Compute → Email Service → Email Routing** for `voxzin.com`. The route to `awais.muj@gmail.com` is configured and active. Cloudflare's [Email Routing guide](https://developers.cloudflare.com/email-service/get-started/route-emails/) has the current UI steps:

- Email pattern: `newsletter`
- Domain: `voxzin.com`
- Action: **Send to an email**
- Destination: `awais.muj@gmail.com`

Send a test message from a different mailbox to `newsletter@voxzin.com` to verify delivery. Cloudflare Email Routing requires the zone to use Cloudflare DNS. Keep its MX records in place; do not replace them with a mailbox provider's MX records if you want forwarding to keep working. To send mail with `newsletter@voxzin.com` as the From address, separately verify it as a Gmail “Send mail as” alias and set the app's `SMTP_FROM` to that address; forwarding alone cannot send as the alias.

### 2. Create and authenticate a free Brevo sender

Create a Brevo Free account, add `voxzin.com` as a sending domain, and verify/authenticate it using the DNS records Brevo displays. Add the provided DKIM records exactly in Cloudflare DNS. If Brevo asks for SPF, merge its required sender into the existing SPF record rather than adding a second SPF TXT record; Cloudflare Email Routing also uses DNS email records. Keep Cloudflare's MX records. Wait for Brevo to show the domain and sender as authenticated.

Add `newsletter@voxzin.com` as a sender in Brevo and complete any sender verification step. Incoming replies will still be delivered by Cloudflare to Gmail.

### 3. Configure the production application

In the production `.env.production` file, set the SMTP relay values from Brevo's **SMTP & API → SMTP** page. Use its **SMTP key**, not an API key:

```dotenv
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<Brevo SMTP login shown in your account>
SMTP_PASS=<Brevo SMTP key>
SMTP_FROM=<existing verified SMTP account sender>
NEWSLETTER_FROM=VoxZin <newsletter@voxzin.com>
NEWSLETTER_REPLY_TO=newsletter@voxzin.com
NEWSLETTER_DAILY_LIMIT=250
SITE_URL=https://voxzin.com
```

The angle-bracketed values above are placeholders; replace them on the server and never commit real credentials. Keep `.env.production` readable only by the deploy account. `NEWSLETTER_FROM` controls the campaign's visible sender and must be verified by the SMTP provider. For Gmail SMTP, first add and verify `newsletter@voxzin.com` under Gmail's **Send mail as** settings; keep `SMTP_FROM` as the account sender for confirmation and admin mail, and use the alias in `NEWSLETTER_FROM`. After setting it, redeploy VoxZin and check **Admin → Newsletter** shows the alias as its sender.

## First send and testing

1. Sign up to the VoxZin newsletter with an address you control, then click the confirmation email.
2. Confirm that address appears under **Admin → Newsletter**.
3. Select a published article and only your confirmed test address; check the preview and queue the campaign.
4. Confirm the email arrives, the article button opens the matching VoxZin article, and the unsubscribe link changes the subscription to unsubscribed.
5. Test `newsletter@voxzin.com` forwarding separately. A verified Cloudflare forwarding alias is not automatically a Brevo sender; the authenticated domain/sender and SMTP settings are still required.

Campaign sending remains disabled until SMTP is configured. This avoids queuing a campaign that cannot be delivered. Brevo account registration, domain authentication, and verification links require the account owner; do not put account passwords, SMTP keys, or recovery codes in source control or chat.
