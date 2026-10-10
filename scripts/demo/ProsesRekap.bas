Attribute VB_Name = "ProsesRekap"
Option Explicit

' Demo BikinMacro: Proses Rekap Penjualan.
'
' Alur: klik tombol Jalankan di sheet Mulai, Excel menampilkan pop up pilih
' file, lalu file yang dipilih diproses sesuai "Mode proses" di sheet Mulai.
' Pilihan mode dan kolom ada di sheet Opsi. Hasil ditulis ke sheet Hasil.
'
' Jalankan  = bagian yang berhubungan dengan pop up (dipanggil tombol).
' ProsesFile = logika murni, menerima daftar file. Dipisah supaya bisa dites.

Private Const SHEET_START As String = "Mulai"
Private Const SHEET_OUT As String = "Hasil"
Private Const SHEET_OPT As String = "Opsi"
Private Const SHEET_DATA As String = "Penjualan"
Private Const SHEET_RULE As String = "Aturan Komisi"

Private mTerbuka As Collection

' ---------------------------------------------------------------------------
' Titik masuk dari tombol
' ---------------------------------------------------------------------------
Public Sub Jalankan()
    Dim pilihan As Variant

    pilihan = Application.GetOpenFilename( _
        FileFilter:="File Excel (*.xlsx;*.xlsm;*.xls),*.xlsx;*.xlsm;*.xls", _
        Title:="Pilih file Excel yang mau diproses", _
        MultiSelect:=True)

    If VarType(pilihan) = vbBoolean Then
        TulisStatus "Dibatalkan. Belum ada file yang dipilih."
        Exit Sub
    End If

    ProsesFile pilihan, False
End Sub

' ---------------------------------------------------------------------------
' Logika utama. `sumber` boleh satu path atau array path.
' ---------------------------------------------------------------------------
Public Sub ProsesFile(ByVal sumber As Variant, Optional ByVal senyap As Boolean = False)
    Dim daftar() As String
    Dim idxMode As Variant
    Dim kolom As String
    Dim pesan As String
    Dim layarLama As Boolean
    Dim notifLama As Boolean

    layarLama = Application.ScreenUpdating
    notifLama = Application.DisplayAlerts
    On Error GoTo Gagal

    daftar = KeDaftar(sumber)
    kolom = Trim$(CStr(ThisWorkbook.Worksheets(SHEET_START).Range("C5").Value))
    idxMode = Application.Match( _
        Trim$(CStr(ThisWorkbook.Worksheets(SHEET_START).Range("C4").Value)), _
        ThisWorkbook.Worksheets(SHEET_OPT).Range("A2:A4"), 0)
    If IsError(idxMode) Then
        Err.Raise vbObjectError + 1, , "Mode proses belum dipilih. Pilih dulu di sheet Mulai."
    End If

    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    TulisStatus "Memproses " & UBound(daftar) & " file..."

    Select Case CLng(idxMode)
        Case 1: pesan = HitungKomisi(daftar)
        Case 2: pesan = PecahPerNilai(daftar, kolom)
        Case 3: pesan = GabungFile(daftar)
    End Select

    TutupSemua
    Application.DisplayAlerts = notifLama
    Application.ScreenUpdating = layarLama
    TulisStatus pesan
    ThisWorkbook.Worksheets(SHEET_OUT).Activate
    If Not senyap Then MsgBox pesan, vbInformation, "BikinMacro"
    Exit Sub

Gagal:
    pesan = "Gagal: " & Err.Description
    TutupSemua
    Application.DisplayAlerts = notifLama
    Application.ScreenUpdating = layarLama
    TulisStatus pesan
    If Not senyap Then MsgBox pesan, vbExclamation, "BikinMacro"
End Sub

' ---------------------------------------------------------------------------
' Mode 1: hitung komisi per Sales memakai sheet "Aturan Komisi"
' ---------------------------------------------------------------------------
Private Function HitungKomisi(ByRef daftar() As String) As String
    Dim wb As Workbook
    Dim tabel As Variant
    Dim aturan As Variant
    Dim cSales As Long, cRegion As Long, cNilai As Long
    Dim kunci As New Collection
    Dim nama() As String, wilayah() As String
    Dim total() As Double
    Dim jumlah() As Long
    Dim n As Long, i As Long, f As Long, idx As Long
    Dim s As String
    Dim ws As Worksheet
    Dim hasil() As Variant
    Dim persen As Double, komisi As Double
    Dim sumTotal As Double, sumKomisi As Double, sumJumlah As Long

    ReDim nama(1 To 50)
    ReDim wilayah(1 To 50)
    ReDim total(1 To 50)
    ReDim jumlah(1 To 50)

    For f = 1 To UBound(daftar)
        Set wb = BukaFile(daftar(f))
        tabel = BacaTabel(AmbilSheet(wb, SHEET_DATA))
        If f = 1 Then aturan = BacaTabel(AmbilSheet(wb, SHEET_RULE))
        cSales = CariKolom(tabel, "Sales")
        cRegion = CariKolom(tabel, "Region", False)
        cNilai = CariKolom(tabel, "Nilai")

        For i = 2 To UBound(tabel, 1)
            s = Trim$(CStr(tabel(i, cSales)))
            If Len(s) > 0 Then
                idx = CariIndeks(kunci, s)
                If idx = 0 Then
                    n = n + 1
                    If n > UBound(nama) Then
                        ReDim Preserve nama(1 To n * 2)
                        ReDim Preserve wilayah(1 To n * 2)
                        ReDim Preserve total(1 To n * 2)
                        ReDim Preserve jumlah(1 To n * 2)
                    End If
                    kunci.Add n, s
                    idx = n
                    nama(idx) = s
                    If cRegion > 0 Then wilayah(idx) = Trim$(CStr(tabel(i, cRegion)))
                End If
                total(idx) = total(idx) + KeAngka(tabel(i, cNilai))
                jumlah(idx) = jumlah(idx) + 1
            End If
        Next i
    Next f

    If n = 0 Then Err.Raise vbObjectError + 6, , "Nggak ada data Sales yang bisa dihitung."

    ReDim hasil(1 To n + 1, 1 To 6)
    For i = 1 To n
        persen = KomisiPersen(total(i), aturan)
        komisi = Int(total(i) * persen + 0.5)
        hasil(i, 1) = nama(i)
        hasil(i, 2) = wilayah(i)
        hasil(i, 3) = jumlah(i)
        hasil(i, 4) = total(i)
        hasil(i, 5) = persen
        hasil(i, 6) = komisi
        sumTotal = sumTotal + total(i)
        sumKomisi = sumKomisi + komisi
        sumJumlah = sumJumlah + jumlah(i)
    Next i
    hasil(n + 1, 1) = "Total"
    hasil(n + 1, 2) = ""
    hasil(n + 1, 3) = sumJumlah
    hasil(n + 1, 4) = sumTotal
    hasil(n + 1, 5) = ""
    hasil(n + 1, 6) = sumKomisi

    Set ws = SiapkanHasil("Komisi per Sales", daftar)
    ws.Range("A4:F4").Value = Array("Sales", "Region", "Jumlah Transaksi", "Total Penjualan", "Komisi (%)", "Komisi (Rp)")
    ws.Range("A5").Resize(n + 1, 6).Value = hasil
    GayaHeader ws.Range("A4:F4")
    ws.Range("C5").Resize(n + 1, 1).NumberFormat = "#,##0"
    ws.Range("D5").Resize(n + 1, 1).NumberFormat = "#,##0"
    ws.Range("E5").Resize(n, 1).NumberFormat = "0.0%"
    ws.Range("F5").Resize(n + 1, 1).NumberFormat = "#,##0"
    ws.Range("A" & (n + 5) & ":F" & (n + 5)).Font.Bold = True
    ws.Columns("A:F").AutoFit

    HitungKomisi = "Selesai. Komisi " & n & " Sales dihitung dari " & UBound(daftar) & " file. Cek sheet Hasil."
End Function

' Ambil persen komisi dari tabel aturan: baris dengan "Dari (Rp)" terbesar
' yang masih <= total.
Private Function KomisiPersen(ByVal total As Double, ByVal aturan As Variant) As Double
    Dim cDari As Long, cPersen As Long
    Dim r As Long
    Dim terbaik As Double, dari As Double, p As Double

    cDari = CariKolom(aturan, "Dari (Rp)")
    cPersen = CariKolom(aturan, "Komisi (%)")
    terbaik = -1
    For r = 2 To UBound(aturan, 1)
        dari = KeAngka(aturan(r, cDari))
        If total >= dari And dari > terbaik Then
            terbaik = dari
            p = KeAngka(aturan(r, cPersen))
            If p > 1 Then p = p / 100
            KomisiPersen = p
        End If
    Next r
End Function

' ---------------------------------------------------------------------------
' Mode 2: pecah jadi file baru per nilai unik di kolom pilihan
' ---------------------------------------------------------------------------
Private Function PecahPerNilai(ByRef daftar() As String, ByVal kolom As String) As String
    Dim wb As Workbook
    Dim ws As Worksheet
    Dim baru As Workbook
    Dim tabel As Variant
    Dim unik As Collection
    Dim arr() As Variant
    Dim c As Long, f As Long, i As Long, j As Long, k As Long, r As Long
    Dim nCol As Long, jml As Long, totalFile As Long
    Dim nilai As Variant
    Dim namaFile As String
    Dim catatan As New Collection
    Dim item As Variant
    Dim hasil As Worksheet

    If Len(kolom) = 0 Then
        Err.Raise vbObjectError + 7, , "Kolom pemecah belum dipilih. Pilih dulu di sheet Mulai."
    End If

    For f = 1 To UBound(daftar)
        Set wb = BukaFile(daftar(f))
        Set ws = AmbilSheet(wb, SHEET_DATA)
        tabel = BacaTabel(ws)
        c = CariKolom(tabel, kolom)
        nCol = UBound(tabel, 2)
        Set unik = NilaiUnik(tabel, c)

        For Each nilai In unik
            jml = 0
            For i = 2 To UBound(tabel, 1)
                If StrComp(Trim$(CStr(tabel(i, c))), CStr(nilai), vbTextCompare) = 0 Then jml = jml + 1
            Next i

            ReDim arr(1 To jml + 1, 1 To nCol)
            For j = 1 To nCol
                arr(1, j) = tabel(1, j)
            Next j
            r = 1
            For i = 2 To UBound(tabel, 1)
                If StrComp(Trim$(CStr(tabel(i, c))), CStr(nilai), vbTextCompare) = 0 Then
                    r = r + 1
                    For j = 1 To nCol
                        arr(r, j) = tabel(i, j)
                    Next j
                End If
            Next i

            Set baru = Workbooks.Add(-4167)
            mTerbuka.Add baru
            With baru.Worksheets(1)
                .Name = SHEET_DATA
                .Range("A1").Resize(jml + 1, nCol).Value = arr
                For k = 1 To nCol
                    .Columns(k).NumberFormat = ws.Cells(2, k).NumberFormat
                Next k
                GayaHeader .Range("A1").Resize(1, nCol)
                .Columns.AutoFit
            End With

            namaFile = NamaDasar(wb.Name) & "_" & kolom & "_" & Bersihkan(CStr(nilai)) & ".xlsx"
            baru.SaveAs Filename:=wb.Path & Application.PathSeparator & namaFile, FileFormat:=51
            baru.Close SaveChanges:=False

            catatan.Add Array(wb.Name, kolom, CStr(nilai), namaFile, jml)
            totalFile = totalFile + 1
        Next nilai
    Next f

    Set hasil = SiapkanHasil("File baru per " & kolom, daftar)
    hasil.Range("A4:E4").Value = Array("File sumber", "Kolom", "Nilai", "File baru", "Jumlah baris")
    GayaHeader hasil.Range("A4:E4")
    r = 4
    For Each item In catatan
        r = r + 1
        hasil.Range("A" & r & ":E" & r).Value = item
    Next item
    hasil.Range("E5").Resize(catatan.Count, 1).NumberFormat = "#,##0"
    hasil.Columns("A:E").AutoFit

    PecahPerNilai = "Selesai. " & totalFile & " file baru dibuat di folder yang sama dengan file sumber. Daftarnya ada di sheet Hasil."
End Function

' ---------------------------------------------------------------------------
' Mode 3: gabung beberapa file jadi satu sheet
' ---------------------------------------------------------------------------
Private Function GabungFile(ByRef daftar() As String) As String
    Dim wb As Workbook
    Dim tabel As Variant
    Dim semua As New Collection
    Dim nCol As Long, f As Long, i As Long, j As Long, r As Long
    Dim totalBaris As Long
    Dim header() As Variant
    Dim fmt() As String
    Dim arr() As Variant
    Dim ws As Worksheet
    Dim t As Variant
    Dim idx As Long

    For f = 1 To UBound(daftar)
        Set wb = BukaFile(daftar(f))
        tabel = BacaTabel(AmbilSheet(wb, SHEET_DATA))
        If f = 1 Then
            nCol = UBound(tabel, 2)
            ReDim header(1 To nCol + 1)
            ReDim fmt(1 To nCol)
            For j = 1 To nCol
                header(j) = tabel(1, j)
                fmt(j) = AmbilSheet(wb, SHEET_DATA).Cells(2, j).NumberFormat
            Next j
            header(nCol + 1) = "Sumber File"
        Else
            If UBound(tabel, 2) <> nCol Then
                Err.Raise vbObjectError + 8, , "Header file " & wb.Name & " beda dari file pertama (jumlah kolom nggak sama)."
            End If
            For j = 1 To nCol
                If StrComp(Trim$(CStr(tabel(1, j))), Trim$(CStr(header(j))), vbTextCompare) <> 0 Then
                    Err.Raise vbObjectError + 8, , "Header file " & wb.Name & " beda dari file pertama (kolom " & j & ")."
                End If
            Next j
        End If
        semua.Add Array(wb.Name, tabel)
        totalBaris = totalBaris + UBound(tabel, 1) - 1
    Next f

    ReDim arr(1 To totalBaris, 1 To nCol + 1)
    r = 0
    For Each t In semua
        tabel = t(1)
        For i = 2 To UBound(tabel, 1)
            r = r + 1
            For j = 1 To nCol
                arr(r, j) = tabel(i, j)
            Next j
            arr(r, nCol + 1) = t(0)
        Next i
    Next t

    Set ws = SiapkanHasil("Gabungan data penjualan", daftar)
    ws.Range("A4").Resize(1, nCol + 1).Value = header
    ws.Range("A5").Resize(totalBaris, nCol + 1).Value = arr
    For j = 1 To nCol
        ws.Range("A5").Offset(0, j - 1).Resize(totalBaris, 1).NumberFormat = fmt(j)
    Next j
    GayaHeader ws.Range("A4").Resize(1, nCol + 1)
    ws.Columns.AutoFit

    GabungFile = "Selesai. " & UBound(daftar) & " file digabung, " & totalBaris & " baris masuk ke sheet Hasil."
End Function

' ---------------------------------------------------------------------------
' Helper
' ---------------------------------------------------------------------------
Private Sub TulisStatus(ByVal teks As String)
    ThisWorkbook.Worksheets(SHEET_START).Range("C11").Value = teks
End Sub

Private Function KeDaftar(ByVal sumber As Variant) As String()
    Dim hasil() As String
    Dim i As Long, n As Long

    If IsArray(sumber) Then
        n = UBound(sumber) - LBound(sumber) + 1
        ReDim hasil(1 To n)
        For i = 1 To n
            hasil(i) = CStr(sumber(LBound(sumber) + i - 1))
        Next i
    Else
        ReDim hasil(1 To 1)
        hasil(1) = CStr(sumber)
    End If
    KeDaftar = hasil
End Function

Private Function BukaFile(ByVal lokasi As String) As Workbook
    Dim wb As Workbook

    If Len(Dir(lokasi)) = 0 Then
        Err.Raise vbObjectError + 2, , "File nggak ketemu: " & lokasi
    End If
    Set wb = Workbooks.Open(Filename:=lokasi, UpdateLinks:=0, ReadOnly:=True)
    If mTerbuka Is Nothing Then Set mTerbuka = New Collection
    mTerbuka.Add wb
    Set BukaFile = wb
End Function

Private Sub TutupSemua()
    Dim wb As Variant

    If mTerbuka Is Nothing Then Exit Sub
    On Error Resume Next
    For Each wb In mTerbuka
        wb.Close SaveChanges:=False
    Next wb
    Set mTerbuka = Nothing
End Sub

Private Function AmbilSheet(ByVal wb As Workbook, ByVal nama As String) As Worksheet
    Dim ws As Worksheet

    For Each ws In wb.Worksheets
        If StrComp(ws.Name, nama, vbTextCompare) = 0 Then
            Set AmbilSheet = ws
            Exit Function
        End If
    Next ws
    Err.Raise vbObjectError + 3, , "Sheet '" & nama & "' nggak ketemu di file " & wb.Name & "."
End Function

Private Function BacaTabel(ByVal ws As Worksheet) As Variant
    Dim v As Variant

    v = ws.Range("A1").CurrentRegion.Value
    If Not IsArray(v) Then
        Err.Raise vbObjectError + 4, , "Sheet '" & ws.Name & "' kosong."
    End If
    If UBound(v, 1) < 2 Then
        Err.Raise vbObjectError + 4, , "Sheet '" & ws.Name & "' belum ada datanya."
    End If
    BacaTabel = v
End Function

Private Function CariKolom(ByVal tabel As Variant, ByVal nama As String, Optional ByVal wajib As Boolean = True) As Long
    Dim c As Long

    For c = 1 To UBound(tabel, 2)
        If StrComp(Trim$(CStr(tabel(1, c))), nama, vbTextCompare) = 0 Then
            CariKolom = c
            Exit Function
        End If
    Next c
    If wajib Then
        Err.Raise vbObjectError + 5, , "Kolom '" & nama & "' nggak ketemu di baris header."
    End If
End Function

Private Function KeAngka(ByVal v As Variant) As Double
    If IsError(v) Then Exit Function
    If IsNumeric(v) Then KeAngka = CDbl(v)
End Function

' Cari nomor urut `kunci` di Collection. 0 kalau belum ada.
Private Function CariIndeks(ByVal koleksi As Collection, ByVal kunci As String) As Long
    On Error Resume Next
    CariIndeks = 0
    CariIndeks = koleksi(kunci)
End Function

' Nilai unik di kolom c, urut kemunculan pertama.
Private Function NilaiUnik(ByVal tabel As Variant, ByVal c As Long) As Collection
    Dim hasil As New Collection
    Dim i As Long
    Dim s As String

    For i = 2 To UBound(tabel, 1)
        s = Trim$(CStr(tabel(i, c)))
        If Len(s) > 0 Then
            On Error Resume Next
            hasil.Add s, s
            On Error GoTo 0
        End If
    Next i
    Set NilaiUnik = hasil
End Function

Private Function SiapkanHasil(ByVal judul As String, ByRef daftar() As String) As Worksheet
    Dim ws As Worksheet
    Dim i As Long
    Dim sumber As String

    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(SHEET_OUT)
    On Error GoTo 0
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(SHEET_START))
        ws.Name = SHEET_OUT
    End If
    ws.Cells.Clear

    For i = 1 To UBound(daftar)
        If i > 1 Then sumber = sumber & ", "
        sumber = sumber & Mid$(daftar(i), InStrRev(daftar(i), "\") + 1)
    Next i
    ws.Range("A1").Value = judul
    ws.Range("A1").Font.Bold = True
    ws.Range("A1").Font.Size = 14
    ws.Range("A2").Value = "Sumber: " & sumber
    ws.Range("A2").Font.Color = RGB(75, 85, 99)
    Set SiapkanHasil = ws
End Function

Private Sub GayaHeader(ByVal rng As Range)
    With rng
        .Font.Bold = True
        .Font.Color = RGB(255, 255, 255)
        .Interior.Color = RGB(5, 28, 44)
    End With
End Sub

' Nama file tanpa folder dan tanpa ekstensi.
Private Function NamaDasar(ByVal lokasi As String) As String
    Dim p As Long
    Dim s As String

    s = lokasi
    p = InStrRev(s, "\")
    If p > 0 Then s = Mid$(s, p + 1)
    p = InStrRev(s, "/")
    If p > 0 Then s = Mid$(s, p + 1)
    p = InStrRev(s, ".")
    If p > 1 Then s = Left$(s, p - 1)
    NamaDasar = s
End Function

Private Function Bersihkan(ByVal s As String) As String
    Dim ch As Variant

    For Each ch In Array("\", "/", ":", "*", "?", """", "<", ">", "|")
        s = Replace(s, ch, "_")
    Next ch
    Bersihkan = s
End Function
