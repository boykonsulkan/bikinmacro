# Data contoh FIKTIF dan DETERMINISTIK untuk demo "Proses Rekap Penjualan".
# Nggak ada angka acak: setiap kali dijalankan hasilnya identik.
# Dipakai oleh build-demo.ps1 (bikin file) dan test-demo.ps1 (hitung hasil yang diharapkan).

function Get-DemoSales {
    @(
        @{ Nama = 'Andi';  Region = 'Jakarta';  Baris = 14 },
        @{ Nama = 'Budi';  Region = 'Jakarta';  Baris = 8 },
        @{ Nama = 'Citra'; Region = 'Surabaya'; Baris = 12 },
        @{ Nama = 'Dewi';  Region = 'Medan';    Baris = 2 },
        @{ Nama = 'Eko';   Region = 'Surabaya'; Baris = 8 }
    )
}

# Aturan komisi: persen berlaku untuk SELURUH total penjualan Sales itu
# (bukan marginal). Dari (Rp), Sampai (Rp), persen.
function Get-DemoTiers {
    @(
        @{ Dari = 0;         Sampai = 49999999;  Persen = 0.01 },
        @{ Dari = 50000000;  Sampai = 99999999;  Persen = 0.02 },
        @{ Dari = 100000000; Sampai = $null;     Persen = 0.03 }
    )
}

function Get-DemoRows {
    $produk = @(
        @{ Nama = 'Produk A'; Harga = 250000 },
        @{ Nama = 'Produk B'; Harga = 400000 },
        @{ Nama = 'Produk C'; Harga = 650000 }
    )
    $dasar = @()
    foreach ($s in Get-DemoSales) {
        for ($k = 0; $k -lt $s.Baris; $k++) { $dasar += , $s }
    }
    $n = $dasar.Count
    $hasil = @()
    for ($i = 0; $i -lt $n; $i++) {
        $s = $dasar[($i * 7) % $n]
        $p = $produk[[int](($i * 2) + [math]::Floor($i / 4)) % 3]
        $qty = 10 + (($i * 17) % 30)
        $hari = 1 + [int][math]::Floor($i * 28 / $n)
        $hasil += [pscustomobject]@{
            No      = $i + 1
            Tanggal = ([datetime]::new(2025, 10, $hari)).ToOADate()
            Sales   = $s.Nama
            Region  = $s.Region
            Produk  = $p.Nama
            Qty     = $qty
            Harga   = $p.Harga
            Nilai   = $qty * $p.Harga
        }
    }
    $hasil
}

# Total, persen, dan komisi per Sales (urutan kemunculan pertama).
function Get-DemoExpectedKomisi {
    $rows = Get-DemoRows
    $tiers = Get-DemoTiers
    $urut = @()
    foreach ($r in $rows) { if ($urut -notcontains $r.Sales) { $urut += $r.Sales } }
    foreach ($nama in $urut) {
        $mine = @($rows | Where-Object { $_.Sales -eq $nama })
        $total = ($mine | Measure-Object -Property Nilai -Sum).Sum
        $persen = 0
        $terbaik = -1
        foreach ($t in $tiers) {
            if ($total -ge $t.Dari -and $t.Dari -gt $terbaik) { $terbaik = $t.Dari; $persen = $t.Persen }
        }
        [pscustomobject]@{
            Sales  = $nama
            Region = $mine[0].Region
            Jumlah = $mine.Count
            Total  = $total
            Persen = $persen
            Komisi = [math]::Floor($total * $persen + 0.5)
        }
    }
}
