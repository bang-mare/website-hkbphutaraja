import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, verifyBearerStaff } from '../_lib/serverClients.js';

const VALID_ROLES = [
  'administrator',
  'pendeta',
  'sekretaris',
  'bendahara',
  'editor',
  'penulis',
  'kontributor',
  'jemaat',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metode tidak diizinkan.' });
  }

  const authCheck = await verifyBearerStaff(req.headers.authorization, ['administrator']);
  if (!authCheck.user) {
    return res.status(authCheck.status).json({ error: authCheck.error });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY belum diatur di server.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const fullName = String(body.full_name || '').trim();
    const role = String(body.role || 'jemaat');
    const phone = String(body.phone || '').trim();
    const wijkId = body.wijk_id ? String(body.wijk_id) : null;

    if (!email || !password || password.length < 6) {
      return res.status(400).json({
        error: 'Email dan kata sandi (minimal 6 karakter) wajib diisi.',
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Peran pengguna tidak valid.' });
    }

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || email.split('@')[0] },
    });

    if (createErr || !created.user) {
      return res.status(400).json({
        error: createErr?.message || 'Gagal membuat akun pengguna baru.',
      });
    }

    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: created.user.id,
        email,
        full_name: fullName || email.split('@')[0],
        display_name: fullName || email.split('@')[0],
        role,
        phone,
        wijk_id: wijkId,
        is_active: true,
      })
      .select('*')
      .single();

    if (profErr) {
      return res.status(500).json({ error: profErr.message });
    }

    return res.status(200).json({ profile });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal membuat pengguna.';
    return res.status(500).json({ error: msg });
  }
}
