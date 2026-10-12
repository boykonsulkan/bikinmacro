-- Pengerasan keamanan database. Jalankan di Supabase SQL Editor SETELAH versi aplikasi terbaru ter-deploy di Vercel.
--
-- Masalah yang ditutup: kebijakan "Users can update own row" tidak membatasi kolom, jadi pengguna biasa bisa mengubah
-- role (jadi admin), plan, dan kuota miliknya sendiri lewat API publik Supabase (kunci anon yang ada di browser).
-- Terbukti di audit 12 Oktober 2026. Tabel yang berisi data sensitif sekarang cuma boleh ditulis server (service role).
--
-- Aman dijalankan berulang. Setelah selesai, jalankan:  node scripts/audit-rls.js   (harus tanpa baris [KRITIS]).
--
-- URUTAN PENTING: kalau SQL ini dijalankan SEBELUM deploy kode terbaru, generate dan chat akan gagal menyimpan,
-- karena kode lama menulis lewat sesi pengguna. Kode terbaru menulis lewat service role.

-- 1. users: klien nggak boleh menulis sama sekali (kredit, paket, dan role hanya diubah server).
DROP POLICY IF EXISTS "Users can update own row" ON public.users;
REVOKE INSERT, UPDATE, DELETE ON public.users FROM anon, authenticated;

-- 2. generations: dibuat dan diubah server setelah lolos pengaman AI.
DROP POLICY IF EXISTS "Users can insert own generation" ON public.generations;
DROP POLICY IF EXISTS "Users can update own generation" ON public.generations;
REVOKE INSERT, UPDATE, DELETE ON public.generations FROM anon, authenticated;

-- 3. generation_chats: riwayat chat ditulis server.
DROP POLICY IF EXISTS "Users can insert own chats" ON public.generation_chats;
REVOKE INSERT, UPDATE, DELETE ON public.generation_chats FROM anon, authenticated;

-- 4. payments: catatan pembayaran hanya ditulis server (checkout dan webhook).
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM anon, authenticated;

-- 5. Fungsi is_admin(): kunci search_path supaya nggak bisa dibelokkan lewat skema lain.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Catatan: admin_settings dan plan_settings sengaja tetap bisa diubah admin lewat kebijakan "Admins can update ...".
-- Itu aman selama role nggak bisa dipalsukan (ditutup di langkah 1). feedback tetap bisa diisi pengguna (kebijakan insert).
