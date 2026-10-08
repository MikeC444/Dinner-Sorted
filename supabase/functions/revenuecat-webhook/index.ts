// Receives RevenueCat webhooks and keeps `entitlements` in step with App Store / Google Play.
// In RevenueCat: Project settings > Integrations > Webhooks. Set the URL to this function and the
// Authorization header to the same value as the REVENUECAT_WEBHOOK_SECRET secret.

import { adminClient, json } from '../_shared/supabase.ts';

const ACTIVE = ['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'NON_RENEWING_PURCHASE', 'SUBSCRIPTION_EXTENDED', 'TEMPORARY_ENTITLEMENT_GRANT'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (!secret || req.headers.get('Authorization') !== secret) return json({ error: 'unauthorised' }, 401);

  const body = await req.json().catch(() => null);
  const event = body?.event;
  if (!event?.type) return json({ error: 'bad_event' }, 400);

  // The app logs in to RevenueCat with the Supabase user id, so app_user_id is our user id.
  const userId: string | undefined = [event.app_user_id, ...(event.aliases || [])].find((x: string) => UUID.test(x || ''));
  if (!userId) return json({ ok: true, skipped: 'anonymous user' });

  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
  let isPremium: boolean | undefined;
  if (ACTIVE.includes(event.type)) isPremium = true;
  if (event.type === 'EXPIRATION') isPremium = false;
  // CANCELLATION and BILLING_ISSUE keep access until expires_at passes.
  if (event.type === 'CANCELLATION' || event.type === 'BILLING_ISSUE') isPremium = true;
  if (isPremium === undefined) return json({ ok: true, ignored: event.type });

  const { error } = await adminClient().from('entitlements').upsert({
    user_id: userId, is_premium: isPremium, expires_at: expiresAt, product_id: event.product_id || null,
    updated_at: new Date().toISOString(),
  });
  if (error) { console.error(error); return json({ error: 'db_error' }, 500); }
  return json({ ok: true });
});
