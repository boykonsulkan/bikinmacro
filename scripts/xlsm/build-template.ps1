# Membuat template .xlsm kosong (1 sheet "Data" + 1 modul "BikinMacro") dengan Excel asli, lalu menanamnya
# sebagai base64 di src/lib/xlsm/template.ts. Dijalankan SEKALI (atau saat template perlu diganti).
# Butuh Windows + Excel desktop. Server produksi (Vercel) TIDAK butuh Excel: ia cuma mengganti isi modul.
$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$tmp  = Join-Path $env:TEMP 'bm-template.xlsm'
if (Test-Path $tmp) { Remove-Item $tmp -Force }

$key = 'HKCU:\Software\Microsoft\Office\16.0\Excel\Security'
$had = $null -ne (Get-ItemProperty $key -Name AccessVBOM -ErrorAction SilentlyContinue)
$old = if ($had) { (Get-ItemProperty $key -Name AccessVBOM).AccessVBOM } else { $null }
Set-ItemProperty $key -Name AccessVBOM -Value 1 -Type DWord
$xl = New-Object -ComObject Excel.Application
try {
  $xl.Visible = $false; $xl.DisplayAlerts = $false
  $wb = $xl.Workbooks.Add()
  while ($wb.Worksheets.Count -gt 1) { $wb.Worksheets.Item($wb.Worksheets.Count).Delete() }
  $wb.Worksheets.Item(1).Name = 'Data'
  $mod = $wb.VBProject.VBComponents.Add(1)
  $mod.Name = 'BikinMacro'
  $mod.CodeModule.AddFromString("Sub Placeholder()`r`nEnd Sub")
  $wb.SaveAs($tmp, 52)
  $wb.Close($false)
} finally {
  $xl.Quit()
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($xl)
  if ($had) { Set-ItemProperty $key -Name AccessVBOM -Value $old -Type DWord } else { Remove-ItemProperty $key -Name AccessVBOM -ErrorAction SilentlyContinue }
}

$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($tmp))
$lines = for ($i = 0; $i -lt $b64.Length; $i += 100) { "  '" + $b64.Substring($i, [Math]::Min(100, $b64.Length - $i)) + "'" }
$out = @"
// Dibuat oleh scripts/xlsm/build-template.ps1 (jangan diedit tangan).
// Workbook .xlsm kosong: sheet "Data" dan modul VBA "BikinMacro". Isi modul diganti saat ekspor.
export const TEMPLATE_MODULE = 'BikinMacro'
export const TEMPLATE_B64 = [
$($lines -join ",`n")
].join('')
"@
[IO.File]::WriteAllText((Join-Path $root 'src\lib\xlsm\template.ts'), ($out -replace "`r`n", "`n"), (New-Object Text.UTF8Encoding $false))
Write-Host "Template ditulis: $((Get-Item $tmp).Length) byte"
