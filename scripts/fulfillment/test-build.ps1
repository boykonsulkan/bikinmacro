# Tes pembangun generik: bangun file dari contoh spec + macro, lalu jalankan
# macro-nya di Excel sungguhan dan cek hasilnya.
#
# Pakai:  powershell -ExecutionPolicy Bypass -File scripts/fulfillment/test-build.ps1

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$sampleXlsx = Join-Path $root 'public\demo\Contoh_Rekap_Penjualan.xlsx'
$tmp = Join-Path $env:TEMP ('bm-fulfil-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory $tmp | Out-Null
Copy-Item $sampleXlsx (Join-Path $tmp 'sumber.xlsx')

$script:fail = 0
function Check($nama, $ok, $detail = '') {
    if ($ok) { Write-Host "PASS  $nama" } else { Write-Host "FAIL  $nama  $detail"; $script:fail++ }
}

& (Join-Path $PSScriptRoot 'build-xlsm.ps1') -Spec (Join-Path $PSScriptRoot 'example\spec.json') -Bas (Join-Path $PSScriptRoot 'example\macro.bas') -OutDir $tmp | Out-Null
$built = Join-Path $tmp 'Contoh_Daftar_Sheet.xlsm'
Check 'File .xlsm terbentuk' (Test-Path $built)

$xl = $null
try {
    $xl = New-Object -ComObject Excel.Application
    $xl.Visible = $false
    $xl.DisplayAlerts = $false
    $xl.AutomationSecurity = 1
    $wb = $xl.Workbooks.Open($built)

    $names = @($wb.Worksheets | ForEach-Object { $_.Name })
    Check "Sheet: Mulai, Hasil, Opsi, Petunjuk ($($names -join ', '))" (($names -join ',') -eq 'Mulai,Hasil,Opsi,Petunjuk')
    $nm = @($wb.Names | ForEach-Object { $_.Name })
    Check 'Named range Set_Awalan, Set_Info, Status_Proses' (($nm -contains 'Set_Awalan') -and ($nm -contains 'Set_Info') -and ($nm -contains 'Status_Proses')) ($nm -join ',')
    $mulai = $wb.Worksheets.Item('Mulai')
    Check 'Dropdown Info mengacu ke sheet Opsi' ($mulai.Range('Set_Info').Validation.Formula1 -like '=Opsi!*')
    Check 'Nilai awal pengaturan' (($mulai.Range('Set_Awalan').Value2 -eq 'Sheet:') -and ($mulai.Range('Set_Info').Value2 -eq 'Nama sheet saja'))
    Check 'Tombol terhubung ke macro Jalankan' ($mulai.Shapes.Item('TombolJalankan').OnAction -like '*Jalankan')
    $pet = $wb.Worksheets.Item('Petunjuk').UsedRange.Value2
    $teksPet = ($pet | ForEach-Object { "$_" }) -join '|'
    Check 'Petunjuk berisi panduan unblock otomatis' ($teksPet -like '*macro diblokir*' -and $teksPet -like '*Enable Content*')

    $run = "'Contoh_Daftar_Sheet.xlsm'!Proses"
    $xl.Run($run, (Join-Path $tmp 'sumber.xlsx'), $true) | Out-Null
    $h = $wb.Worksheets.Item('Hasil').Range('A3').CurrentRegion.Value2
    Check 'Hasil: 2 sheet dicatat dengan awalan' (($h.GetLength(0) -eq 3) -and ($h[2, 1] -eq 'Sheet: Penjualan') -and ($h[3, 1] -eq 'Sheet: Aturan Komisi')) "dapat $($h[2,1])"
    $b22 = "$($h[2, 2])"
    Check 'Hasil: mode "Nama sheet saja" tanpa jumlah baris' ($b22 -eq '')
    $mulai.Range('Set_Info').Value2 = 'Nama sheet dan jumlah baris'
    $xl.Run($run, (Join-Path $tmp 'sumber.xlsx'), $true) | Out-Null
    $h = $wb.Worksheets.Item('Hasil').Range('A3').CurrentRegion.Value2
    Check 'Hasil: mode dengan jumlah baris (45 untuk Penjualan)' ([int]$h[2, 2] -eq 45) "dapat $($h[2,2])"
    Check 'Status_Proses terisi' ($mulai.Range('Status_Proses').Value2 -like 'Selesai.*')
    $xl.Run($run, (Join-Path $tmp 'tidak-ada.xlsx'), $true) | Out-Null
    Check 'Gagal: file tidak ada, pesan jelas' ($mulai.Range('Status_Proses').Value2 -like 'Gagal: File nggak ketemu*')
    $wb.Close($false)
}
finally {
    if ($xl) { $xl.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($xl) }
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host ''
if ($script:fail -eq 0) { Write-Host 'SEMUA TES LOLOS' } else { Write-Host "$script:fail TES GAGAL"; exit 1 }
