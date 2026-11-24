-- ==============================================================================
-- HKBP RESSORT HUTARAJA (DISTRIK VI DAIRI) - CMS DATABASE SCHEMA & RLS
-- Migrasi 001: Skema Awal ala WordPress untuk PostgreSQL (Supabase)
-- Jalankan seluruh skrip ini di Supabase Dashboard > SQL Editor.
-- ==============================================================================

-- 1. EKSTENSI
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. FUNGSI UTILITAS TRIGGER updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ==============================================================================
-- 3. TABEL REFERENSI WIJK (6 LINGKUNGAN)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wijk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  koordinator_name TEXT DEFAULT '',
  koordinator_phone TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_wijk_updated_at ON public.wijk;
CREATE TRIGGER trg_wijk_updated_at
  BEFORE UPDATE ON public.wijk
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 4. TABEL PROFILES (TERHUBUNG KE auth.users)
-- Peran WordPress + Peran Gereja:
-- administrator, pendeta, sekretaris, bendahara, editor, penulis, kontributor, jemaat
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'jemaat' CHECK (
    role IN (
      'administrator',
      'pendeta',
      'sekretaris',
      'bendahara',
      'editor',
      'penulis',
      'kontributor',
      'jemaat'
    )
  ),
  avatar_url TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  wijk_id UUID REFERENCES public.wijk(id) ON DELETE SET NULL,
  bio TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_wijk_id ON public.profiles(wijk_id);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger otomatis membuat profil saat user baru mendaftar di auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  v_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'name'), ''),
    SPLIT_PART(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, email, full_name, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    v_name,
    v_name,
    'jemaat'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 5. FUNGSI HELPER KEAMANAN RLS (ANTI REKURSI)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND role = ANY(allowed_roles)
  );
$$;

-- ==============================================================================
-- 6. TABEL MEDIA (TERHUBUNG KE GOOGLE DRIVE)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_file_id TEXT NOT NULL UNIQUE,
  drive_folder_id TEXT DEFAULT '',
  nama TEXT NOT NULL,
  mime TEXT NOT NULL,
  ukuran BIGINT NOT NULL DEFAULT 0,
  alt TEXT DEFAULT '',
  caption TEXT DEFAULT '',
  deskripsi TEXT DEFAULT '',
  width INTEGER,
  height INTEGER,
  thumbnails JSONB NOT NULL DEFAULT '{}'::jsonb,
  year_month TEXT DEFAULT TO_CHAR(NOW(), 'YYYY/MM'),
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_mime ON public.media(mime);
CREATE INDEX IF NOT EXISTS idx_media_year_month ON public.media(year_month);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_by ON public.media(uploaded_by);

DROP TRIGGER IF EXISTS trg_media_updated_at ON public.media;
CREATE TRIGGER trg_media_updated_at
  BEFORE UPDATE ON public.media
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 7. TABEL POSTS (POST, PAGE, WARTA, ALBUM) & REVISI
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'post' CHECK (type IN ('post', 'page', 'warta', 'album')),
  title TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL UNIQUE,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  content_html TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('publish', 'draft', 'pending', 'future', 'private', 'trash')
  ),
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  featured_media_id UUID REFERENCES public.media(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  comment_status BOOLEAN NOT NULL DEFAULT true,
  parent_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  menu_order INTEGER NOT NULL DEFAULT 0,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_type_status ON public.posts(type, status);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON public.posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_parent_id ON public.posts(parent_id);

DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.posts;
CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.post_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  content_html TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  revision_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_revisions_post_id ON public.post_revisions(post_id, created_at DESC);

-- ==============================================================================
-- 8. TABEL TERMS (KATEGORI & TAG) & TERM RELATIONSHIPS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  taxonomy TEXT NOT NULL CHECK (taxonomy IN ('category', 'post_tag')),
  description TEXT DEFAULT '',
  parent_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (slug, taxonomy)
);

CREATE INDEX IF NOT EXISTS idx_terms_taxonomy ON public.terms(taxonomy);

DROP TRIGGER IF EXISTS trg_terms_updated_at ON public.terms;
CREATE TRIGGER trg_terms_updated_at
  BEFORE UPDATE ON public.terms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.term_relationships (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_term_relationships_term_id ON public.term_relationships(term_id);

-- ==============================================================================
-- 9. TABEL COMMENTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('approved', 'pending', 'spam', 'trash')
  ),
  ip_address TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_status ON public.comments(post_id, status);
CREATE INDEX IF NOT EXISTS idx_comments_status ON public.comments(status);

DROP TRIGGER IF EXISTS trg_comments_updated_at ON public.comments;
CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 10. TABEL MENUS, MENU ITEMS, WIDGETS, DAN OPTIONS (PENGATURAN)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  location TEXT CHECK (location IN ('header', 'footer', 'footer_secondary')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_menus_updated_at ON public.menus;
CREATE TRIGGER trg_menus_updated_at
  BEFORE UPDATE ON public.menus
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'custom' CHECK (
    item_type IN ('page', 'post', 'custom', 'category')
  ),
  object_id UUID,
  url TEXT NOT NULL DEFAULT '/',
  target TEXT NOT NULL DEFAULT '_self',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_menu_order ON public.menu_items(menu_id, sort_order);

DROP TRIGGER IF EXISTS trg_menu_items_updated_at ON public.menu_items;
CREATE TRIGGER trg_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area TEXT NOT NULL CHECK (area IN ('footer_1', 'footer_2', 'sidebar')),
  widget_type TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_widgets_area_order ON public.widgets(area, sort_order);

DROP TRIGGER IF EXISTS trg_widgets_updated_at ON public.widgets;
CREATE TRIGGER trg_widgets_updated_at
  BEFORE UPDATE ON public.widgets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.options (
  option_name TEXT PRIMARY KEY,
  option_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  autoload BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_options_updated_at ON public.options;
CREATE TRIGGER trg_options_updated_at
  BEFORE UPDATE ON public.options
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 11. TABEL MODUL KHUSUS GEREJA HKBP
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.jemaat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no_induk TEXT UNIQUE,
  full_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('L', 'P')),
  birth_place TEXT DEFAULT '',
  birth_date DATE,
  marriage_date DATE,
  baptism_date DATE,
  sidi_date DATE,
  status_keanggotaan TEXT NOT NULL DEFAULT 'aktif' CHECK (
    status_keanggotaan IN ('aktif', 'pindah', 'meninggal', 'nonaktif')
  ),
  family_role TEXT DEFAULT 'Anggota Keluarga',
  family_head_id UUID REFERENCES public.jemaat(id) ON DELETE SET NULL,
  wijk_id UUID REFERENCES public.wijk(id) ON DELETE SET NULL,
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jemaat_wijk_id ON public.jemaat(wijk_id);
CREATE INDEX IF NOT EXISTS idx_jemaat_birth_date ON public.jemaat(birth_date);
CREATE INDEX IF NOT EXISTS idx_jemaat_marriage_date ON public.jemaat(marriage_date);

DROP TRIGGER IF EXISTS trg_jemaat_updated_at ON public.jemaat;
CREATE TRIGGER trg_jemaat_updated_at
  BEFORE UPDATE ON public.jemaat
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.ibadah_minggu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_date DATE NOT NULL,
  service_time TIME NOT NULL DEFAULT '10:00',
  title TEXT NOT NULL,
  liturgical_week TEXT DEFAULT '',
  preacher TEXT DEFAULT '',
  liturgist TEXT DEFAULT '',
  organist TEXT DEFAULT '',
  song_leader TEXT DEFAULT '',
  bible_reading TEXT DEFAULT '',
  theme TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ibadah_minggu_date ON public.ibadah_minggu(service_date DESC);

DROP TRIGGER IF EXISTS trg_ibadah_minggu_updated_at ON public.ibadah_minggu;
CREATE TRIGGER trg_ibadah_minggu_updated_at
  BEFORE UPDATE ON public.ibadah_minggu
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.phd_lingkungan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wijk_id UUID NOT NULL REFERENCES public.wijk(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL DEFAULT 'Rabu',
  service_time TIME NOT NULL DEFAULT '19:00',
  next_date DATE,
  host_family TEXT NOT NULL DEFAULT '',
  host_address TEXT DEFAULT '',
  leader_name TEXT DEFAULT '',
  topic TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phd_wijk_id ON public.phd_lingkungan(wijk_id);

DROP TRIGGER IF EXISTS trg_phd_lingkungan_updated_at ON public.phd_lingkungan;
CREATE TRIGGER trg_phd_lingkungan_updated_at
  BEFORE UPDATE ON public.phd_lingkungan
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.kehadiran (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL CHECK (
    service_type IN ('minggu_pagi', 'minggu_siang', 'minggu_sore', 'phd', 'khusus')
  ),
  service_date DATE NOT NULL,
  wijk_id UUID REFERENCES public.wijk(id) ON DELETE SET NULL,
  ibadah_id UUID REFERENCES public.ibadah_minggu(id) ON DELETE SET NULL,
  men_count INTEGER NOT NULL DEFAULT 0 CHECK (men_count >= 0),
  women_count INTEGER NOT NULL DEFAULT 0 CHECK (women_count >= 0),
  youth_count INTEGER NOT NULL DEFAULT 0 CHECK (youth_count >= 0),
  children_count INTEGER NOT NULL DEFAULT 0 CHECK (children_count >= 0),
  total_count INTEGER GENERATED ALWAYS AS (men_count + women_count + youth_count + children_count) STORED,
  notes TEXT DEFAULT '',
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kehadiran_date ON public.kehadiran(service_date DESC);

DROP TRIGGER IF EXISTS trg_kehadiran_updated_at ON public.kehadiran;
CREATE TRIGGER trg_kehadiran_updated_at
  BEFORE UPDATE ON public.kehadiran
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- KEUANGAN: Pembagian 55% Pusat / 45% Huria (kecuali sosial, beasiswa, pembangunan fisik lokal)
CREATE TABLE IF NOT EXISTS public.keuangan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pemasukan', 'pengeluaran')),
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
  is_excluded_from_split BOOLEAN NOT NULL DEFAULT false,
  center_share_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  church_share_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  reference_no TEXT DEFAULT '',
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keuangan_date ON public.keuangan(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_keuangan_type ON public.keuangan(type);

DROP TRIGGER IF EXISTS trg_keuangan_updated_at ON public.keuangan;
CREATE TRIGGER trg_keuangan_updated_at
  BEFORE UPDATE ON public.keuangan
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 12. ACTIVITY LOG
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT DEFAULT '',
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);

-- ==============================================================================
-- 13. ROW LEVEL SECURITY (RLS) & KEBIJAKAN PER PERAN
-- ==============================================================================
ALTER TABLE public.wijk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.term_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jemaat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ibadah_minggu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phd_lingkungan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kehadiran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keuangan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- HAK AKSES SKEMA & TABEL (RLS tetap menyaring setiap baris & operasi)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON
  public.wijk,
  public.media,
  public.posts,
  public.terms,
  public.term_relationships,
  public.comments,
  public.menus,
  public.menu_items,
  public.widgets,
  public.options,
  public.ibadah_minggu,
  public.phd_lingkungan
TO anon;
GRANT INSERT ON public.comments TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_any_role(TEXT[]) TO anon, authenticated, service_role;

-- WIJK: Publik bisa baca; Admin/Pendeta/Sekretaris bisa kelola
DROP POLICY IF EXISTS "wijk_public_read" ON public.wijk;
CREATE POLICY "wijk_public_read" ON public.wijk FOR SELECT USING (true);
DROP POLICY IF EXISTS "wijk_staff_write" ON public.wijk;
CREATE POLICY "wijk_staff_write" ON public.wijk FOR ALL
  USING (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris']))
  WITH CHECK (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris']));

-- PROFILES: Baca profil sendiri atau Admin/Pendeta/Sekretaris baca semua;
-- Update profil sendiri (tanpa bisa ubah role sendiri), Admin bisa ubah semua.
DROP POLICY IF EXISTS "profiles_read_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_read_own_or_admin" ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris'])
  );

DROP POLICY IF EXISTS "profiles_update_own_safe" ON public.profiles;
CREATE POLICY "profiles_update_own_safe" ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = public.current_user_role()
  );

DROP POLICY IF EXISTS "profiles_admin_manage" ON public.profiles;
CREATE POLICY "profiles_admin_manage" ON public.profiles FOR ALL
  USING (public.has_any_role(ARRAY['administrator']))
  WITH CHECK (public.has_any_role(ARRAY['administrator']));

-- MEDIA: Publik baca metadata media; Staf konten bisa kelola
DROP POLICY IF EXISTS "media_public_read" ON public.media;
CREATE POLICY "media_public_read" ON public.media FOR SELECT USING (true);
DROP POLICY IF EXISTS "media_staff_insert" ON public.media;
CREATE POLICY "media_staff_insert" ON public.media FOR INSERT
  WITH CHECK (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris', 'editor', 'penulis']));
DROP POLICY IF EXISTS "media_staff_update" ON public.media;
CREATE POLICY "media_staff_update" ON public.media FOR UPDATE
  USING (
    public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris', 'editor'])
    OR uploaded_by = auth.uid()
  );
DROP POLICY IF EXISTS "media_staff_delete" ON public.media;
CREATE POLICY "media_staff_delete" ON public.media FOR DELETE
  USING (
    public.has_any_role(ARRAY['administrator', 'pendeta', 'editor'])
    OR uploaded_by = auth.uid()
  );

-- POSTS: Publik HANYA baca status 'publish';
-- Penulis/Kontributor kelola milik sendiri; Editor/Sekretaris/Pendeta/Admin kelola semua
DROP POLICY IF EXISTS "posts_public_read_published" ON public.posts;
CREATE POLICY "posts_public_read_published" ON public.posts FOR SELECT
  USING (
    status = 'publish'
    OR auth.uid() = author_id
    OR public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris', 'editor'])
  );

DROP POLICY IF EXISTS "posts_author_insert" ON public.posts;
CREATE POLICY "posts_author_insert" ON public.posts FOR INSERT
  WITH CHECK (
    public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris', 'editor', 'penulis', 'kontributor'])
    AND (
      public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris', 'editor', 'penulis'])
      OR status IN ('draft', 'pending')
    )
  );

DROP POLICY IF EXISTS "posts_staff_update" ON public.posts;
CREATE POLICY "posts_staff_update" ON public.posts FOR UPDATE
  USING (
    public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris', 'editor'])
    OR (
      author_id = auth.uid()
      AND public.has_any_role(ARRAY['penulis', 'kontributor'])
    )
  )
  WITH CHECK (
    public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris', 'editor', 'penulis'])
    OR status IN ('draft', 'pending', 'trash')
  );

DROP POLICY IF EXISTS "posts_staff_delete" ON public.posts;
CREATE POLICY "posts_staff_delete" ON public.posts FOR DELETE
  USING (
    public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris', 'editor'])
    OR (author_id = auth.uid() AND status IN ('draft', 'trash'))
  );

-- POST REVISIONS
DROP POLICY IF EXISTS "revisions_staff_read" ON public.post_revisions;
CREATE POLICY "revisions_staff_read" ON public.post_revisions FOR SELECT
  USING (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris', 'editor', 'penulis']));
DROP POLICY IF EXISTS "revisions_staff_insert" ON public.post_revisions;
CREATE POLICY "revisions_staff_insert" ON public.post_revisions FOR INSERT
  WITH CHECK (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris', 'editor', 'penulis', 'kontributor']));

-- TERMS & TERM RELATIONSHIPS
DROP POLICY IF EXISTS "terms_public_read" ON public.terms;
CREATE POLICY "terms_public_read" ON public.terms FOR SELECT USING (true);
DROP POLICY IF EXISTS "terms_staff_write" ON public.terms;
CREATE POLICY "terms_staff_write" ON public.terms FOR ALL
  USING (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris', 'editor', 'penulis']))
  WITH CHECK (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris', 'editor', 'penulis']));

DROP POLICY IF EXISTS "term_rel_public_read" ON public.term_relationships;
CREATE POLICY "term_rel_public_read" ON public.term_relationships FOR SELECT USING (true);
DROP POLICY IF EXISTS "term_rel_staff_write" ON public.term_relationships;
CREATE POLICY "term_rel_staff_write" ON public.term_relationships FOR ALL
  USING (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris', 'editor', 'penulis', 'kontributor']))
  WITH CHECK (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris', 'editor', 'penulis', 'kontributor']));

-- COMMENTS: Publik baca komentar 'approved' & bisa kirim komentar baru (status 'pending')
DROP POLICY IF EXISTS "comments_public_read_approved" ON public.comments;
CREATE POLICY "comments_public_read_approved" ON public.comments FOR SELECT
  USING (
    status = 'approved'
    OR public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris', 'editor'])
  );
DROP POLICY IF EXISTS "comments_public_insert_pending" ON public.comments;
CREATE POLICY "comments_public_insert_pending" ON public.comments FOR INSERT
  WITH CHECK (status = 'pending');
DROP POLICY IF EXISTS "comments_staff_manage" ON public.comments;
CREATE POLICY "comments_staff_manage" ON public.comments FOR UPDATE
  USING (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris', 'editor']));
DROP POLICY IF EXISTS "comments_staff_delete" ON public.comments;
CREATE POLICY "comments_staff_delete" ON public.comments FOR DELETE
  USING (public.has_any_role(ARRAY['administrator', 'pendeta', 'editor']));

-- MENUS, MENU ITEMS, WIDGETS: Publik baca; Admin/Editor kelola
DROP POLICY IF EXISTS "menus_public_read" ON public.menus;
CREATE POLICY "menus_public_read" ON public.menus FOR SELECT USING (true);
DROP POLICY IF EXISTS "menus_admin_write" ON public.menus;
CREATE POLICY "menus_admin_write" ON public.menus FOR ALL
  USING (public.has_any_role(ARRAY['administrator', 'editor']))
  WITH CHECK (public.has_any_role(ARRAY['administrator', 'editor']));

DROP POLICY IF EXISTS "menu_items_public_read" ON public.menu_items;
CREATE POLICY "menu_items_public_read" ON public.menu_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "menu_items_admin_write" ON public.menu_items;
CREATE POLICY "menu_items_admin_write" ON public.menu_items FOR ALL
  USING (public.has_any_role(ARRAY['administrator', 'editor']))
  WITH CHECK (public.has_any_role(ARRAY['administrator', 'editor']));

DROP POLICY IF EXISTS "widgets_public_read" ON public.widgets;
CREATE POLICY "widgets_public_read" ON public.widgets FOR SELECT USING (true);
DROP POLICY IF EXISTS "widgets_admin_write" ON public.widgets;
CREATE POLICY "widgets_admin_write" ON public.widgets FOR ALL
  USING (public.has_any_role(ARRAY['administrator', 'editor']))
  WITH CHECK (public.has_any_role(ARRAY['administrator', 'editor']));

-- OPTIONS: Publik baca yang autoload=true; Hanya Administrator kelola semua
DROP POLICY IF EXISTS "options_public_read" ON public.options;
CREATE POLICY "options_public_read" ON public.options FOR SELECT
  USING (autoload = true OR public.has_any_role(ARRAY['administrator', 'pendeta']));
DROP POLICY IF EXISTS "options_admin_write" ON public.options;
CREATE POLICY "options_admin_write" ON public.options FOR ALL
  USING (public.has_any_role(ARRAY['administrator']))
  WITH CHECK (public.has_any_role(ARRAY['administrator']));

-- JEMAAT: Sensitif (PII) - hanya staf gereja yang berhak
DROP POLICY IF EXISTS "jemaat_staff_read" ON public.jemaat;
CREATE POLICY "jemaat_staff_read" ON public.jemaat FOR SELECT
  USING (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris']));
DROP POLICY IF EXISTS "jemaat_staff_write" ON public.jemaat;
CREATE POLICY "jemaat_staff_write" ON public.jemaat FOR ALL
  USING (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris']))
  WITH CHECK (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris']));

-- IBADAH MINGGU & PHD LINGKUNGAN: Publik baca jadwal; Staf gereja kelola
DROP POLICY IF EXISTS "ibadah_public_read" ON public.ibadah_minggu;
CREATE POLICY "ibadah_public_read" ON public.ibadah_minggu FOR SELECT USING (true);
DROP POLICY IF EXISTS "ibadah_staff_write" ON public.ibadah_minggu;
CREATE POLICY "ibadah_staff_write" ON public.ibadah_minggu FOR ALL
  USING (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris', 'editor']))
  WITH CHECK (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris', 'editor']));

DROP POLICY IF EXISTS "phd_public_read" ON public.phd_lingkungan;
CREATE POLICY "phd_public_read" ON public.phd_lingkungan FOR SELECT USING (true);
DROP POLICY IF EXISTS "phd_staff_write" ON public.phd_lingkungan;
CREATE POLICY "phd_staff_write" ON public.phd_lingkungan FOR ALL
  USING (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris', 'editor']))
  WITH CHECK (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris', 'editor']));

-- KEHADIRAN IBADAH: Staf gereja
DROP POLICY IF EXISTS "kehadiran_staff_read" ON public.kehadiran;
CREATE POLICY "kehadiran_staff_read" ON public.kehadiran FOR SELECT
  USING (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris', 'bendahara']));
DROP POLICY IF EXISTS "kehadiran_staff_write" ON public.kehadiran;
CREATE POLICY "kehadiran_staff_write" ON public.kehadiran FOR ALL
  USING (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris']))
  WITH CHECK (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris']));

-- KEUANGAN: STRICT - HANYA Administrator dan Pendeta!
DROP POLICY IF EXISTS "keuangan_admin_pendeta_only" ON public.keuangan;
CREATE POLICY "keuangan_admin_pendeta_only" ON public.keuangan FOR ALL
  USING (public.has_any_role(ARRAY['administrator', 'pendeta']))
  WITH CHECK (public.has_any_role(ARRAY['administrator', 'pendeta']));

-- ACTIVITY LOG: Staf bisa baca & tambah log
DROP POLICY IF EXISTS "activity_log_staff_read" ON public.activity_log;
CREATE POLICY "activity_log_staff_read" ON public.activity_log FOR SELECT
  USING (public.has_any_role(ARRAY['administrator', 'pendeta', 'sekretaris', 'editor']));
DROP POLICY IF EXISTS "activity_log_auth_insert" ON public.activity_log;
CREATE POLICY "activity_log_auth_insert" ON public.activity_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ==============================================================================
-- 14. SEED DATA AWAL
-- ==============================================================================

-- 6 Wijk HKBP Ressort Hutaraja
INSERT INTO public.wijk (name, slug, description, sort_order) VALUES
  ('Letare', 'letare', 'Lingkungan (Wijk) Letare HKBP Ressort Hutaraja', 1),
  ('Exaudi', 'exaudi', 'Lingkungan (Wijk) Exaudi HKBP Ressort Hutaraja', 2),
  ('Judika', 'judika', 'Lingkungan (Wijk) Judika HKBP Ressort Hutaraja', 3),
  ('Galatia', 'galatia', 'Lingkungan (Wijk) Galatia HKBP Ressort Hutaraja', 4),
  ('Efesus', 'efesus', 'Lingkungan (Wijk) Efesus HKBP Ressort Hutaraja', 5),
  ('Jeremia', 'jeremia', 'Lingkungan (Wijk) Jeremia HKBP Ressort Hutaraja', 6)
ON CONFLICT (slug) DO NOTHING;

-- Pengaturan Default (wp_options)
INSERT INTO public.options (option_name, option_value, autoload) VALUES
  ('site_title', '"HKBP Ressort Hutaraja"'::jsonb, true),
  ('site_tagline', '"Distrik VI Dairi — Huria Kristen Batak Protestan"'::jsonb, true),
  ('site_url', '"https://hkbp-hutaraja.vercel.app"'::jsonb, true),
  ('admin_email', '"sekretariat@hkbphutaraja.or.id"'::jsonb, false),
  ('timezone_string', '"Asia/Jakarta"'::jsonb, true),
  ('date_format', '"d F Y"'::jsonb, true),
  ('time_format', '"H:i"'::jsonb, true),
  ('permalink_structure', '"/%postname%/"'::jsonb, true),
  ('posts_per_page', '10'::jsonb, true),
  ('default_comment_status', '"open"'::jsonb, true),
  ('max_upload_size_mb', '10'::jsonb, true),
  ('allowed_upload_mimes', '["image/jpeg","image/png","image/webp","image/gif","application/pdf","video/mp4"]'::jsonb, true),
  ('theme_primary_color', '"#1E3A5F"'::jsonb, true),
  ('theme_accent_color', '"#9A3412"'::jsonb, true),
  ('church_address', '"Hutaraja, Distrik VI Dairi, Sumatera Utara"'::jsonb, true),
  ('daily_verse', '{"reference":"Mazmur 119:105","text":"Firman-Mu itu pelita bagi kakiku dan terang bagi jalanku."}'::jsonb, true)
ON CONFLICT (option_name) DO NOTHING;

-- Kategori Default
INSERT INTO public.terms (name, slug, taxonomy, description) VALUES
  ('Berita Huria', 'berita-huria', 'category', 'Berita dan kegiatan jemaat HKBP Ressort Hutaraja'),
  ('Renungan', 'renungan', 'category', 'Renungan harian dan khotbah minggu'),
  ('Pengumuman', 'pengumuman', 'category', 'Pengumuman resmi majelis gereja')
ON CONFLICT (slug, taxonomy) DO NOTHING;

-- Halaman Contoh (Tentang Kami)
INSERT INTO public.posts (type, title, slug, content, content_html, excerpt, status, published_at)
VALUES (
  'page',
  'Tentang HKBP Ressort Hutaraja',
  'tentang-kami',
  '[{"id":"b1","type":"paragraph","content":"Huria Kristen Batak Protestan (HKBP) Ressort Hutaraja merupakan bagian dari Distrik VI Dairi yang melayani jemaat di enam lingkungan (wijk): Letare, Exaudi, Judika, Galatia, Efesus, dan Jeremia."}]'::jsonb,
  '<p>Huria Kristen Batak Protestan (HKBP) Ressort Hutaraja merupakan bagian dari Distrik VI Dairi yang melayani jemaat di enam lingkungan (wijk): Letare, Exaudi, Judika, Galatia, Efesus, dan Jeremia.</p>',
  'Profil singkat, sejarah huria, visi-misi, dan enam lingkungan pelayanan HKBP Ressort Hutaraja.',
  'publish',
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- Menu Default
INSERT INTO public.menus (name, slug, location) VALUES
  ('Menu Utama', 'menu-utama', 'header'),
  ('Menu Footer', 'menu-footer', 'footer')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.menu_items (menu_id, title, item_type, url, sort_order)
SELECT m.id, v.title, 'custom', v.url, v.sort_order
FROM public.menus m
CROSS JOIN (
  VALUES
    ('Beranda', '/', 1),
    ('Tentang Kami', '/tentang-kami', 2),
    ('Jadwal Ibadah', '/jadwal-ibadah', 3),
    ('Warta Jemaat', '/warta', 4),
    ('Berita', '/berita', 5),
    ('Galeri', '/galeri', 6),
    ('Kontak', '/kontak', 7)
) AS v(title, url, sort_order)
WHERE m.slug = 'menu-utama'
  AND NOT EXISTS (SELECT 1 FROM public.menu_items mi WHERE mi.menu_id = m.id);

-- Widget Default
INSERT INTO public.widgets (area, widget_type, title, config, sort_order)
SELECT v.area, v.widget_type, v.title, v.config::jsonb, v.sort_order
FROM (
  VALUES
    ('footer_1', 'text', 'HKBP Ressort Hutaraja', '{"body":"Distrik VI Dairi, Sumatera Utara. Melayani dalam kasih dan pengharapan."}', 1),
    ('footer_2', 'schedule', 'Jam Ibadah Minggu', '{"body":"Ibadah Pagi: 08.00 WIB\nIbadah Siang: 10.30 WIB\nSekolah Minggu: 08.00 WIB"}', 1)
) AS v(area, widget_type, title, config, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.widgets);

-- Backfill profil jika user sudah dibuat di Authentication sebelum SQL migrasi dijalankan
INSERT INTO public.profiles (id, email, full_name, display_name, role)
SELECT
  u.id,
  u.email,
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data ->> 'full_name'), ''), SPLIT_PART(u.email, '@', 1)),
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data ->> 'full_name'), ''), SPLIT_PART(u.email, '@', 1)),
  'jemaat'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;
