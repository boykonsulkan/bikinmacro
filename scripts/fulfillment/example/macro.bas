Attribute VB_Name = "ContohMacro"
Option Explicit

' Contoh macro paling sederhana yang mengikuti konvensi BikinMacro.
' Daftar sheet dari file yang dipilih ditulis ke sheet Hasil.
'
' Jalankan = bagian pop up (dipanggil tombol).
' Proses   = logika murni, bisa dites tanpa pop up.

Public Sub Jalankan()
    Dim pilihan As Variant

    pilihan = Application.GetOpenFilename( _
        FileFilter:="File Excel (*.xlsx;*.xlsm;*.xls),*.xlsx;*.xlsm;*.xls", _
        Title:="Pilih file Excel yang mau diproses")

    If VarType(pilihan) = vbBoolean Then
        TulisStatus "Dibatalkan. Belum ada file yang dipilih."
        Exit Sub
    End If

    Proses CStr(pilihan), False
End Sub

Public Sub Proses(ByVal lokasi As String, Optional ByVal senyap As Boolean = False)
    Dim wb As Workbook
    Dim ws As Worksheet
    Dim hasil As Worksheet
    Dim awalan As String
    Dim mode As String
    Dim r As Long
    Dim pesan As String
    Dim layarLama As Boolean

    layarLama = Application.ScreenUpdating
    On Error GoTo Gagal

    awalan = CStr(ThisWorkbook.Worksheets("Mulai").Range("Set_Awalan").Value)
    mode = CStr(ThisWorkbook.Worksheets("Mulai").Range("Set_Info").Value)
    If Len(Dir(lokasi)) = 0 Then Err.Raise vbObjectError + 1, , "File nggak ketemu: " & lokasi

    Application.ScreenUpdating = False
    Set wb = Workbooks.Open(Filename:=lokasi, UpdateLinks:=0, ReadOnly:=True)
    Set hasil = ThisWorkbook.Worksheets("Hasil")
    hasil.Cells.Clear
    hasil.Range("A1").Value = "Daftar sheet"
    hasil.Range("A1").Font.Bold = True
    hasil.Range("A3:B3").Value = Array("Sheet", "Jumlah baris")
    hasil.Range("A3:B3").Font.Bold = True
    r = 3
    For Each ws In wb.Worksheets
        r = r + 1
        hasil.Cells(r, 1).Value = awalan & " " & ws.Name
        If mode = "Nama sheet dan jumlah baris" Then hasil.Cells(r, 2).Value = ws.UsedRange.Rows.Count
    Next ws
    wb.Close SaveChanges:=False
    Set wb = Nothing
    hasil.Columns("A:B").AutoFit

    Application.ScreenUpdating = layarLama
    pesan = "Selesai. " & (r - 3) & " sheet dicatat di sheet Hasil."
    TulisStatus pesan
    If Not senyap Then MsgBox pesan, vbInformation, "BikinMacro"
    Exit Sub

Gagal:
    pesan = "Gagal: " & Err.Description
    On Error Resume Next
    If Not wb Is Nothing Then wb.Close SaveChanges:=False
    Application.ScreenUpdating = layarLama
    TulisStatus pesan
    If Not senyap Then MsgBox pesan, vbExclamation, "BikinMacro"
End Sub

Private Sub TulisStatus(ByVal teks As String)
    ThisWorkbook.Worksheets("Mulai").Range("Status_Proses").Value = teks
End Sub
