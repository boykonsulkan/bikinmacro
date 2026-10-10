# Membuat Midtrans Payment Link lewat API, dengan redirect otomatis ke /pesan
# setelah pembeli selesai bayar (callbacks.finish) dan data pembeli wajib diisi.
#
# Server key TIDAK ditulis di file ini. Skrip membacanya dari env MIDTRANS_SERVER_KEY
# atau meminta kamu mengetiknya (tersembunyi). Key nggak pernah dicetak.
#
# Contoh (paket 1 Output, produksi):
#   powershell -ExecutionPolicy Bypass -File scripts\midtrans\create-payment-link.ps1
# Paket 3 Output:
#   ... -Name "BikinMacro 3 Output" -Amount 59000 -Slug bikinmacro-3-output
# Cek isi permintaan tanpa memanggil Midtrans:
#   ... -DryRun
# Coba di sandbox (pakai sandbox key):
#   ... -Sandbox
#
# Catatan: base URL produksi (api.midtrans.com) belum terverifikasi di dokumentasi
# yang kubaca. Kalau dapat 401 atau 404, cocokkan jenis key dan URL-nya.

param(
    [string]$Name = 'BikinMacro 1 Output',   # judul di halaman bayar, maksimal 40 karakter
    [int]$Amount = 25000,
    [string]$Slug = 'bikinmacro-1-output',   # payment_link_id: a-z, 0-9, strip; harus unik
    [string]$OrderId = '',                   # kosong = dibuat otomatis
    [string]$FinishUrl = 'https://bikinmacro.my.id/pesan',
    [int]$UsageLimit = 100000,               # maksimal 1.000.000
    [switch]$Sandbox,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

if ($Name.Length -lt 1 -or $Name.Length -gt 40) { throw 'Name harus 1 sampai 40 karakter.' }
if ($Amount -lt 1) { throw 'Amount harus lebih dari 0.' }
if ($Slug -notmatch '^[a-z0-9][a-z0-9-]{0,48}$') { throw 'Slug hanya boleh a-z, 0-9, dan strip (maksimal 50 karakter).' }
if ($UsageLimit -lt 1 -or $UsageLimit -gt 1000000) { throw 'UsageLimit harus 1 sampai 1.000.000.' }
if ($FinishUrl -notmatch '^https://') { throw 'FinishUrl harus diawali https://' }
if ($OrderId -eq '') { $OrderId = 'BM-LINK-' + $Slug.ToUpper() + '-' + (Get-Date -Format 'yyyyMMddHHmm') }
if ($OrderId.Length -gt 50 -or $OrderId -notmatch '^[A-Za-z0-9._~-]+$') { throw 'OrderId maksimal 50 karakter dan hanya huruf, angka, titik, strip, underscore, tilde.' }

$body = [ordered]@{
    transaction_details = [ordered]@{ order_id = $OrderId; gross_amount = $Amount; payment_link_id = $Slug }
    customer_required   = $true
    usage_limit         = $UsageLimit
    title               = $Name
    item_details        = @([ordered]@{ id = $Slug; name = $Name; price = $Amount; quantity = 1 })
    callbacks           = [ordered]@{ finish = $FinishUrl }
}
$json = $body | ConvertTo-Json -Depth 6

$base = if ($Sandbox) { 'https://api.sandbox.midtrans.com' } else { 'https://api.midtrans.com' }
$uri = "$base/v1/payment-links"

if ($DryRun) {
    Write-Host "DRY RUN (nggak memanggil Midtrans)"
    Write-Host "POST $uri"
    Write-Host $json
    return
}

$key = $env:MIDTRANS_SERVER_KEY
if ([string]::IsNullOrWhiteSpace($key)) {
    $secure = Read-Host 'Midtrans Server Key' -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}
if ($key -match 'your_midtrans|^\s*$') { throw 'Server key masih placeholder atau kosong.' }
if ($Sandbox -and $key -notlike 'SB-*') { Write-Warning 'Mode sandbox, tapi key nggak berawalan SB-.' }
if (-not $Sandbox -and $key -like 'SB-*') { throw 'Ini key sandbox (SB-...). Tambahkan -Sandbox, atau pakai key produksi.' }

$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${key}:"))
try {
    $res = Invoke-RestMethod -Method Post -Uri $uri -ContentType 'application/json' `
        -Headers @{ Authorization = "Basic $auth"; Accept = 'application/json' } -Body $json
}
catch {
    $detail = ''
    if ($_.Exception.Response) {
        try { $detail = (New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd() } catch {}
    }
    throw "Midtrans menolak permintaan: $($_.Exception.Message) $detail"
}
finally { $key = $null; $auth = $null }

Write-Host ''
Write-Host 'Link berhasil dibuat.'
Write-Host "payment_url     : $($res.payment_url)"
Write-Host "order_id        : $OrderId"
Write-Host "payment_link_id : $Slug"
Write-Host ''
Write-Host 'Kirim payment_url ke Claude untuk dipasang di src/lib/links.ts, lalu tes bayar sekali.'
