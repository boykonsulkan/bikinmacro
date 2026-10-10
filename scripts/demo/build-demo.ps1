# Membangun file demo "Proses Rekap Penjualan" memakai Excel yang terpasang.
#   public/demo/Contoh_Rekap_Penjualan.xlsx   file yang di-download user
#   public/demo/Proses_Rekap_Penjualan.xlsm   hasil "generate": sheet Mulai/Hasil/Opsi/Petunjuk + macro
#   public/demo/Proses_Rekap_Penjualan.bas    kode VBA-nya (bonus)
#
# Menanam macro butuh "Trust access to the VBA project object model".
# Skrip ini menyalakannya SEMENTARA (HKCU) lalu mengembalikan ke nilai semula.
#
# Pakai:  powershell -ExecutionPolicy Bypass -File scripts/demo/build-demo.ps1

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'demo-data.ps1')

$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$outDir = Join-Path $root 'public\demo'
New-Item -ItemType Directory -Force $outDir | Out-Null
$xlsxPath = Join-Path $outDir 'Contoh_Rekap_Penjualan.xlsx'
$xlsmPath = Join-Path $outDir 'Proses_Rekap_Penjualan.xlsm'
$basPath = Join-Path $outDir 'Proses_Rekap_Penjualan.bas'
$basSource = Join-Path $PSScriptRoot 'ProsesRekap.bas'

function RGBc([int]$r, [int]$g, [int]$b) { $r + 256 * $g + 65536 * $b }
$NAVY = RGBc 5 28 44
$GREEN = RGBc 0 122 78
$BLUE = RGBc 29 78 216
$GRAY = RGBc 75 85 99

function Style-Header($range) {
    $range.Font.Bold = $true
    $range.Font.Color = (RGBc 255 255 255)
    $range.Interior.Color = $NAVY
}

# --- Nyalakan akses VBA sementara -------------------------------------------
$regPath = 'HKCU:\Software\Microsoft\Office\16.0\Excel\Security'
if (-not (Test-Path $regPath)) { New-Item -Path $regPath -Force | Out-Null }
$prev = (Get-ItemProperty -Path $regPath -Name AccessVBOM -ErrorAction SilentlyContinue).AccessVBOM
Set-ItemProperty -Path $regPath -Name AccessVBOM -Value 1 -Type DWord

$xl = $null
try {
    $xl = New-Object -ComObject Excel.Application
    $xl.Visible = $false
    $xl.DisplayAlerts = $false

    # ======================= 1. Contoh_Rekap_Penjualan.xlsx =======================
    $wb = $xl.Workbooks.Add()
    while ($wb.Worksheets.Count -lt 2) { [void]$wb.Worksheets.Add() }
    $ws = $wb.Worksheets.Item(1)
    $ws.Name = 'Penjualan'

    $rows = @(Get-DemoRows)
    $n = $rows.Count
    $arr = New-Object 'object[,]' ($n + 1), 8
    $head = 'No', 'Tanggal', 'Sales', 'Region', 'Produk', 'Qty', 'Harga', 'Nilai'
    for ($c = 0; $c -lt 8; $c++) { $arr[0, $c] = $head[$c] }
    for ($i = 0; $i -lt $n; $i++) {
        $r = $rows[$i]
        $arr[($i + 1), 0] = $r.No
        $arr[($i + 1), 1] = $r.Tanggal
        $arr[($i + 1), 2] = $r.Sales
        $arr[($i + 1), 3] = $r.Region
        $arr[($i + 1), 4] = $r.Produk
        $arr[($i + 1), 5] = $r.Qty
        $arr[($i + 1), 6] = $r.Harga
        $arr[($i + 1), 7] = "=F$($i + 2)*G$($i + 2)"
    }
    $ws.Range('A1').Resize($n + 1, 8).Formula = $arr
    $ws.Range("B2:B$($n + 1)").NumberFormat = 'dd/mm/yyyy'
    $ws.Range("F2:F$($n + 1)").NumberFormat = '0'
    $ws.Range("G2:H$($n + 1)").NumberFormat = '#,##0'
    Style-Header $ws.Range('A1:H1')
    $ws.Columns('A:H').AutoFit() | Out-Null

    $wr = $wb.Worksheets.Item(2)
    $wr.Name = 'Aturan Komisi'
    $wr.Range('A1:C1').Value2 = [object[]]@('Dari (Rp)', 'Sampai (Rp)', 'Komisi (%)')
    $t = 2
    foreach ($tier in (Get-DemoTiers)) {
        $wr.Cells.Item($t, 1).Value2 = [double]$tier.Dari
        if ($null -eq $tier.Sampai) { $wr.Cells.Item($t, 2).Value2 = 'ke atas' } else { $wr.Cells.Item($t, 2).Value2 = [double]$tier.Sampai }
        $wr.Cells.Item($t, 3).Value2 = [double]$tier.Persen
        $t++
    }
    $wr.Range('A2:B4').NumberFormat = '#,##0'
    $wr.Range('C2:C4').NumberFormat = '0.0%'
    Style-Header $wr.Range('A1:C1')
    $wr.Range('E1').Value2 = 'Catatan'
    $wr.Range('E1').Font.Bold = $true
    $wr.Range('E2').Value2 = 'Komisi dihitung dari total Nilai penjualan tiap Sales.'
    $wr.Range('E3').Value2 = 'Persen tier berlaku untuk seluruh total, bukan per bagian.'
    $wr.Range('E4').Value2 = 'Contoh: total 80.000.000 masuk tier 2%, komisinya 1.600.000.'
    $wr.Columns('A:C').AutoFit() | Out-Null
    $wr.Columns('E').ColumnWidth = 62
    $ws.Activate()
    if (Test-Path $xlsxPath) { Remove-Item $xlsxPath -Force }
    $wb.SaveAs($xlsxPath, 51)
    $wb.Close($false)

    # ======================= 2. Proses_Rekap_Penjualan.xlsm =======================
    $wb = $xl.Workbooks.Add()
    while ($wb.Worksheets.Count -lt 4) { [void]$wb.Worksheets.Add([Type]::Missing, $wb.Worksheets.Item($wb.Worksheets.Count)) }
    $mulai = $wb.Worksheets.Item(1); $mulai.Name = 'Mulai'
    $hasil = $wb.Worksheets.Item(2); $hasil.Name = 'Hasil'
    $opsi = $wb.Worksheets.Item(3);  $opsi.Name = 'Opsi'
    $pet = $wb.Worksheets.Item(4);   $pet.Name = 'Petunjuk'

    # --- Opsi: daftar pilihan proses (sumber dropdown di sheet Mulai) ---
    $opsi.Range('A1:B1').Value2 = [object[]]@('Mode proses', 'Penjelasan')
    $opsi.Range('A2').Value2 = 'Hitung komisi per Sales'
    $opsi.Range('B2').Value2 = 'Total penjualan tiap Sales dikali persen dari sheet Aturan Komisi di file yang kamu pilih.'
    $opsi.Range('A3').Value2 = 'Pecah jadi file baru per nilai unik'
    $opsi.Range('B3').Value2 = 'Bikin satu file Excel baru untuk tiap nilai unik di kolom pemecah, misalnya satu file per Sales.'
    $opsi.Range('A4').Value2 = 'Gabung beberapa file jadi satu'
    $opsi.Range('B4').Value2 = 'Pilih beberapa file sekaligus, datanya digabung ke satu tabel di sheet Hasil.'
    $opsi.Range('D1').Value2 = 'Kolom pemecah'
    $opsi.Range('D2').Value2 = 'Sales'
    $opsi.Range('D3').Value2 = 'Region'
    $opsi.Range('D4').Value2 = 'Produk'
    Style-Header $opsi.Range('A1:B1')
    Style-Header $opsi.Range('D1')
    $opsi.Columns('A').ColumnWidth = 38
    $opsi.Columns('B').ColumnWidth = 95
    $opsi.Columns('D').ColumnWidth = 18

    # --- Mulai ---
    $mulai.Columns('A').ColumnWidth = 3
    $mulai.Columns('B').ColumnWidth = 30
    $mulai.Columns('C').ColumnWidth = 52
    $mulai.Range('B2').Value2 = 'PROSES REKAP PENJUALAN'
    $mulai.Range('B2').Font.Bold = $true
    $mulai.Range('B2').Font.Size = 16
    $mulai.Range('B2').Font.Color = $NAVY
    $mulai.Range('B3').Value2 = 'Pilih proses di bawah, lalu klik Jalankan. Excel akan minta kamu memilih file yang mau diproses.'
    $mulai.Range('B3').Font.Color = $GRAY
    $mulai.Range('B4').Value2 = 'Mode proses'
    $mulai.Range('B5').Value2 = 'Kolom pemecah'
    $mulai.Range('B6').Value2 = 'Kolom pemecah cuma dipakai di mode "Pecah jadi file baru".'
    $mulai.Range('B6').Font.Size = 9
    $mulai.Range('B6').Font.Color = $GRAY
    $mulai.Range('C4').Value2 = 'Hitung komisi per Sales'
    $mulai.Range('C5').Value2 = 'Sales'
    foreach ($a in 'C4', 'C5') {
        $cell = $mulai.Range($a)
        $cell.Font.Color = $BLUE
        $cell.Font.Bold = $true
        $cell.Interior.Color = (RGBc 239 246 255)
        $cell.Borders.LineStyle = 1
        $cell.Borders.Color = (RGBc 191 219 254)
    }
    $v4 = $mulai.Range('C4').Validation
    $v4.Delete()
    $v4.Add(3, 1, 1, '=Opsi!$A$2:$A$4') | Out-Null
    $v4.InCellDropdown = $true
    $v5 = $mulai.Range('C5').Validation
    $v5.Delete()
    $v5.Add(3, 1, 1, '=Opsi!$D$2:$D$4') | Out-Null
    $v5.InCellDropdown = $true
    $mulai.Range('B4:B5').Font.Bold = $true
    $mulai.Range('B11').Value2 = 'Status'
    $mulai.Range('B11').Font.Bold = $true
    $mulai.Range('C11').Value2 = 'Siap dijalankan.'
    $mulai.Range('C11').WrapText = $true
    $mulai.Range('C11').VerticalAlignment = -4160
    $mulai.Rows.Item(4).RowHeight = 24
    $mulai.Rows.Item(5).RowHeight = 24
    $mulai.Range('B4:C5').VerticalAlignment = -4108

    # --- Hasil (placeholder sebelum dijalankan) ---
    $hasil.Range('A1').Value2 = 'Hasil proses'
    $hasil.Range('A1').Font.Bold = $true
    $hasil.Range('A1').Font.Size = 14
    $hasil.Range('A2').Value2 = 'Belum ada hasil. Klik Jalankan di sheet Mulai.'
    $hasil.Range('A2').Font.Color = $GRAY
    $hasil.Columns('A').ColumnWidth = 60

    # --- Petunjuk ---
    $lines = @(
        @('Cara pakai', 'h'),
        @('1. Buka sheet Mulai.', ''),
        @('2. Pilih Mode proses. Kalau pilih mode Pecah, pilih juga Kolom pemecah.', ''),
        @('3. Klik tombol Jalankan.', ''),
        @('4. Di pop up, pilih file Excel yang mau diproses. Mode Gabung boleh pilih lebih dari satu file.', ''),
        @('5. Lihat hasilnya di sheet Hasil.', ''),
        @('', ''),
        @('Mode yang tersedia', 'h'),
        @('Hitung komisi per Sales: total penjualan tiap Sales dikali persen dari sheet Aturan Komisi.', ''),
        @('Pecah jadi file baru per nilai unik: satu file baru untuk tiap nilai unik di kolom pemecah, disimpan di folder yang sama dengan file sumber.', ''),
        @('Gabung beberapa file jadi satu: data dari semua file yang dipilih digabung ke sheet Hasil.', ''),
        @('', ''),
        @('File yang cocok', 'h'),
        @('File harus punya sheet Penjualan dengan kolom: No, Tanggal, Sales, Region, Produk, Qty, Harga, Nilai.', ''),
        @('Untuk mode komisi, file juga harus punya sheet Aturan Komisi dengan kolom: Dari (Rp), Sampai (Rp), Komisi (%).', ''),
        @('File yang kamu pilih dibuka read-only, jadi file aslinya nggak berubah.', ''),
        @('', ''),
        @('Muncul bar merah "macro diblokir"? Itu normal.', 'h'),
        @('1. Tutup file ini.', ''),
        @('2. Klik kanan file, pilih Properties.', ''),
        @('3. Centang Unblock di bagian bawah, lalu klik OK.', ''),
        @('4. Buka lagi file ini, lalu klik Enable Content.', '')
    )
    $pet.Columns('A').ColumnWidth = 3
    $pet.Columns('B').ColumnWidth = 110
    $r = 2
    foreach ($l in $lines) {
        $pet.Cells.Item($r, 2).Value2 = $l[0]
        if ($l[1] -eq 'h') { $pet.Cells.Item($r, 2).Font.Bold = $true; $pet.Cells.Item($r, 2).Font.Color = $NAVY; $pet.Cells.Item($r, 2).Font.Size = 12 }
        $pet.Cells.Item($r, 2).WrapText = $true
        $r++
    }

    # --- Macro ---
    $code = [IO.File]::ReadAllText($basSource, [Text.Encoding]::Default)
    $code = ($code -split "\r?\n" | Where-Object { $_ -notmatch '^Attribute VB_Name' }) -join "`r`n"
    $mod = $wb.VBProject.VBComponents.Add(1)
    $mod.Name = 'ProsesRekap'
    $mod.CodeModule.AddFromString($code)

    # --- Tombol Jalankan ---
    $mulai.Activate()
    $rng = $mulai.Range('B8:C9')
    $btn = $mulai.Shapes.AddShape(5, $rng.Left, $rng.Top, $rng.Width, $rng.Height)
    $btn.Name = 'TombolJalankan'
    $btn.Fill.ForeColor.RGB = $GREEN
    $btn.Line.Visible = 0
    $btn.TextFrame2.TextRange.Text = 'Jalankan'
    $btn.TextFrame2.TextRange.Font.Size = 16
    $btn.TextFrame2.TextRange.Font.Bold = -1
    $btn.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = (RGBc 255 255 255)
    $btn.OnAction = 'Jalankan'
    try { $xl.ActiveWindow.DisplayGridlines = $false } catch {}
    $mulai.Range('C4').Select() | Out-Null

    if (Test-Path $xlsmPath) { Remove-Item $xlsmPath -Force }
    $wb.SaveAs($xlsmPath, 52)
    if (Test-Path $basPath) { Remove-Item $basPath -Force }
    $wb.VBProject.VBComponents.Item('ProsesRekap').Export($basPath)
    $wb.Close($false)
    Write-Host "OK: $xlsxPath"
    Write-Host "OK: $xlsmPath"
    Write-Host "OK: $basPath"
}
finally {
    if ($xl) { $xl.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($xl) }
    # --- Kembalikan pengaturan keamanan Excel ke semula ---
    if ($null -eq $prev) { Remove-ItemProperty -Path $regPath -Name AccessVBOM -ErrorAction SilentlyContinue }
    else { Set-ItemProperty -Path $regPath -Name AccessVBOM -Value $prev -Type DWord }
    $now = (Get-ItemProperty -Path $regPath -Name AccessVBOM -ErrorAction SilentlyContinue).AccessVBOM
    Write-Host "AccessVBOM dikembalikan: sebelumnya=[$prev] sekarang=[$now]"
}
