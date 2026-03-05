# =================================================================
#  line-richmenu-setup.ps1
#  ลงทะเบียน LINE Rich Menu ผ่าน LINE Messaging API
#
#  วิธีใช้:
#    1. ตั้งค่า $ChannelToken และ $LiffId ด้านล่าง หรือ
#       ส่งเป็น parameter: .\line-richmenu-setup.ps1 -ChannelToken "xxx" -LiffId "yyy"
#    2. ออกแบบรูป Rich Menu ขนาด 2500x1686px แล้วบันทึกเป็น richmenu-image.png
#       ในโฟลเดอร์ supabase/ (ดูตัวอย่างการออกแบบที่ท้ายไฟล์นี้)
#    3. รัน script:  .\supabase\line-richmenu-setup.ps1
# =================================================================

param(
  [string]$ChannelToken = "",   # LINE Channel Access Token
  [string]$LiffId       = "",   # LIFF ID (ไม่รวม https://liff.line.me/)
  [string]$ImagePath    = "$PSScriptRoot\richmenu-image.png"
)

# ── ถ้าไม่ได้ส่ง param ให้ถามทีละอัน ──────────────────────────────
if (-not $ChannelToken) {
  $ChannelToken = Read-Host "LINE Channel Access Token (จาก LINE Developers Console)"
}
if (-not $LiffId) {
  $LiffId = Read-Host "LIFF ID (เช่น 2007891234-AbCdEfGh)"
}

$headers = @{
  "Authorization" = "Bearer $ChannelToken"
  "Content-Type"  = "application/json"
}

# ── Step 1: อ่าน JSON template และแทนที่ LIFF ID ─────────────────
$jsonPath = "$PSScriptRoot\line-richmenu.json"
if (-not (Test-Path $jsonPath)) {
  Write-Error "ไม่พบไฟล์ $jsonPath"; exit 1
}
$jsonBody = Get-Content $jsonPath -Raw -Encoding UTF8
$jsonBody = $jsonBody -replace '\{LIFF_ID\}', $LiffId

Write-Host "`n🔧 กำลังสร้าง Rich Menu..." -ForegroundColor Cyan

# ── Step 2: สร้าง Rich Menu ──────────────────────────────────────
try {
  $createRes = Invoke-RestMethod -Uri "https://api.line.me/v2/bot/richmenu" `
    -Method Post -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($jsonBody))
  $richMenuId = $createRes.richMenuId
  Write-Host "✅ สร้าง Rich Menu สำเร็จ: $richMenuId" -ForegroundColor Green
} catch {
  Write-Host "❌ ไม่สามารถสร้าง Rich Menu: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Yellow
  exit 1
}

# ── Step 3: อัปโหลดรูปภาพ ────────────────────────────────────────
if (Test-Path $ImagePath) {
  Write-Host "`n📤 กำลังอัปโหลดรูป Rich Menu..." -ForegroundColor Cyan
  $imgHeaders = @{ "Authorization" = "Bearer $ChannelToken"; "Content-Type" = "image/png" }
  $imgBytes   = [System.IO.File]::ReadAllBytes($ImagePath)
  try {
    $null = Invoke-RestMethod -Uri "https://api-data.line.me/v2/bot/richmenu/$richMenuId/content" `
      -Method Post -Headers $imgHeaders -Body $imgBytes
    Write-Host "✅ อัปโหลดรูปสำเร็จ" -ForegroundColor Green
  } catch {
    Write-Host "⚠ อัปโหลดรูปไม่ได้: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   (Rich Menu ยังใช้งานได้แต่จะแสดงเป็นสีพื้น)" -ForegroundColor Yellow
  }
} else {
  Write-Host "`n⚠ ไม่พบไฟล์รูป: $ImagePath" -ForegroundColor Yellow
  Write-Host "   สร้างรูปขนาด 2500×1686 px แล้วบันทึกเป็น richmenu-image.png" -ForegroundColor Yellow
  Write-Host "   หรืออัปโหลดผ่าน LINE Official Account Manager ด้วยตัวเอง" -ForegroundColor Yellow
}

# ── Step 4: ตั้ง Default Rich Menu ──────────────────────────────
Write-Host "`n🔗 กำลังตั้ง Default Rich Menu..." -ForegroundColor Cyan
try {
  $null = Invoke-RestMethod -Uri "https://api.line.me/v2/bot/user/all/richmenu/$richMenuId" `
    -Method Post -Headers @{ "Authorization" = "Bearer $ChannelToken" }
  Write-Host "✅ ตั้ง Default Rich Menu สำเร็จ" -ForegroundColor Green
} catch {
  Write-Host "⚠ ตั้ง Default ไม่ได้ (อาจต้อง Plan ที่รองรับ): $($_.Exception.Message)" -ForegroundColor Yellow
  Write-Host "   → ไปที่ LINE Official Account Manager และ Link Rich Menu ด้วยตนเอง" -ForegroundColor Yellow
}

# ── สรุป ──────────────────────────────────────────────────────────
Write-Host "`n════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  Rich Menu ID: $richMenuId" -ForegroundColor White
Write-Host "  บันทึก ID นี้ไว้ในตาราง settings:" -ForegroundColor Gray
Write-Host "  key = 'line_rich_menu_id'  value = '$richMenuId'" -ForegroundColor Gray
Write-Host "════════════════════════════════════════`n" -ForegroundColor Magenta

# ── ตัวเลือก: บันทึกค่าเข้า Supabase settings ─────────────────
$saveToDb = Read-Host "บันทึก richMenuId เข้า Supabase settings ด้วยไหม? (y/N)"
if ($saveToDb -eq 'y' -or $saveToDb -eq 'Y') {
  $supabaseUrl = Read-Host "Supabase URL"
  $serviceKey  = Read-Host "Supabase Service Role Key"
  $upsertBody  = '[{"key":"line_rich_menu_id","value":"' + $richMenuId + '"}]'
  $sbHeaders = @{
    "apikey"        = $serviceKey
    "Authorization" = "Bearer $serviceKey"
    "Content-Type"  = "application/json"
    "Prefer"        = "resolution=merge-duplicates"
  }
  try {
    $null = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/settings" `
      -Method Post -Headers $sbHeaders -Body ([System.Text.Encoding]::UTF8.GetBytes($upsertBody))
    Write-Host "✅ บันทึกใน Supabase settings เรียบร้อย" -ForegroundColor Green
  } catch {
    Write-Host "❌ บันทึกไม่ได้: $($_.Exception.Message)" -ForegroundColor Red
  }
}

Write-Host "`n🎉 เสร็จสิ้น! Rich Menu จะปรากฏในหน้าสนทนา LINE ภายใน 1-2 นาที`n" -ForegroundColor Green

# =================================================================
#  คำแนะนำออกแบบรูป Rich Menu (2500 x 1686 px, PNG)
#  ────────────────────────────────────────────────────────────────
#  แบ่งเป็น 2 แถว x 3 คอลัมน์:
#
#  ┌─────────────┬─────────────┬─────────────┐
#  │  📤 ส่งสลิป  │ 💰 ยอดค้าง  │  📊 สถิติ   │
#  │  (833x843)  │  (834x843)  │  (833x843)  │
#  ├─────────────┼─────────────┼─────────────┤
#  │  📋 ประวัติ  │ 🔧 แจ้งซ่อม │  ❓ ช่วย    │
#  │  (833x843)  │  (834x843)  │  (833x843)  │
#  └─────────────┴─────────────┴─────────────┘
#
#  เครื่องมือออกแบบฟรี:
#  - Canva: https://www.canva.com/  (ขนาด 2500x1686)
#  - LINE Rich Menu Designer (ใน LINE Official Account Manager)
# =================================================================
