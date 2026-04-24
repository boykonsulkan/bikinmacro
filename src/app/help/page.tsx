import { Book, MessageSquare, Code, Mail, MessageCircle } from 'lucide-react'

export default function HelpPage() {
  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-6 sm:p-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold text-foreground mb-4">Bantuan & Support</h1>
        <p className="text-lg text-muted">Punya pertanyaan atau butuh bantuan? Kami siap membantu Anda.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <div className="bg-card border border-border p-8 rounded-2xl flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-primary/10 text-primary flex items-center justify-center rounded-full mb-4">
            <Mail size={24} />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Email</h3>
          <p className="text-sm text-muted mb-4">Kirim email ke kami dan kami akan membalas secepatnya.</p>
          <a href="mailto:support@bikinmacro.com" className="text-primary font-bold hover:underline">support@bikinmacro.com</a>
        </div>

        <div className="bg-card border border-border p-8 rounded-2xl flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-primary/10 text-primary flex items-center justify-center rounded-full mb-4">
            <MessageCircle size={24} />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Discord</h3>
          <p className="text-sm text-muted mb-4">Gabung komunitas Discord kami untuk diskusi dan bantuan langsung.</p>
          <a href="#" className="text-primary font-bold hover:underline">Join Discord Server</a>
        </div>
      </div>

      <div className="space-y-12">
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <MessageSquare size={20} />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Tips Prompting (Hasil Maksimal)</h2>
          </div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <h4 className="font-bold text-foreground">1. Spesifikkan Nama Kolom & Sheet</h4>
                <p className="text-sm text-muted">Daripada bilang "jumlahkan data", lebih baik: "Jumlahkan nilai di kolom B (Sales) dan letakkan hasilnya di kolom C baris terakhir."</p>
              </div>
              <div className="space-y-2 border-t border-border pt-4">
                <h4 className="font-bold text-foreground">2. Jelaskan Alurnya Secara Berurutan</h4>
                <p className="text-sm text-muted">"Filter data di kolom A yang berisi kata 'Lunas', lalu copy baris tersebut ke Sheet2."</p>
              </div>
              <div className="space-y-2 border-t border-border pt-4">
                <h4 className="font-bold text-foreground">3. Berikan Contoh Format Data</h4>
                <p className="text-sm text-muted">"Format tanggal di kolom D adalah DD/MM/YYYY. Tolong ubah jadi YYYY-MM-DD."</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Code size={20} />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Cara Memasang Macro di Excel</h2>
          </div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-6 space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 shrink-0 bg-primary/20 text-primary flex items-center justify-center rounded-full font-bold text-sm">1</div>
                <div>
                  <h4 className="font-bold text-foreground mb-1">Buka VBA Editor</h4>
                  <p className="text-sm text-muted">Tekan <kbd className="bg-background border border-border px-1 rounded text-xs">ALT + F11</kbd> di keyboard saat Excel terbuka.</p>
                </div>
              </div>
              <div className="flex gap-4 border-t border-border pt-6">
                <div className="w-8 h-8 shrink-0 bg-primary/20 text-primary flex items-center justify-center rounded-full font-bold text-sm">2</div>
                <div>
                  <h4 className="font-bold text-foreground mb-1">Insert Module</h4>
                  <p className="text-sm text-muted">Klik menu <span className="font-medium text-foreground">Insert</span> di atas, lalu pilih <span className="font-medium text-foreground">Module</span>.</p>
                </div>
              </div>
              <div className="flex gap-4 border-t border-border pt-6">
                <div className="w-8 h-8 shrink-0 bg-primary/20 text-primary flex items-center justify-center rounded-full font-bold text-sm">3</div>
                <div>
                  <h4 className="font-bold text-foreground mb-1">Paste Kode</h4>
                  <p className="text-sm text-muted">Paste kode yang digenerate oleh BikinMacro ke dalam jendela modul yang baru terbuka.</p>
                </div>
              </div>
              <div className="flex gap-4 border-t border-border pt-6">
                <div className="w-8 h-8 shrink-0 bg-primary/20 text-primary flex items-center justify-center rounded-full font-bold text-sm">4</div>
                <div>
                  <h4 className="font-bold text-foreground mb-1">Simpan sebagai .xlsm</h4>
                  <p className="text-sm text-muted">PENTING: Simpan file Excel Anda dengan format <span className="font-medium text-foreground">Excel Macro-Enabled Workbook (.xlsm)</span> agar kode tidak hilang.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
