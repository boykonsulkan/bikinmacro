# Memverifikasi file .xlsm hasil pembuat server di Excel asli: dibuka, lalu satu makro dijalankan.
# Pemakaian: verify-xlsm.ps1 -File x.xlsm -Macro Tulis -Cell A1 -Expect makro-jalan
param(
  [Parameter(Mandatory)] [string] $File,
  [Parameter(Mandatory)] [string] $Macro,
  [string] $Cell = 'A1',
  [string] $Expect = ''
)
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false; $xl.DisplayAlerts = $false; $xl.AutomationSecurity = 1
$code = 0
try {
  $wb = $xl.Workbooks.Open((Resolve-Path $File).Path)
  $r = $xl.Run($Macro)
  if ($r) { "hasil makro: $r" }
  $v = $wb.Worksheets.Item(1).Range($Cell).Value2
  "sel ${Cell}: $v"
  if ($Expect -and "$v" -ne $Expect) { "GAGAL: diharapkan '$Expect'"; $code = 1 } else { 'OK' }
  $wb.Close($false)
} catch { "GAGAL: " + $_.Exception.Message; $code = 1 }
finally { try { $xl.Quit() } catch {} }
exit $code
