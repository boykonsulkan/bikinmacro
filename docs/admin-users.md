# Kelola pengguna (admin)

Halaman `/north/users`: cari email atau ID, filter Semua/Aktif/Nonaktif, dan tombol **Kelola** per pengguna.

| Aksi | Efek | Bisa dibatalkan? |
|---|---|---|
| Ubah paket | Mengubah `users.plan` dan menyetel `credits_limit` sesuai `plan_settings`. Kredit terpakai tidak berubah. | Ya, ubah lagi |
| Reset kredit | `credits_used` jadi 0 | Tidak perlu |
| Nonaktifkan (soft delete) | Akun diblokir di Supabase Auth. Login baru ditolak dan sesi yang sedang aktif langsung putus. **Semua data tetap ada.** | Ya, "Aktifkan kembali" |
| Hapus permanen (hard delete) | Hanya untuk akun yang sudah nonaktif dan emailnya diketik ulang. Menghapus akun, macro, chat, masukan, kejadian, catatan pemakaian AI, undangan, dan log email atas email itu. | **Tidak** |

Yang sengaja dipertahankan saat hapus permanen: catatan pembayaran (`payments`) tetap ada, hanya dilepas dari akun
(`user_id` dikosongkan), supaya pembukuan utuh. Pesanan layanan Dibuatin (`orders`) tidak ikut terhapus.

Pengaman: tidak bisa menonaktifkan atau menghapus akunmu sendiri maupun admin lain. Semua aksi lewat server action
(`src/app/north/users/actions.ts`) yang memverifikasi admin, divalidasi `src/lib/admin/users.ts`, dan dicatat sebagai
kejadian `admin_action` (user_id = admin yang melakukan) di tabel `events`.

Soft delete memakai blokir bawaan Supabase Auth (`ban_duration`), jadi tidak butuh perubahan skema database.
Pengguna yang diblokir melihat pesan "Akunmu sedang dinonaktifkan. Hubungi founder lewat halaman Bantuan."

Tes: `npx tsx scripts/test-admin-users.ts` (aturan).
