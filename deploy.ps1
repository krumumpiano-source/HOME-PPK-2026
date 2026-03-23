# ============================================================
#  HOME PPK 2026 — Deploy Script
#  โดย: ครูพงศธร โพธิแก้ว | งานบ้านพักครู โรงเรียนพะเยาพิทยาคม
#  วิธีใช้: เปิด PowerShell แล้วรัน .\deploy.ps1
# ============================================================

param(
    [string]$Step = "all"   # all | sql | functions | secrets | check
)

# ====== สี ======
function Write-Green($msg)  { Write-Host $msg -ForegroundColor Green }
function Write-Yellow($msg) { Write-Host $msg -ForegroundColor Yellow }
function Write-Red($msg)    { Write-Host $msg -ForegroundColor Red }
function Write-Cyan($msg)   { Write-Host $msg -ForegroundColor Cyan }
function Write-White($msg)  { Write-Host $msg }

# ====== Banner ======
Clear-Host
Write-Cyan @"
 =========================================
  HOME PPK 2026 — Deployment Script
  Supabase + Email (Resend.com)
 =========================================
"@

# ====== ตรวจสอบ supabase CLI ======
function Test-SupabaseCLI {
    try { $null = supabase --version 2>&1; return $true } catch { return $false }
}

$hasCLI = Test-SupabaseCLI

if (-not $hasCLI) {
    Write-Yellow ""
    Write-Yellow "⚠ ไม่พบ Supabase CLI — บางขั้นตอนต้องทำด้วยตนเอง"
    Write-Yellow "  ติดตั้ง CLI: https://supabase.com/docs/guides/cli"
    Write-Yellow "  หลังติดตั้ง: supabase login"
    Write-Yellow ""
}

# ============================================================
#  STEP 1: รัน SQL Migration
# ============================================================
function Run-SQLMigration {
    Write-Cyan "`n[1/3] รัน SQL Migrations..."
    $sqlFiles = @("$PSScriptRoot\supabase\schema.sql", "$PSScriptRoot\supabase\rls.sql")

    foreach ($sqlFile in $sqlFiles) {
        $fname = Split-Path $sqlFile -Leaf
        if (-not (Test-Path $sqlFile)) {
            Write-Yellow "  ⚠ ไม่พบไฟล์: $fname"
            continue
        }
        Write-White "  📄 $fname"
    }

    Write-Yellow "  📋 วิธีรัน SQL:"
    Write-Yellow "     1. เปิด https://supabase.com/dashboard"
    Write-Yellow "     2. เลือก Project ของคุณ → SQL Editor"
    Write-Yellow "     3. รัน schema.sql แล้วตามด้วย rls.sql"
    Write-White ""
    $ans = Read-Host "  รัน SQL ด้วยตนเองเรียบร้อยแล้วหรือยัง? (y/n)"
    if ($ans -eq 'y' -or $ans -eq 'Y') {
        Write-Green "  ✅ ยืนยัน SQL Migration"
        return $true
    }
    Write-Yellow "  ⚠ ข้ามขั้นตอนนี้"
    return $false
}

# ============================================================
#  STEP 2: Deploy Edge Functions
# ============================================================
function Deploy-EdgeFunctions {
    Write-Cyan "`n[2/3] Deploy Supabase Edge Functions..."
    $functions = @("send-email", "cleanup-old-slips", "cleanup-old-meter-photos")

    if (-not $hasCLI) {
        Write-Yellow "  📋 วิธี Deploy Edge Functions ด้วยตนเอง:"
        Write-Yellow "     ติดตั้ง Supabase CLI แล้วรันคำสั่ง:"
        foreach ($fn in $functions) {
            Write-White "     supabase functions deploy $fn"
        }
        Write-Yellow ""
        Write-Yellow "  หรือ Deploy ผ่าน GitHub Actions ถ้าตั้งค่าไว้"
        $ans = Read-Host "  Deploy Edge Functions เรียบร้อยแล้วหรือยัง? (y/n)"
        if ($ans -eq 'y' -or $ans -eq 'Y') { Write-Green "  ✅ ยืนยัน Edge Functions"; return $true }
        Write-Yellow "  ⚠ ข้ามขั้นตอนนี้"
        return $false
    }

    $allOk = $true
    foreach ($fn in $functions) {
        $fnDir = "$PSScriptRoot\supabase\functions\$fn"
        if (-not (Test-Path $fnDir)) {
            Write-Yellow "  ⚠ ไม่พบโฟลเดอร์ฟังก์ชัน: $fn"
            $allOk = $false
            continue
        }
        Write-White "  🚀 กำลัง Deploy: $fn"
        supabase functions deploy $fn --no-verify-jwt 2>&1
        if ($LASTEXITCODE -eq 0) { Write-Green "     ✅ $fn" }
        else { Write-Red "     ❌ $fn (deploy ไม่สำเร็จ)"; $allOk = $false }
    }
    return $allOk
}

# ============================================================
#  STEP 3: ตั้งค่า Secrets
# ============================================================
function Set-Secrets {
    Write-Cyan "`n[3/3] ตั้งค่า Environment Secrets..."

    Write-White "  คุณสามารถตั้งค่า secrets สองวิธี:"
    Write-White "  A) ตั้งผ่าน Admin Settings → อีเมล (แนะนำ, เก็บในฐานข้อมูล)"
    Write-White "  B) ตั้งผ่าน Supabase CLI (เก็บใน Supabase Vault)"
    Write-White ""

    if ($hasCLI) {
        Write-Yellow "  ตั้งค่า Secret ผ่าน CLI:"
        Write-Yellow "  (ข้อมูลต่อไปนี้จะไม่ถูกบันทึก — พิมพ์ 's' เพื่อข้าม)"
        Write-White ""

        $resendKey = Read-Host "  Resend API Key (re_...) หรือ 's' เพื่อข้าม"
        if ($resendKey -ne 's' -and $resendKey.Length -gt 4) {
            supabase secrets set RESEND_API_KEY="$resendKey" 2>&1
            Write-Green "  ✅ ตั้งค่า RESEND_API_KEY แล้ว"
        }
    } else {
        Write-Yellow "  📋 ตั้งค่าใน Admin Settings → อีเมล"
        Write-Yellow "     หลังจาก Login ด้วย admin account"
    }

    return $true
}

# ============================================================
#  STEP 4: ตรวจสอบ / Summary
# ============================================================
function Show-Summary {
    Write-Cyan "`n====== สรุปสิ่งที่ต้องทำต่อ ======"
    Write-White ""
    Write-Green "✅ ไฟล์ที่สร้างแล้ว:"
    Write-White "   • supabase\schema.sql"
    Write-White "   • supabase\rls.sql"
    Write-White "   • supabase\functions\send-email\index.ts"
    Write-White "   • supabase\functions\cleanup-old-slips\index.ts"
    Write-White "   • index.html (Landing Page)"
    Write-White ""
    Write-Yellow "📋 ขั้นตอนต่อไป (ทำด้วยตนเอง):"
    Write-White "   1. เปิด Admin Settings → อีเมล → กรอก Resend Key"
    Write-White "   2. สมัคร Resend.com → ยืนยัน Domain → คัดลอก API Key"
    Write-White "   3. ทดสอบส่งอีเมลจากหน้า Admin Settings"
    Write-White ""
    Write-Cyan "====================================="
    Write-Green "  HOME PPK 2026 พร้อมใช้งาน! 🎉"
    Write-Cyan "====================================="
    Write-White ""
}

# ============================================================
#  Main
# ============================================================
Write-White ""
Write-White "สคริปต์นี้จะช่วย Deploy ระบบ HOME PPK 2026:"
Write-White "  1. รัน SQL Migrations (schema + RLS)"
Write-White "  2. Deploy Supabase Edge Functions"
Write-White "  3. ตั้งค่า Environment Secrets"
Write-White ""
$start = Read-Host "เริ่มต้นหรือไม่? (y/n)"
if ($start -ne 'y' -and $start -ne 'Y') { Write-Yellow "ยกเลิก"; exit 0 }

switch ($Step) {
    "sql"       { Run-SQLMigration }
    "functions" { Deploy-EdgeFunctions }
    "secrets"   { Set-Secrets }
    "check"     { Show-Summary }
    default {
        Run-SQLMigration
        Deploy-EdgeFunctions
        Set-Secrets
        Show-Summary
    }
}
