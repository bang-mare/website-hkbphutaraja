-- ==============================================================================
-- Migrasi 002: Ganti no_induk (unik) menjadi no_registrasi (Nomor Registrasi Keluarga)
-- Setiap anggota dalam 1 keluarga dapat memiliki no_registrasi yang sama.
-- Aman dijalankan berulang kali (idempotent) di Supabase SQL Editor.
-- ==============================================================================

ALTER TABLE public.jemaat DROP CONSTRAINT IF EXISTS jemaat_no_induk_key;
DROP INDEX IF EXISTS public.jemaat_no_induk_key;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jemaat'
      AND column_name = 'no_induk'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jemaat'
      AND column_name = 'no_registrasi'
  ) THEN
    ALTER TABLE public.jemaat RENAME COLUMN no_induk TO no_registrasi;
  END IF;
END $$;

ALTER TABLE public.jemaat ADD COLUMN IF NOT EXISTS no_registrasi TEXT;
CREATE INDEX IF NOT EXISTS idx_jemaat_no_registrasi ON public.jemaat(no_registrasi);
