import AdminShell from './AdminShell'

// Middleware sudah memastikan pengunjung /north (selain /north/login) adalah admin yang sah, jadi layout nggak perlu
// bertanya ke server Auth lagi di setiap navigasi. AdminShell menyembunyikan sidebar di halaman login.
export default function NorthLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
