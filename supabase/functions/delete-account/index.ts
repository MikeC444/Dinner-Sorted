// Permanently deletes the signed-in person's account and all their data.
// Apple and Google both require in-app account deletion for apps with sign-in.
// Note: this does not cancel a store subscription; the app tells people to cancel it in their store settings first.

import { adminClient, corsHeaders, json, requestUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const user = await requestUser(req);
  if (!user) return json({ error: 'unauthorised' }, 401);

  const db = adminClient();
  // Remove uploaded screenshots first (storage isn't covered by the database cascade).
  const { data: files } = await db.storage.from('feedback-screenshots').list(user.id);
  if (files?.length) await db.storage.from('feedback-screenshots').remove(files.map((f) => `${user.id}/${f.name}`));

  // Every table references auth.users with ON DELETE CASCADE (feedback is kept, anonymised).
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) { console.error(error); return json({ error: 'delete_failed' }, 500); }
  return json({ ok: true });
});
