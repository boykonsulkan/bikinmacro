# Tes macro demo di Excel sungguhan. Menjalankan ProsesFile (logika tanpa pop up)
# untuk tiap mode, lalu membandingkan hasilnya dengan angka yang dihitung
# terpisah di demo-data.ps1. Nggak mengubah file di public/demo.
#
# Pakai:  powershell -ExecutionPolicy Bypass -File scripts/demo/test-demo.ps1

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'demo-data.ps1')

$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$xlsx = Join-Path $root 'public\demo\Contoh_Rekap_Penjualan.xlsx'
$xlsm = Join-Path $root 'public\demo\Proses_Rekap_Penjualan.xlsm'
$tmp = Join-Path $env:TEMP ('bm-demo-test-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory $tmp | Out-Null
$macroBook = Join-Path $tmp 'Proses_Rekap_Penjualan.xlsm'
Copy-Item $xlsm $macroBook
$sample = Join-Path $tmp 'Contoh_Rekap_Penjualan.xlsx'
Copy-Item $xlsx $sample
$sample2 = Join-Path $tmp 'Cabang_Dua.xlsx'
Copy-Item $xlsx $sample2

$script:fail = 0
function Check($nama, $ok, $detail = '') {
    if ($ok) { Write-Host "PASS  $nama" } else { Write-Host "FAIL  $nama  $detail"; $script:fail++ }
}

$xl = $null
try {
    $xl = New-Object -ComObject Excel.Application
    $xl.Visible = $false
    $xl.DisplayAlerts = $false
    $xl.AutomationSecurity = 1  # hanya untuk sesi tes ini
    $wb = $xl.Workbooks.Open($macroBook)
    $mulai = $wb.Worksheets.Item('Mulai')
    $hasil = $wb.Worksheets.Item('Hasil')
    $run = "'Proses_Rekap_Penjualan.xlsm'!ProsesFile"

    # ---------- Isi file contoh ----------
    $s = $xl.Workbooks.Open($sample, 0, $true)
    $pj = $s.Worksheets.Item('Penjualan').Range('A1').CurrentRegion.Value2
    Check 'Contoh: 44 baris data + header' ($pj.GetLength(0) -eq 45)
    Check 'Contoh: header Penjualan' ((1..8 | ForEach-Object { $pj[1, $_] }) -join ',' -eq 'No,Tanggal,Sales,Region,Produk,Qty,Harga,Nilai')
    $s.Close($false)

    # ---------- Mode 1: komisi (dijalankan 2x, harus identik) ----------
    $mulai.Range('C4').Value2 = 'Hitung komisi per Sales'
    $snap = @()
    foreach ($k in 1..2) {
        $xl.Run($run, $sample, $true) | Out-Null
        $v = $hasil.Range('A4').CurrentRegion.Value2
        $snap += , (($v | ForEach-Object { "$_" }) -join '|')
    }
    Check 'Komisi: dua kali jalan hasilnya identik' ($snap[0] -eq $snap[1])
    $exp = @(Get-DemoExpectedKomisi)
    $v = $hasil.Range('A4').CurrentRegion.Value2
    Check 'Komisi: jumlah baris (header + 5 Sales + Total)' ($v.GetLength(0) -eq 7) "dapat $($v.GetLength(0))"
    for ($i = 0; $i -lt $exp.Count; $i++) {
        $e = $exp[$i]; $row = $i + 2
        $gSales = $v[$row, 1]; $gReg = $v[$row, 2]; $gJml = [int]$v[$row, 3]
        $gTot = [double]$v[$row, 4]; $gPct = [double]$v[$row, 5]; $gKom = [double]$v[$row, 6]
        $ok = ($gSales -eq $e.Sales) -and ($gReg -eq $e.Region) -and ($gJml -eq $e.Jumlah) `
            -and ($gTot -eq $e.Total) -and ([math]::Abs($gPct - $e.Persen) -lt 1e-9) -and ($gKom -eq $e.Komisi)
        Check "Komisi: $($e.Sales) total $($e.Total) persen $($e.Persen) komisi $($e.Komisi)" $ok "dapat $($v[$row,1]) $($v[$row,3]) $($v[$row,4]) $($v[$row,5]) $($v[$row,6])"
    }
    $sumKomisi = ($exp | Measure-Object -Property Komisi -Sum).Sum
    Check 'Komisi: baris Total' (($v[7, 1] -eq 'Total') -and ([double]$v[7, 6] -eq $sumKomisi))
    Check 'Komisi: status di sheet Mulai' ($mulai.Range('C11').Value2 -like 'Selesai. Komisi 5 Sales*')

    # ---------- Mode 2: pecah per Sales ----------
    $mulai.Range('C4').Value2 = 'Pecah jadi file baru per nilai unik'
    $mulai.Range('C5').Value2 = 'Sales'
    $xl.Run($run, $sample, $true) | Out-Null
    $rows = @(Get-DemoRows)
    foreach ($nm in 'Andi', 'Budi', 'Citra', 'Dewi', 'Eko') {
        $f = Join-Path $tmp "Contoh_Rekap_Penjualan_Sales_$nm.xlsx"
        $want = @($rows | Where-Object { $_.Sales -eq $nm }).Count
        if (Test-Path $f) {
            $b = $xl.Workbooks.Open($f, 0, $true)
            $d = $b.Worksheets.Item('Penjualan').Range('A1').CurrentRegion.Value2
            $allSame = $true
            for ($r = 2; $r -le $d.GetLength(0); $r++) { if ($d[$r, 3] -ne $nm) { $allSame = $false } }
            $fmt = $b.Worksheets.Item('Penjualan').Range('B2').NumberFormat
            Check "Pecah: file $nm berisi $want baris, semuanya Sales $nm, format tanggal $fmt" (($d.GetLength(0) - 1 -eq $want) -and $allSame -and ($fmt -eq 'dd/mm/yyyy'))
            $b.Close($false)
        }
        else { Check "Pecah: file $nm ada" $false }
    }
    $log = $hasil.Range('A4').CurrentRegion.Value2
    Check 'Pecah: sheet Hasil mencatat 5 file' ($log.GetLength(0) -eq 6) "dapat $($log.GetLength(0))"

    # ---------- Mode 2 dengan kolom Region ----------
    $mulai.Range('C5').Value2 = 'Region'
    $xl.Run($run, $sample, $true) | Out-Null
    $regs = @($rows | Select-Object -ExpandProperty Region -Unique)
    $okReg = $true
    foreach ($rg in $regs) { if (-not (Test-Path (Join-Path $tmp "Contoh_Rekap_Penjualan_Region_$rg.xlsx"))) { $okReg = $false } }
    Check "Pecah per Region: $($regs.Count) file ($($regs -join ', '))" $okReg

    # ---------- Mode 3: gabung 2 file ----------
    $mulai.Range('C4').Value2 = 'Gabung beberapa file jadi satu'
    $xl.Run($run, [string[]]@($sample, $sample2), $true) | Out-Null
    $g = $hasil.Range('A4').CurrentRegion.Value2
    Check 'Gabung: 88 baris data + header' ($g.GetLength(0) -eq 89) "dapat $($g.GetLength(0))"
    Check 'Gabung: kolom Sumber File' (($g[1, 9] -eq 'Sumber File') -and ($g[2, 9] -eq 'Contoh_Rekap_Penjualan.xlsx') -and ($g[89, 9] -eq 'Cabang_Dua.xlsx'))
    $sumNilai = 0; for ($r = 2; $r -le 89; $r++) { $sumNilai += [double]$g[$r, 8] }
    $expNilai = 2 * ($rows | Measure-Object -Property Nilai -Sum).Sum
    Check "Gabung: total Nilai $expNilai" ($sumNilai -eq $expNilai) "dapat $sumNilai"

    # ---------- Kasus gagal ----------
    $bad = Join-Path $tmp 'Salah.xlsx'
    $b = $xl.Workbooks.Add(); $b.SaveAs($bad, 51); $b.Close($false)
    $mulai.Range('C4').Value2 = 'Hitung komisi per Sales'
    $xl.Run($run, $bad, $true) | Out-Null
    Check 'Gagal: file tanpa sheet Penjualan, pesan jelas' ($mulai.Range('C11').Value2 -like "Gagal: Sheet 'Penjualan' nggak ketemu*") $mulai.Range('C11').Value2
    $mulai.Range('C4').Value2 = ''
    $xl.Run($run, $sample, $true) | Out-Null
    Check 'Gagal: mode belum dipilih, pesan jelas' ($mulai.Range('C11').Value2 -like 'Gagal: Mode proses belum dipilih*') $mulai.Range('C11').Value2
    $xl.Run($run, (Join-Path $tmp 'tidak-ada.xlsx'), $true) | Out-Null
    $mulai.Range('C4').Value2 = 'Hitung komisi per Sales'
    $xl.Run($run, (Join-Path $tmp 'tidak-ada.xlsx'), $true) | Out-Null
    Check 'Gagal: file tidak ada, pesan jelas' ($mulai.Range('C11').Value2 -like 'Gagal: File nggak ketemu*') $mulai.Range('C11').Value2

    # ---------- Tombol ----------
    $btn = $mulai.Shapes.Item('TombolJalankan')
    Check "Tombol Jalankan terhubung ke macro ($($btn.OnAction))" ($btn.OnAction -like '*Jalankan')

    $wb.Close($false)
}
finally {
    if ($xl) { $xl.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($xl) }
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host ''
if ($script:fail -eq 0) { Write-Host 'SEMUA TES LOLOS' } else { Write-Host "$script:fail TES GAGAL"; exit 1 }
