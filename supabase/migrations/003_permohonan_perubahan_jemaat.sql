-- ==============================================================================
-- MIGRASI 003: PERMOHONAN PERUBAHAN DATA JEMAAT & STATISTIK PUBLIK AMAN (HKBP)
-- Aman dijalankan berulang kali (Idempotent) di Supabase SQL Editor
-- ==============================================================================

-- 1. Sequence untuk kode permohonan yang unik (REQ-YYYY-NNN)
CREATE SEQUENCE IF NOT EXISTS public.permohonan_code_seq START 1;

-- 2. Tabel Permohonan Perubahan Data Jemaat
CREATE TABLE IF NOT EXISTS public.permohonan_perubahan_jemaat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code TEXT NOT NULL UNIQUE,
  jenis_permohonan TEXT NOT NULL CHECK (
    jenis_permohonan IN (
      'Tambah Anggota/Anak Lahir',
      'Perbaikan Biodata',
      'Pindah/Mutasi',
      'Meninggal'
    )
  ),
  wijk_id UUID REFERENCES public.wijk(id) ON DELETE SET NULL,
  wijk_name TEXT NOT NULL DEFAULT '',
  no_registrasi TEXT NOT NULL DEFAULT '',
  nama_pemohon TEXT NOT NULL,
  nama_suami TEXT NOT NULL DEFAULT '',
  nama_istri TEXT NOT NULL DEFAULT '',
  email_pemohon TEXT NOT NULL DEFAULT '',
  alamat_pemohon TEXT NOT NULL DEFAULT '',
  no_hp_pemohon TEXT NOT NULL DEFAULT '',
  verifikasi_identitas TEXT NOT NULL DEFAULT '',
  daftar_anggota JSONB NOT NULL DEFAULT '[]'::jsonb,
  daftar_perubahan JSONB NOT NULL DEFAULT '[]'::jsonb,
  kelengkapan_dokumen JSONB NOT NULL DEFAULT '{}'::jsonb,
  detail_perubahan TEXT NOT NULL DEFAULT '',
  status_verifikasi TEXT NOT NULL DEFAULT 'menunggu_sintua' CHECK (
    status_verifikasi IN (
      'menunggu_sintua',
      'terverifikasi_sintua',
      'disetujui',
      'ditolak'
    )
  ),
  catatan_sintua TEXT NOT NULL DEFAULT '',
  catatan_admin TEXT NOT NULL DEFAULT '',
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permohonan_request_code
  ON public.permohonan_perubahan_jemaat(LOWER(request_code));
CREATE INDEX IF NOT EXISTS idx_permohonan_no_registrasi
  ON public.permohonan_perubahan_jemaat(LOWER(no_registrasi));
CREATE INDEX IF NOT EXISTS idx_permohonan_status
  ON public.permohonan_perubahan_jemaat(status_verifikasi, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permohonan_wijk
  ON public.permohonan_perubahan_jemaat(wijk_id);

DROP TRIGGER IF EXISTS trg_permohonan_updated_at ON public.permohonan_perubahan_jemaat;
CREATE TRIGGER trg_permohonan_updated_at
  BEFORE UPDATE ON public.permohonan_perubahan_jemaat
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. RLS untuk permohonan_perubahan_jemaat (PII hanya dapat dibaca & dikelola staf)
ALTER TABLE public.permohonan_perubahan_jemaat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permohonan_staff_read" ON public.permohonan_perubahan_jemaat;
CREATE POLICY "permohonan_staff_read" ON public.permohonan_perubahan_jemaat
  FOR SELECT
  USING (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris']));

DROP POLICY IF EXISTS "permohonan_staff_write" ON public.permohonan_perubahan_jemaat;
CREATE POLICY "permohonan_staff_write" ON public.permohonan_perubahan_jemaat
  FOR ALL
  USING (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris']))
  WITH CHECK (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris']));

-- 4. RPC Publik: Pengajuan Permohonan Perubahan Data Jemaat (tanpa membuka SELECT PII ke publik)
CREATE OR REPLACE FUNCTION public.submit_permohonan_perubahan(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jenis TEXT;
  v_wijk_id UUID;
  v_wijk_name TEXT;
  v_no_reg TEXT;
  v_nama_pemohon TEXT;
  v_nama_suami TEXT;
  v_nama_istri TEXT;
  v_email TEXT;
  v_alamat TEXT;
  v_no_hp TEXT;
  v_verif TEXT;
  v_detail TEXT;
  v_daftar_anggota JSONB;
  v_daftar_perubahan JSONB;
  v_kelengkapan JSONB;
  v_seq BIGINT;
  v_req_code TEXT;
  v_inserted RECORD;
BEGIN
  v_jenis := TRIM(COALESCE(p_payload->>'jenis_permohonan', ''));
  IF v_jenis NOT IN (
    'Tambah Anggota/Anak Lahir',
    'Perbaikan Biodata',
    'Pindah/Mutasi',
    'Meninggal'
  ) THEN
    RAISE EXCEPTION 'Jenis permohonan tidak valid.';
  END IF;

  v_no_reg := TRIM(COALESCE(p_payload->>'no_registrasi', ''));
  v_nama_pemohon := TRIM(COALESCE(p_payload->>'nama_pemohon', ''));
  v_nama_suami := TRIM(COALESCE(p_payload->>'nama_suami', ''));
  v_nama_istri := TRIM(COALESCE(p_payload->>'nama_istri', ''));
  v_email := TRIM(COALESCE(p_payload->>'email_pemohon', ''));
  v_alamat := TRIM(COALESCE(p_payload->>'alamat_pemohon', ''));
  v_no_hp := TRIM(COALESCE(p_payload->>'no_hp_pemohon', ''));
  v_verif := TRIM(COALESCE(p_payload->>'verifikasi_identitas', ''));
  v_detail := TRIM(COALESCE(p_payload->>'detail_perubahan', ''));

  IF LENGTH(v_no_reg) < 3 THEN
    RAISE EXCEPTION 'Nomor Registrasi / No. KK keluarga wajib diisi.';
  END IF;
  IF LENGTH(v_no_hp) < 8 THEN
    RAISE EXCEPTION 'Nomor HP / WhatsApp aktif wajib diisi.';
  END IF;
  IF LENGTH(v_verif) < 4 THEN
    RAISE EXCEPTION 'Tanggal lahir atau 6 digit terakhir NIK verifikasi wajib diisi.';
  END IF;
  IF v_nama_pemohon = '' THEN
    v_nama_pemohon := v_nama_suami;
  END IF;
  IF v_nama_pemohon = '' THEN
    RAISE EXCEPTION 'Nama pemohon / kepala keluarga wajib diisi.';
  END IF;

  IF NULLIF(TRIM(COALESCE(p_payload->>'wijk_id', '')), '') IS NOT NULL THEN
    BEGIN
      SELECT id, name INTO v_wijk_id, v_wijk_name
      FROM public.wijk
      WHERE id = (p_payload->>'wijk_id')::UUID
      LIMIT 1;
    EXCEPTION WHEN invalid_text_representation THEN
      v_wijk_id := NULL;
    END;
  END IF;

  IF v_wijk_id IS NULL AND NULLIF(TRIM(COALESCE(p_payload->>'wijk_name', '')), '') IS NOT NULL THEN
    SELECT id, name INTO v_wijk_id, v_wijk_name
    FROM public.wijk
    WHERE LOWER(name) = LOWER(TRIM(p_payload->>'wijk_name'))
    LIMIT 1;
  END IF;

  v_wijk_name := COALESCE(v_wijk_name, TRIM(COALESCE(p_payload->>'wijk_name', '')));
  IF v_wijk_name = '' THEN
    RAISE EXCEPTION 'Wijk / Lingkungan wajib dipilih.';
  END IF;

  v_daftar_anggota := CASE
    WHEN jsonb_typeof(p_payload->'daftar_anggota') = 'array' THEN p_payload->'daftar_anggota'
    ELSE '[]'::jsonb
  END;
  v_daftar_perubahan := CASE
    WHEN jsonb_typeof(p_payload->'daftar_perubahan') = 'array' THEN p_payload->'daftar_perubahan'
    ELSE '[]'::jsonb
  END;
  v_kelengkapan := CASE
    WHEN jsonb_typeof(p_payload->'kelengkapan_dokumen') = 'object' THEN p_payload->'kelengkapan_dokumen'
    ELSE '{}'::jsonb
  END;

  v_seq := nextval('public.permohonan_code_seq');
  v_req_code := 'REQ-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYY') || '-' || LPAD(v_seq::TEXT, 3, '0');

  INSERT INTO public.permohonan_perubahan_jemaat (
    request_code,
    jenis_permohonan,
    wijk_id,
    wijk_name,
    no_registrasi,
    nama_pemohon,
    nama_suami,
    nama_istri,
    email_pemohon,
    alamat_pemohon,
    no_hp_pemohon,
    verifikasi_identitas,
    daftar_anggota,
    daftar_perubahan,
    kelengkapan_dokumen,
    detail_perubahan,
    status_verifikasi
  )
  VALUES (
    v_req_code,
    v_jenis,
    v_wijk_id,
    v_wijk_name,
    v_no_reg,
    v_nama_pemohon,
    v_nama_suami,
    v_nama_istri,
    v_email,
    v_alamat,
    v_no_hp,
    v_verif,
    v_daftar_anggota,
    v_daftar_perubahan,
    v_kelengkapan,
    v_detail,
    'menunggu_sintua'
  )
  RETURNING * INTO v_inserted;

  RETURN jsonb_build_object(
    'id', v_inserted.id,
    'request_code', v_inserted.request_code,
    'jenis_permohonan', v_inserted.jenis_permohonan,
    'wijk_name', v_inserted.wijk_name,
    'status_verifikasi', v_inserted.status_verifikasi,
    'detail_perubahan', v_inserted.detail_perubahan,
    'daftar_anggota', v_inserted.daftar_anggota,
    'daftar_perubahan', v_inserted.daftar_perubahan,
    'catatan_sintua', v_inserted.catatan_sintua,
    'catatan_admin', v_inserted.catatan_admin,
    'created_at', v_inserted.created_at,
    'updated_at', v_inserted.updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_permohonan_perubahan(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_permohonan_perubahan(JSONB) TO anon, authenticated;

-- 5. RPC Publik: Cek Status Permohonan (hanya mengembalikan status & catatan tanpa PII sensitif)
CREATE OR REPLACE FUNCTION public.lookup_permohonan_status(p_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q TEXT;
  v_items JSONB;
BEGIN
  v_q := LOWER(TRIM(COALESCE(p_query, '')));
  IF LENGTH(v_q) < 4 THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'request_code', p.request_code,
        'jenis_permohonan', p.jenis_permohonan,
        'wijk_name', p.wijk_name,
        'status_verifikasi', p.status_verifikasi,
        'detail_perubahan', p.detail_perubahan,
        'daftar_anggota', p.daftar_anggota,
        'daftar_perubahan', p.daftar_perubahan,
        'catatan_sintua', p.catatan_sintua,
        'catatan_admin', p.catatan_admin,
        'created_at', p.created_at,
        'updated_at', p.updated_at
      )
      ORDER BY p.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM public.permohonan_perubahan_jemaat p
  WHERE LOWER(TRIM(p.request_code)) = v_q
     OR LOWER(TRIM(p.no_registrasi)) = v_q;

  RETURN v_items;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_permohonan_status(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_permohonan_status(TEXT) TO anon, authenticated;

-- 6. RPC Publik: Statistik Ruas Ni Huria (Agregat + Ulang Tahun 7 Hari Kedepan tanpa PII sensitif)
CREATE OR REPLACE FUNCTION public.get_public_jemaat_statistics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE;
  v_total_jiwa INTEGER := 0;
  v_total_kk INTEGER := 0;
  v_per_wijk JSONB := '[]'::jsonb;
  v_kategorial JSONB;
  v_birthdays JSONB := '[]'::jsonb;
BEGIN
  SELECT
    COUNT(*)::INT,
    COUNT(DISTINCT NULLIF(LOWER(TRIM(COALESCE(no_registrasi, ''))), ''))::INT
  INTO v_total_jiwa, v_total_kk
  FROM public.jemaat
  WHERE status_keanggotaan = 'aktif';

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', w.id,
        'name', w.name,
        'jiwa', COALESCE(stat.jiwa, 0),
        'kk', COALESCE(stat.kk, 0),
        'persentase', CASE
          WHEN v_total_jiwa > 0 THEN ROUND((COALESCE(stat.jiwa, 0)::NUMERIC / v_total_jiwa::NUMERIC) * 100, 1)
          ELSE 0
        END
      )
      ORDER BY w.sort_order ASC
    ),
    '[]'::jsonb
  )
  INTO v_per_wijk
  FROM public.wijk w
  LEFT JOIN (
    SELECT
      j.wijk_id,
      COUNT(*)::INT AS jiwa,
      COUNT(DISTINCT NULLIF(LOWER(TRIM(COALESCE(j.no_registrasi, ''))), ''))::INT AS kk
    FROM public.jemaat j
    WHERE j.status_keanggotaan = 'aktif'
    GROUP BY j.wijk_id
  ) stat ON stat.wijk_id = w.id;

  SELECT jsonb_build_object(
    'sekolah_minggu', COUNT(*) FILTER (
      WHERE birth_date IS NOT NULL
        AND DATE_PART('year', AGE(v_today, birth_date)) BETWEEN 0 AND 12
        AND LOWER(COALESCE(family_role, '')) NOT IN ('kepala keluarga', 'ama/suami', 'suami', 'istri', 'ina/istri')
    )::INT,
    'remaja_nhkbp', COUNT(*) FILTER (
      WHERE birth_date IS NOT NULL
        AND DATE_PART('year', AGE(v_today, birth_date)) BETWEEN 13 AND 25
        AND LOWER(COALESCE(family_role, '')) NOT IN ('kepala keluarga', 'ama/suami', 'suami', 'istri', 'ina/istri')
    )::INT,
    'punguan_ama', COUNT(*) FILTER (
      WHERE LOWER(COALESCE(family_role, '')) LIKE '%ama%'
         OR LOWER(COALESCE(family_role, '')) LIKE '%suami%'
         OR LOWER(COALESCE(family_role, '')) LIKE '%kepala keluarga%'
    )::INT,
    'punguan_ina', COUNT(*) FILTER (
      WHERE LOWER(COALESCE(family_role, '')) LIKE '%ina%'
         OR LOWER(COALESCE(family_role, '')) LIKE '%istri%'
    )::INT,
    'lansia', COUNT(*) FILTER (
      WHERE birth_date IS NOT NULL
        AND DATE_PART('year', AGE(v_today, birth_date)) >= 60
    )::INT,
    'sudah_baptis', COUNT(*) FILTER (WHERE baptism_date IS NOT NULL)::INT,
    'sudah_sidi', COUNT(*) FILTER (WHERE sidi_date IS NOT NULL)::INT,
    'sudah_menikah', COUNT(*) FILTER (WHERE marriage_date IS NOT NULL)::INT
  )
  INTO v_kategorial
  FROM public.jemaat
  WHERE status_keanggotaan = 'aktif';

  WITH active_bdays AS (
    SELECT
      j.id,
      j.full_name,
      COALESCE(w.name, '-') AS wijk_name,
      j.birth_date,
      MAKE_DATE(
        EXTRACT(YEAR FROM v_today)::INT,
        EXTRACT(MONTH FROM j.birth_date)::INT,
        LEAST(
          EXTRACT(DAY FROM j.birth_date)::INT,
          EXTRACT(DAY FROM (DATE_TRUNC('month', MAKE_DATE(EXTRACT(YEAR FROM v_today)::INT, EXTRACT(MONTH FROM j.birth_date)::INT, 1)) + INTERVAL '1 month - 1 day'))::INT
        )
      ) AS bday_this_year
    FROM public.jemaat j
    LEFT JOIN public.wijk w ON w.id = j.wijk_id
    WHERE j.status_keanggotaan = 'aktif'
      AND j.birth_date IS NOT NULL
  ),
  upcoming AS (
    SELECT
      id,
      full_name,
      wijk_name,
      birth_date,
      CASE
        WHEN bday_this_year < v_today THEN (bday_this_year + INTERVAL '1 year')::DATE
        ELSE bday_this_year
      END AS next_bday
    FROM active_bdays
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', u.id,
        'full_name', u.full_name,
        'wijk_name', u.wijk_name,
        'birth_date', u.birth_date,
        'usia_baru', (EXTRACT(YEAR FROM u.next_bday)::INT - EXTRACT(YEAR FROM u.birth_date)::INT),
        'hari_lagi', (u.next_bday - v_today)::INT
      )
      ORDER BY (u.next_bday - v_today) ASC, u.full_name ASC
    ),
    '[]'::jsonb
  )
  INTO v_birthdays
  FROM upcoming u
  WHERE (u.next_bday - v_today) BETWEEN 0 AND 6;

  RETURN jsonb_build_object(
    'total_jiwa', v_total_jiwa,
    'total_kk', v_total_kk,
    'per_wijk', v_per_wijk,
    'kategorial', COALESCE(v_kategorial, '{}'::jsonb),
    'ulang_tahun_minggu_ini', v_birthdays
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_jemaat_statistics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_jemaat_statistics() TO anon, authenticated;

-- 7. Tambahkan item menu 'Data Jemaat' ke Menu Utama jika belum ada
INSERT INTO public.menu_items (menu_id, title, item_type, url, sort_order)
SELECT m.id, 'Data Jemaat', 'custom', '/data-jemaat', 5
FROM public.menus m
WHERE m.slug = 'menu-utama'
  AND NOT EXISTS (
    SELECT 1 FROM public.menu_items mi
    WHERE mi.menu_id = m.id AND mi.url = '/data-jemaat'
  );
