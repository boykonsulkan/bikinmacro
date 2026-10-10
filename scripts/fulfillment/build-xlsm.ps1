# Membangun file .xlsm pesanan dari dua input:
#   -Spec  spec.json  (judul, pengaturan di sheet Mulai, isi sheet Petunjuk)
#   -Bas   macro.bas  (kode VBA hasil Claude)
# memakai Excel yang terpasang. Susunan file: sheet Mulai, Hasil, Opsi (kalau ada
# pengaturan berjenis list), Petunjuk, plus tombol yang memanggil macro.
#
# Pakai:
#   powershell -ExecutionPolicy Bypass -File scripts/fulfillment/build-xlsm.ps1 `
#       -Spec pesanan\BM-XXXX\spec.json -Bas pesanan\BM-XXXX\macro.bas -OutDir pesanan\BM-XXXX
#
# Konvensi yang dipakai kode VBA (lihat docs/fulfillment/PROMPT.md):
#   Pengaturan di Mulai dibaca lewat Named Range  Set_<name>   (mis. Range("Set_Mode"))
#   Status ditulis ke Named Range                Status_Proses
#   Hasil ditulis ke sheet "Hasil".
#
# Menanam macro butuh "Trust access to the VBA project object model". Skrip ini
# menyalakannya SEMENTARA (HKCU) lalu mengembalikannya ke nilai semula.

param(
    [Parameter(Mandatory = $true)][string]$Spec,
    [Parameter(Mandatory = $true)][string]$Bas,
    [string]$OutDir = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'

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

$specObj = Get-Content -Raw -Encoding UTF8 $Spec | ConvertFrom-Json
foreach ($k in 'outputFile', 'title', 'settings') {
    if (-not $specObj.PSObject.Properties[$k]) { throw "spec.json: field '$k' wajib ada." }
}
$macroName = if ($specObj.macroName) { $specObj.macroName } else { 'Jalankan' }
$buttonText = if ($specObj.buttonText) { $specObj.buttonText } else { 'Jalankan' }

New-Item -ItemType Directory -Force $OutDir | Out-Null
$outPath = Join-Path (Resolve-Path $OutDir) $specObj.outputFile

$rawCode = [IO.File]::ReadAllText((Resolve-Path $Bas), [Text.Encoding]::Default)
$lines = $rawCode -split "\r?\n"
$modName = 'ProsesMacro'
$attr = $lines | Where-Object { $_ -match '^Attribute VB_Name\s*=\s*"([^"]+)"' } | Select-Object -First 1
if ($attr -match '"([^"]+)"') { $modName = $Matches[1] }
$code = ($lines | Where-Object { $_ -notmatch '^Attribute VB_Name' }) -join "`r`n"

$regPath = 'HKCU:\Software\Microsoft\Office\16.0\Excel\Security'
if (-not (Test-Path $regPath)) { New-Item -Path $regPath -Force | Out-Null }
$prev = (Get-ItemProperty -Path $regPath -Name AccessVBOM -ErrorAction SilentlyContinue).AccessVBOM
Set-ItemProperty -Path $regPath -Name AccessVBOM -Value 1 -Type DWord

$xl = $null
try {
    $xl = New-Object -ComObject Excel.Application
    $xl.Visible = $false
    $xl.DisplayAlerts = $false

    $settings = @($specObj.settings)
    $listSettings = @($settings | Where-Object { $_.type -eq 'list' })
    $sheetCount = if ($listSettings.Count -gt 0) { 4 } else { 3 }

    $wb = $xl.Workbooks.Add()
    while ($wb.Worksheets.Count -lt $sheetCount) { [void]$wb.Worksheets.Add([Type]::Missing, $wb.Worksheets.Item($wb.Worksheets.Count)) }
    $mulai = $wb.Worksheets.Item(1); $mulai.Name = 'Mulai'
    $hasil = $wb.Worksheets.Item(2); $hasil.Name = 'Hasil'
    if ($listSettings.Count -gt 0) {
        $opsi = $wb.Worksheets.Item(3); $opsi.Name = 'Opsi'
        $pet = $wb.Worksheets.Item(4); $pet.Name = 'Petunjuk'
    }
    else { $pet = $wb.Worksheets.Item(3); $pet.Name = 'Petunjuk' }

    # ---------------- Opsi (sumber dropdown) ----------------
    $listAddress = @{}
    if ($listSettings.Count -gt 0) {
        $col = 1
        foreach ($s in $listSettings) {
            $opsi.Cells.Item(1, $col).Value2 = $s.label
            $opsi.Cells.Item(1, $col + 1).Value2 = 'Penjelasan'
            Style-Header $opsi.Range($opsi.Cells.Item(1, $col), $opsi.Cells.Item(1, $col + 1))
            $r = 2
            foreach ($o in @($s.options)) {
                if ($o -is [string]) { $val = $o; $desc = '' } else { $val = $o.value; $desc = $o.description }
                $opsi.Cells.Item($r, $col).Value2 = $val
                if ($desc) { $opsi.Cells.Item($r, $col + 1).Value2 = $desc }
                $r++
            }
            $first = $opsi.Cells.Item(2, $col).Address($true, $true)
            $last = $opsi.Cells.Item($r - 1, $col).Address($true, $true)
            $listAddress[$s.name] = "=Opsi!${first}:${last}"
            $opsi.Columns.Item($col).ColumnWidth = 38
            $opsi.Columns.Item($col + 1).ColumnWidth = 80
            $col += 3
        }
    }

    # ---------------- Mulai ----------------
    $mulai.Columns('A').ColumnWidth = 3
    $mulai.Columns('B').ColumnWidth = 30
    $mulai.Columns('C').ColumnWidth = 44
    $mulai.Columns('D').ColumnWidth = 58
    $mulai.Range('B2').Value2 = $specObj.title
    $mulai.Range('B2').Font.Bold = $true
    $mulai.Range('B2').Font.Size = 16
    $mulai.Range('B2').Font.Color = $NAVY
    if ($specObj.intro) {
        $mulai.Range('B3').Value2 = $specObj.intro
        $mulai.Range('B3').Font.Color = $GRAY
    }

    $row = 4
    foreach ($s in $settings) {
        $mulai.Cells.Item($row, 2).Value2 = $s.label
        $mulai.Cells.Item($row, 2).Font.Bold = $true
        $cell = $mulai.Cells.Item($row, 3)
        if ($null -ne $s.default) { $cell.Value2 = $s.default }
        $cell.Font.Color = $BLUE
        $cell.Font.Bold = $true
        $cell.Interior.Color = (RGBc 239 246 255)
        $cell.Borders.LineStyle = 1
        $cell.Borders.Color = (RGBc 191 219 254)
        $mulai.Rows.Item($row).RowHeight = 24
        $mulai.Range($mulai.Cells.Item($row, 2), $cell).VerticalAlignment = -4108
        if ($s.note) {
            $mulai.Cells.Item($row, 4).Value2 = $s.note
            $mulai.Cells.Item($row, 4).Font.Size = 9
            $mulai.Cells.Item($row, 4).Font.Color = $GRAY
            $mulai.Cells.Item($row, 4).VerticalAlignment = -4108
        }
        if ($s.type -eq 'list') {
            $v = $cell.Validation
            $v.Delete()
            $v.Add(3, 1, 1, $listAddress[$s.name]) | Out-Null
            $v.InCellDropdown = $true
        }
        [void]$wb.Names.Add("Set_$($s.name)", ('=Mulai!$C${0}' -f $row))
        $row++
    }

    $btnRow = $row + 1
    $statusRow = $btnRow + 3
    $mulai.Cells.Item($statusRow, 2).Value2 = 'Status'
    $mulai.Cells.Item($statusRow, 2).Font.Bold = $true
    $mulai.Cells.Item($statusRow, 3).Value2 = 'Siap dijalankan.'
    $mulai.Cells.Item($statusRow, 3).WrapText = $true
    $mulai.Cells.Item($statusRow, 3).VerticalAlignment = -4160
    [void]$wb.Names.Add('Status_Proses', ('=Mulai!$C${0}' -f $statusRow))

    # ---------------- Hasil ----------------
    $hasil.Range('A1').Value2 = 'Hasil proses'
    $hasil.Range('A1').Font.Bold = $true
    $hasil.Range('A1').Font.Size = 14
    $ph = if ($specObj.resultPlaceholder) { $specObj.resultPlaceholder } else { 'Belum ada hasil. Klik Jalankan di sheet Mulai.' }
    $hasil.Range('A2').Value2 = $ph
    $hasil.Range('A2').Font.Color = $GRAY
    $hasil.Columns('A').ColumnWidth = 60

    # ---------------- Petunjuk ----------------
    $sections = @()
    if ($specObj.petunjuk) { $sections += @($specObj.petunjuk) }
    $sections += [pscustomobject]@{
        heading = 'Muncul bar merah "macro diblokir"? Itu normal.'
        lines   = @('1. Tutup file ini.', '2. Klik kanan file, pilih Properties.', '3. Centang Unblock di bagian bawah, lalu klik OK.', '4. Buka lagi file ini, lalu klik Enable Content.')
    }
    $pet.Columns('A').ColumnWidth = 3
    $pet.Columns('B').ColumnWidth = 110
    $r = 2
    foreach ($sec in $sections) {
        $pet.Cells.Item($r, 2).Value2 = $sec.heading
        $pet.Cells.Item($r, 2).Font.Bold = $true
        $pet.Cells.Item($r, 2).Font.Color = $NAVY
        $pet.Cells.Item($r, 2).Font.Size = 12
        $r++
        foreach ($l in @($sec.lines)) {
            $pet.Cells.Item($r, 2).Value2 = $l
            $pet.Cells.Item($r, 2).WrapText = $true
            $r++
        }
        $r++
    }

    # ---------------- Macro + tombol ----------------
    $mod = $wb.VBProject.VBComponents.Add(1)
    $mod.Name = $modName
    $mod.CodeModule.AddFromString($code)

    $mulai.Activate()
    $rng = $mulai.Range($mulai.Cells.Item($btnRow, 2), $mulai.Cells.Item($btnRow + 1, 3))
    $btn = $mulai.Shapes.AddShape(5, $rng.Left, $rng.Top, $rng.Width, $rng.Height)
    $btn.Name = 'TombolJalankan'
    $btn.Fill.ForeColor.RGB = $GREEN
    $btn.Line.Visible = 0
    $btn.TextFrame2.TextRange.Text = $buttonText
    $btn.TextFrame2.TextRange.Font.Size = 16
    $btn.TextFrame2.TextRange.Font.Bold = -1
    $btn.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = (RGBc 255 255 255)
    $btn.OnAction = $macroName
    try { $xl.ActiveWindow.DisplayGridlines = $false } catch {}
    $mulai.Cells.Item(4, 3).Select() | Out-Null

    if (Test-Path $outPath) { Remove-Item $outPath -Force }
    $wb.SaveAs($outPath, 52)
    $wb.Close($false)
    Write-Host "OK: $outPath"
}
finally {
    if ($xl) { $xl.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($xl) }
    if ($null -eq $prev) { Remove-ItemProperty -Path $regPath -Name AccessVBOM -ErrorAction SilentlyContinue }
    else { Set-ItemProperty -Path $regPath -Name AccessVBOM -Value $prev -Type DWord }
    $now = (Get-ItemProperty -Path $regPath -Name AccessVBOM -ErrorAction SilentlyContinue).AccessVBOM
    Write-Host "AccessVBOM dikembalikan: sebelumnya=[$prev] sekarang=[$now]"
}
