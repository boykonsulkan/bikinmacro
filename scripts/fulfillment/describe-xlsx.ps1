# Meringkas struktur file contoh pembeli jadi teks yang bisa ditempel ke prompt:
# nama sheet, ukuran, baris header, dan beberapa baris awal tiap sheet.
# Sengaja HANYA baris awal, supaya isi data pembeli nggak ikut terkirim semua.
#
# Pakai:  powershell -ExecutionPolicy Bypass -File scripts/fulfillment/describe-xlsx.ps1 -Path C:\...\contoh.xlsx [-Rows 5]
#         (tambah  | Set-Clipboard  untuk langsung menyalin hasilnya)

param(
    [Parameter(Mandatory = $true)][string]$Path,
    [int]$Rows = 5
)
$ErrorActionPreference = 'Stop'

$xl = $null
try {
    $xl = New-Object -ComObject Excel.Application
    $xl.Visible = $false
    $xl.DisplayAlerts = $false
    $wb = $xl.Workbooks.Open((Resolve-Path $Path), 0, $true)
    "File: $([IO.Path]::GetFileName($Path))"
    "Jumlah sheet: $($wb.Worksheets.Count)"
    foreach ($ws in $wb.Worksheets) {
        $used = $ws.UsedRange
        $nRows = $used.Rows.Count
        $nCols = $used.Columns.Count
        ''
        "## Sheet: $($ws.Name)  ($nRows baris x $nCols kolom, mulai dari $($used.Cells.Item(1, 1).Address($false, $false)))"
        $take = [math]::Min($Rows + 1, $nRows)
        for ($r = 1; $r -le $take; $r++) {
            $cells = @()
            for ($c = 1; $c -le [math]::Min($nCols, 30); $c++) {
                $cell = $used.Cells.Item($r, $c)
                $text = [string]$cell.Text
                if ($cell.HasFormula) { $text = "$text  [rumus: $($cell.Formula)]" }
                $cells += $text
            }
            $label = if ($r -eq 1) { 'header ' } else { "baris $r" }
            "$label | " + ($cells -join ' | ')
        }
        if ($nRows -gt $take) { "... ($($nRows - $take) baris lagi nggak ditampilkan)" }
        $formats = @()
        for ($c = 1; $c -le [math]::Min($nCols, 30); $c++) { $formats += [string]$used.Cells.Item([math]::Min(2, $nRows), $c).NumberFormat }
        "format kolom (baris data pertama) | " + ($formats -join ' | ')
    }
    $wb.Close($false)
}
finally {
    if ($xl) { $xl.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($xl) }
}
