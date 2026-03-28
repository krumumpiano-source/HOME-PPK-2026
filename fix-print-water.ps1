# fix-print-water.ps1 — Fix record-water.html print issues:
# 1. Font: ใส่ TH SarabunPSK เป็นตัวเลือกแรก
# 2. Borders: ใช้ 0.5pt solid สม่ำเสมอ ไม่หนาผิดปกติ
# 3. Table: ปรับให้พอดีหน้า
# 4. Yearly table: เพิ่มคอลัมน์ อัตรา เฉลี่ยต่อหลัง

$path = "d:\AI CURSER\HOME PPK 2026\record-water.html"
$utf8BOM = New-Object System.Text.UTF8Encoding($true)
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$orig = $content

# ═══════════════════════════════════════════════════════════
# 1. FIX FONT — ทุก print function ใส่ TH SarabunPSK ก่อน
# ═══════════════════════════════════════════════════════════
$content = $content.Replace(
    'font-family:"TH Sarabun New","Sarabun",serif',
    'font-family:"TH SarabunPSK","TH Sarabun New","Sarabun",serif'
)

# ═══════════════════════════════════════════════════════════
# 2. FIX BORDERS — ใช้ 0.5pt solid แทน 1px solid (print-friendly)
# ═══════════════════════════════════════════════════════════
# Table borders
$content = $content.Replace('border:1px solid #000', 'border:0.5pt solid #000')
# Field value underlines
$content = $content.Replace('border-bottom:1px solid #000', 'border-bottom:0.5pt solid #000')
# HR rule
$content = $content.Replace('border-top:1px solid #000', 'border-top:0.5pt solid #000')
# Dotted signature lines
$content = $content.Replace('border-top:1px dotted #000', 'border-top:0.5pt dotted #000')

# ═══════════════════════════════════════════════════════════
# 3. FIX PRINTREPORT — ปรับ table column widths ให้พอดี landscape
# ═══════════════════════════════════════════════════════════
$content = $content.Replace(
    '<th style="width:2.3em">',
    '<th style="width:2em">'
)

# ═══════════════════════════════════════════════════════════
# 4. FIX PRINTMEMO — yearly table เพิ่มคอลัมน์ อัตรา + เฉลี่ยต่อหลัง
# ═══════════════════════════════════════════════════════════

# 4a. Fix yearlyRows code — เพิ่ม rate + average columns
$oldYearlyCode = "for(var m=1;m<=monthIdx;m++){var d=md[m]||{u:0,a:0,c:0};var has=d.c>0;yearlyRows+='<tr><td class=""tc"">'+m+'</td><td>'+thaiMonths[m-1]+' '+year+'</td><td class=""tc"">'+(has?d.c:'-')+'</td><td class=""tr"">'+(has?d.u.toLocaleString():'-')+'</td><td class=""tr"">'+(has?d.a.toLocaleString():'-')+'</td></tr>';grandTotalUsage+=d.u;grandTotalAmount+=d.a;}"

$newYearlyCode = "for(var m=1;m<=monthIdx;m++){var d=md[m]||{u:0,a:0,c:0};var has=d.c>0;yearlyRows+='<tr><td class=""tc"">'+m+'</td><td>'+thaiMonths[m-1]+' '+year+'</td><td class=""tc"">'+(has?d.c:'-')+'</td><td class=""tr"">'+(has?d.u.toLocaleString():'-')+'</td><td class=""tc"">'+(has?rate:'-')+'</td><td class=""tr"">'+(has?d.a.toLocaleString():'-')+'</td><td class=""tr"">'+(has&&d.c>0?Math.round(d.a/d.c).toLocaleString():'-')+'</td></tr>';grandTotalUsage+=d.u;grandTotalAmount+=d.a;}"

$content = $content.Replace($oldYearlyCode, $newYearlyCode)

# 4b. Fix fallback yearlyRows (catch block)
$oldFallback = "yearlyRows='<tr><td class=""tc"">'+monthIdx+'</td><td>'+monthName+' '+year+'</td><td class=""tc"">'+totalHouses+'</td><td class=""tr"">'+totalUsage.toLocaleString()+'</td><td class=""tr"">'+totalAmount.toLocaleString()+'</td></tr>'"

$newFallback = "yearlyRows='<tr><td class=""tc"">'+monthIdx+'</td><td>'+monthName+' '+year+'</td><td class=""tc"">'+totalHouses+'</td><td class=""tr"">'+totalUsage.toLocaleString()+'</td><td class=""tc"">'+rate+'</td><td class=""tr"">'+totalAmount.toLocaleString()+'</td><td class=""tr"">'+(totalHouses>0?Math.round(totalAmount/totalHouses).toLocaleString():'-')+'</td></tr>'"

$content = $content.Replace($oldFallback, $newFallback)

# 4c. Fix yearly table header — 5 cols → 7 cols
$oldYearlyHeader = '<th style="width:2.5em">'

# Replace the entire yearly table header in memo
$oldTblH = "<table><thead><tr><th style=""width:2.5em"">'+$([char]0x0E25)+$([char]0x0E33)"
# Actually let's use exact string matching

$oldMemoYearlyTh = '<table><thead><tr><th style="width:2.5em">'

# The way it's written in the code is as a JS string, let's target differently.
# Let's replace the whole w.document.write for the yearly header

$oldYearlyWrite = "w.document.write('<table><thead><tr><th style=""width:2.5em"">"

# Need exact Thai text match — let me use a different approach
# Search for the unique pattern around yearly table header in the printMemo function

# The yearly table header line in printMemo:
$oldLine = @"
w.document.write('<table><thead><tr><th style="width:2.5em">ลำดับ</th><th>เดือน</th><th style="width:6em">จำนวน<br>บ้านพัก</th><th style="width:7em">รวมหน่วย<br>ใช้</th><th style="width:7em">รวมยอดเงิน<br>(บาท)</th></tr></thead><tbody>');
"@.Trim()

$newLine = @"
w.document.write('<table><thead><tr><th style="width:2em">ลำดับ</th><th>เดือน</th><th style="width:5em">จำนวน<br>บ้านพัก</th><th style="width:5.5em">รวมหน่วย<br>ใช้</th><th style="width:4.5em">อัตรา<br>(บาท/หน่วย)</th><th style="width:5.5em">รวมยอดเงิน<br>(บาท)</th><th style="width:5.5em">เฉลี่ยต่อหลัง<br>(บาท)</th></tr></thead><tbody>');
"@.Trim()

$content = $content.Replace($oldLine, $newLine)

# 4d. Fix yearly summary row — 5 cols → 7 cols
$oldSumRow = @"
w.document.write('<tr class="tr-sum"><td colspan="3" style="text-align:right">รวมทั้งปี</td><td class="tr">'+grandTotalUsage.toLocaleString()+'</td><td class="tr">'+grandTotalAmount.toLocaleString()+'</td></tr>');
"@.Trim()

$newSumRow = @"
w.document.write('<tr class="tr-sum"><td colspan="3" style="text-align:right">รวมทั้งปี</td><td class="tr">'+grandTotalUsage.toLocaleString()+'</td><td></td><td class="tr">'+grandTotalAmount.toLocaleString()+'</td><td></td></tr>');
"@.Trim()

# There are TWO instances of this pattern (printMemo + printYearlyReport's identical version might differ)
# Let me be more targeted - the printMemo version
$content = $content.Replace($oldSumRow, $newSumRow)

# ═══════════════════════════════════════════════════════════
# WRITE OUTPUT
# ═══════════════════════════════════════════════════════════
[System.IO.File]::WriteAllText($path, $content, $utf8BOM)

# Verify changes
$changed = $content -ne $orig
Write-Host "File changed: $changed"
$fontMatches = ([regex]::Matches($content, 'TH SarabunPSK')).Count
Write-Host "TH SarabunPSK references: $fontMatches"
$borderPt = ([regex]::Matches($content, '0\.5pt solid')).Count
Write-Host "0.5pt solid borders: $borderPt"

# Check for remaining 1px solid in print CSS (shouldn't be any)
$pxBorders = ([regex]::Matches($content, '1px solid #000')).Count
Write-Host "Remaining 1px solid #000: $pxBorders"

# Check yearly columns
$yearlyColCheck = $content.Contains('width:4.5em')
Write-Host "Yearly rate column added: $yearlyColCheck"
