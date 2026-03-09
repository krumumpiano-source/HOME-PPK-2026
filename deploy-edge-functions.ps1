# ========================================
# Deploy Supabase Edge Functions
# ========================================

param(
    [string]$Function = "all",
    [string]$ProjectRef = "",
    [switch]$Help
)

if ($Help) {
    Write-Host @"
การใช้งาน:
  .\deploy-edge-functions.ps1 [-Function <name>] [-ProjectRef <project-ref>]

Parameters:
  -Function     ชื่อ function ที่ต้องการ deploy (line-webhook | line-push | cleanup-old-slips | all)
                ค่าเริ่มต้น: all
  -ProjectRef   Supabase Project Reference ID (ถ้าไม่ระบุจะใช้จาก config.js)
  -Help         แสดงวิธีใช้งาน

ตัวอย่าง:
  .\deploy-edge-functions.ps1                           # Deploy ทั้งหมด
  .\deploy-edge-functions.ps1 -Function line-webhook   # Deploy เฉพาะ line-webhook
  .\deploy-edge-functions.ps1 -ProjectRef abcdefg      # ระบุ project ref

ข้อกำหนด:
  - ติดตั้ง Supabase CLI: https://supabase.com/docs/guides/cli
  - Login แล้ว: supabase login
  - Link project: supabase link --project-ref <ref>
"@
    exit 0
}

Write-Host "`n🚀 HOME PPK 2026 - Deploy Edge Functions" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

# ตรวจสอบว่าติดตั้ง Supabase CLI หรือยัง
Write-Host "🔍 ตรวจสอบ Supabase CLI..." -ForegroundColor Yellow
try {
    $version = supabase --version 2>&1
    Write-Host "✅ พบ Supabase CLI: $version" -ForegroundColor Green
} catch {
    Write-Host "❌ ไม่พบ Supabase CLI" -ForegroundColor Red
    Write-Host "`nกรุณาติดตั้ง Supabase CLI ก่อน:" -ForegroundColor Yellow
    Write-Host "  https://supabase.com/docs/guides/cli/getting-started`n" -ForegroundColor Cyan
    Write-Host "Windows (PowerShell):" -ForegroundColor White
    Write-Host "  scoop install supabase" -ForegroundColor Gray
    Write-Host "หรือ:" -ForegroundColor White
    Write-Host "  npm install -g supabase`n" -ForegroundColor Gray
    exit 1
}

# ตรวจสอบว่า login แล้วหรือยัง
Write-Host "`n🔐 ตรวจสอบการ login..." -ForegroundColor Yellow
try {
    $loginCheck = supabase projects list 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ ยังไม่ได้ login เข้า Supabase" -ForegroundColor Red
        Write-Host "`nกรุณา login ก่อน:" -ForegroundColor Yellow
        Write-Host "  supabase login`n" -ForegroundColor Cyan
        exit 1
    }
    Write-Host "✅ Login สำเร็จ" -ForegroundColor Green
} catch {
    Write-Host "❌ ไม่สามารถตรวจสอบการ login ได้" -ForegroundColor Red
    exit 1
}

# อ่าน Project Ref จาก config.js ถ้าไม่ได้ระบุ
if (-not $ProjectRef) {
    Write-Host "`n📖 อ่าน Project Ref จาก config.js..." -ForegroundColor Yellow
    if (Test-Path ".\supabase\config.js") {
        $configContent = Get-Content ".\supabase\config.js" -Raw
        if ($configContent -match "https://([a-z0-9]+)\.supabase\.co") {
            $ProjectRef = $Matches[1]
            Write-Host "✅ พบ Project Ref: $ProjectRef" -ForegroundColor Green
        }
    }
    
    if (-not $ProjectRef) {
        Write-Host "❌ ไม่พบ Project Reference ID" -ForegroundColor Red
        Write-Host "`nกรุณาระบุ Project Ref:" -ForegroundColor Yellow
        Write-Host "  .\deploy-edge-functions.ps1 -ProjectRef <project-ref>`n" -ForegroundColor Cyan
        Write-Host "หรือหา Project Ref ได้จาก:" -ForegroundColor White
        Write-Host "  https://supabase.com/dashboard/project/<project-ref>/settings/general`n" -ForegroundColor Gray
        exit 1
    }
}

# Link project ถ้ายังไม่ได้ link
Write-Host "`n🔗 ตรวจสอบการ link project..." -ForegroundColor Yellow
$linkFile = ".\.supabase\config.toml"
if (-not (Test-Path $linkFile)) {
    Write-Host "⚠️  ยังไม่ได้ link project กำลัง link..." -ForegroundColor Yellow
    supabase link --project-ref $ProjectRef
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ ไม่สามารถ link project ได้" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ Project linked" -ForegroundColor Green

# Deploy functions
$functions = @()
if ($Function -eq "all") {
    $functions = @("line-webhook", "line-push", "cleanup-old-slips")
} else {
    $functions = @($Function)
}

Write-Host "`n📦 เริ่ม deploy functions..." -ForegroundColor Cyan
Write-Host "Functions: $($functions -join ', ')" -ForegroundColor White

$success = 0
$failed = 0

foreach ($fn in $functions) {
    Write-Host "`n🔨 Deploying: $fn" -ForegroundColor Yellow
    $fnPath = ".\supabase\functions\$fn"
    
    if (-not (Test-Path $fnPath)) {
        Write-Host "   ❌ ไม่พบ function: $fnPath" -ForegroundColor Red
        $failed++
        continue
    }
    
    try {
        supabase functions deploy $fn --project-ref $ProjectRef
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Deploy สำเร็จ: $fn" -ForegroundColor Green
            $success++
        } else {
            Write-Host "   ❌ Deploy ล้มเหลว: $fn" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host "   ❌ เกิดข้อผิดพลาด: $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
}

# สรุปผลการ deploy
Write-Host "`n=========================================`n" -ForegroundColor Cyan
Write-Host "📊 สรุปผลการ deploy:" -ForegroundColor Cyan
Write-Host "   ✅ สำเร็จ: $success functions" -ForegroundColor Green
if ($failed -gt 0) {
    Write-Host "   ❌ ล้มเหลว: $failed functions" -ForegroundColor Red
}
Write-Host ""

if ($success -gt 0) {
    Write-Host "🎉 Deploy เสร็จสมบูรณ์!" -ForegroundColor Green
    Write-Host "`nขั้นตอนถัดไป:" -ForegroundColor Yellow
    Write-Host "1. ตั้งค่า Environment Variables ใน Supabase Dashboard" -ForegroundColor White
    Write-Host "   https://supabase.com/dashboard/project/$ProjectRef/settings/functions" -ForegroundColor Gray
    Write-Host "2. ตั้งค่า LINE Webhook URL:" -ForegroundColor White
    Write-Host "   https://$ProjectRef.supabase.co/functions/v1/line-webhook" -ForegroundColor Cyan
    Write-Host "3. ทดสอบ functions ด้วย curl หรือ Postman`n" -ForegroundColor White
}

if ($failed -gt 0) {
    Write-Host "⚠️  มี functions ที่ deploy ไม่สำเร็จ กรุณาตรวจสอบ error ข้างบน`n" -ForegroundColor Yellow
    exit 1
}

exit 0
