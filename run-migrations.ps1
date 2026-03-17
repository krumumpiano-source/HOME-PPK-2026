# ============================================================
#  run-migrations.ps1 — HOME PPK 2026
#  รัน SQL migration files ทั้งหมดใน supabase/migrations/
#  โดยอัตโนมัติผ่าน Supabase REST API
#
#  วิธีใช้: .\run-migrations.ps1
# ============================================================

$ErrorActionPreference = "Continue"
$ROOT       = $PSScriptRoot
$SB_URL     = "https://mwigdgxrfpcmfjuztmip.supabase.co"
$MIG_DIR    = "$ROOT\supabase\migrations"
$TRACK_FILE = "$ROOT\.migration-applied"
$ENV_FILE   = "$ROOT\.env.local"

function OK($t)   { Write-Host "  OK  $t" -ForegroundColor Green }
function WARN($t) { Write-Host "  !!  $t" -ForegroundColor Yellow }
function ERR($t)  { Write-Host "  XX  $t" -ForegroundColor Red }
function INFO($t) { Write-Host "  >>  $t" -ForegroundColor Cyan }

Write-Host "`n============================================" -ForegroundColor Magenta
Write-Host "  HOME PPK 2026 — Run SQL Migrations" -ForegroundColor White
Write-Host "============================================`n" -ForegroundColor Magenta

# ── โหลด key จาก .env.local ────────────────────────────────
$SB_KEY = $env:SUPABASE_SERVICE_KEY
if (-not $SB_KEY -and (Test-Path $ENV_FILE)) {
    Get-Content $ENV_FILE -Encoding UTF8 | ForEach-Object {
        if ($_ -match '^SUPABASE_SERVICE_KEY=(.+)$') { $SB_KEY = $Matches[1].Trim() }
    }
}

# ── ถ้าไม่มี key เลย → ถามครั้งเดียวแล้วบันทึก ────────────
if (-not $SB_KEY) {
    Write-Host "  Supabase Service Role Key" -ForegroundColor White -NoNewline
    Write-Host " (จาก Project Settings → API → service_role):" -ForegroundColor Gray
    $SB_KEY = Read-Host "  Key"
    if (-not $SB_KEY) { ERR "ไม่มี Service Key — ยกเลิก"; exit 1 }
    # บันทึกลง .env.local
    "SUPABASE_SERVICE_KEY=$SB_KEY" | Set-Content -Path $ENV_FILE -Encoding UTF8
    OK "บันทึก key ลง .env.local แล้ว (ครั้งต่อไปไม่ต้องกรอกอีก)"
} else {
    INFO "ใช้ Service Key จาก .env.local"
}

$headers = @{
    "apikey"        = $SB_KEY
    "Authorization" = "Bearer $SB_KEY"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=minimal"
}

# ── โหลดรายการที่รันแล้ว ───────────────────────────────────
$applied = @()
if (Test-Path $TRACK_FILE) {
    $applied = Get-Content $TRACK_FILE -Encoding UTF8 | Where-Object { $_ -ne "" }
}

# ── ค้นหา migration files ───────────────────────────────────
if (-not (Test-Path $MIG_DIR)) {
    WARN "ไม่พบโฟลเดอร์ $MIG_DIR"; exit 1
}

$files = Get-ChildItem "$MIG_DIR\*.sql" | Sort-Object Name

if ($files.Count -eq 0) {
    OK "ไม่มี migration ใหม่"; exit 0
}

$ran = 0
$skipped = 0
$failed = 0

foreach ($file in $files) {
    $name = $file.Name

    # ข้ามถ้ารันแล้ว
    if ($applied -contains $name) {
        Write-Host "  skip $name" -ForegroundColor DarkGray
        $skipped++
        continue
    }

    INFO "รัน: $name"
    $sql = Get-Content $file.FullName -Raw -Encoding UTF8

    # ลอง REST API exec_sql ก่อน
    $ok = $false
    try {
        $body = ConvertTo-Json @{ query = $sql } -Compress
        Invoke-RestMethod -Uri "$SB_URL/rest/v1/rpc/exec_sql" `
            -Method Post -Headers $headers -Body $body -ErrorAction Stop | Out-Null
        $ok = $true
    } catch {
        # ถ้า exec_sql ไม่มี → ลอง pg REST endpoint โดยตรง
        # (Supabase ให้ pg endpoint ผ่าน /pg/query บาง project)
        try {
            $body2 = ConvertTo-Json @{ query = $sql } -Compress
            Invoke-RestMethod -Uri "$SB_URL/pg/query" `
                -Method Post -Headers $headers -Body $body2 -ErrorAction Stop | Out-Null
            $ok = $true
        } catch {
            $errMsg = $_.Exception.Message
        }
    }

    if ($ok) {
        OK "$name"
        # บันทึกว่ารันแล้ว
        Add-Content -Path $TRACK_FILE -Value $name -Encoding UTF8
        $ran++
    } else {
        ERR "$name ล้มเหลว"
        WARN "กรุณารัน manual ใน Supabase SQL Editor:"
        WARN "  https://supabase.com/dashboard/project/mwigdgxrfpcmfjuztmip/sql"
        Write-Host ""
        Write-Host "--- SQL ---" -ForegroundColor DarkGray
        Write-Host $sql -ForegroundColor DarkGray
        Write-Host "-----------" -ForegroundColor DarkGray
        $failed++
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Magenta
if ($ran -gt 0)     { OK "รันสำเร็จ: $ran ไฟล์" }
if ($skipped -gt 0) { Write-Host "  skip     ข้ามแล้ว: $skipped ไฟล์" -ForegroundColor DarkGray }
if ($failed -gt 0)  { ERR "ล้มเหลว:  $failed ไฟล์ (ต้องรัน manual)" }
Write-Host "============================================`n" -ForegroundColor Magenta
