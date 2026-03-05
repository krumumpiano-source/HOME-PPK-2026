# ============================================================
#  setup-all.ps1 — HOME PPK 2026 : One-Click Full Setup
#  รัน script นี้ครั้งเดียว ระบบทุกอย่างจะพร้อมใช้งาน
#
#  วิธีใช้: .\setup-all.ps1
# ============================================================

$ErrorActionPreference = "Continue"
$ProgressPreference    = "SilentlyContinue"
$ROOT = $PSScriptRoot

# ── สี ──────────────────────────────────────────────────────
function Title($t)  { Write-Host "`n══════════════════════════════════════" -ForegroundColor Magenta; Write-Host "  $t" -ForegroundColor White; Write-Host "══════════════════════════════════════" -ForegroundColor Magenta }
function OK($t)     { Write-Host "  ✅ $t" -ForegroundColor Green }
function WARN($t)   { Write-Host "  ⚠  $t" -ForegroundColor Yellow }
function ERR($t)    { Write-Host "  ❌ $t" -ForegroundColor Red }
function INFO($t)   { Write-Host "  ℹ  $t" -ForegroundColor Cyan }
function Ask($q)    { Write-Host "`n  $q" -ForegroundColor White -NoNewline; Read-Host " " }

# ============================================================
Title "HOME PPK 2026 — Full Setup Script"
INFO "Script จะตั้งค่าทุกอย่างโดยอัตโนมัติ"
INFO "วันที่: $(Get-Date -Format 'dd/MM/yyyy HH:mm')"

# ============================================================
Title "1. ตรวจสอบ / ติดตั้ง Supabase CLI"

$sbExe = $null
$candidates = @(
  "$ROOT\supabase.exe",
  "C:\supabase.exe",
  "$env:LOCALAPPDATA\supabase.exe",
  (Get-Command supabase -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source)
)
foreach ($c in $candidates) { if ($c -and (Test-Path $c)) { $sbExe = $c; break } }

if (-not $sbExe) {
  INFO "ไม่พบ Supabase CLI — กำลังดาวน์โหลด..."
  $tarUrl = "https://github.com/supabase/cli/releases/download/v2.75.0/supabase_windows_amd64.tar.gz"
  $tarPath = "$ROOT\supabase_cli.tar.gz"
  
  # ตรวจว่า background download เสร็จหรือยัง
  $dlJob = Get-Job -Name "DL_CLI" -ErrorAction SilentlyContinue
  if ($dlJob -and $dlJob.State -eq 'Running') {
    INFO "รอ download เสร็จ..."
    $dlJob | Wait-Job -Timeout 120 | Out-Null
  }
  
  if (-not (Test-Path $tarPath)) {
    Invoke-WebRequest $tarUrl -OutFile $tarPath
  }
  
  if (Test-Path $tarPath) {
    tar -xzf $tarPath -C $ROOT 2>&1 | Out-Null
    $sbExe = Get-ChildItem $ROOT -Filter "supabase*.exe" | Select-Object -ExpandProperty FullName -First 1
    if (-not $sbExe) { $sbExe = "$ROOT\supabase.exe" }
  }
}

if ($sbExe -and (Test-Path $sbExe)) {
  $ver = & $sbExe --version 2>&1
  OK "Supabase CLI: $ver"
} else {
  ERR "ไม่สามารถติดตั้ง Supabase CLI ได้อัตโนมัติ"
  INFO "โปรดดาวน์โหลดด้วยตนเอง: https://supabase.com/docs/guides/cli/getting-started"
  $sbExe = Ask "ระบุ path ของ supabase.exe (หรือกด Enter เพื่อข้ามการ deploy functions)"
  if (-not $sbExe -or -not (Test-Path $sbExe)) { $sbExe = $null }
}

# ============================================================
Title "2. Supabase Project Credentials"

INFO "ดูค่าได้ที่: https://supabase.com/dashboard/project/mwigdgxrfpcmfjuztmip/settings/api"
INFO "Supabase URL: https://mwigdgxrfpcmfjuztmip.supabase.co (ตั้งค่าแล้ว)"

$sbProject = "mwigdgxrfpcmfjuztmip"

$sbServiceKey = Ask "Supabase Service Role Key (จาก Project Settings → API → service_role)"
$sbAccessToken = Ask "Supabase Personal Access Token (จาก https://supabase.com/dashboard/account/tokens)"

if ($sbAccessToken) { OK "ได้รับ Access Token" } else { WARN "ไม่มี Access Token — จะข้ามขั้นตอน deploy functions" }
if ($sbServiceKey) { OK "ได้รับ Service Role Key" } else { WARN "ไม่มี Service Key — จะข้ามขั้นตอน SQL + Storage" }

# ============================================================
Title "3. LINE Credentials"

INFO "ดูค่าได้ที่: https://developers.line.biz/console/"
$lineToken  = Ask "LINE Channel Access Token"
$lineSecret = Ask "LINE Channel Secret"
$lineLiffId = Ask "LIFF ID (เช่น 2099999999-AbCdEfGh)"

# ============================================================
Title "4. รัน SQL Migrations บน Supabase"

if ($sbServiceKey) {
  $sbUrl   = "https://mwigdgxrfpcmfjuztmip.supabase.co"
  $headers = @{ "apikey" = $sbServiceKey; "Authorization" = "Bearer $sbServiceKey"; "Content-Type" = "application/json" }

  # ─ schema.sql ─
  $schemaFile = "$ROOT\supabase\schema.sql"
  if (Test-Path $schemaFile) {
    INFO "รัน schema.sql..."
    $sql = Get-Content $schemaFile -Raw -Encoding UTF8
    try {
      $r = Invoke-RestMethod -Uri "$sbUrl/rest/v1/rpc/exec_sql" `
        -Method Post -Headers $headers -Body (ConvertTo-Json @{ query = $sql }) -ErrorAction Stop
      OK "schema.sql สำเร็จ"
    } catch {
      WARN "schema.sql ผ่าน REST ไม่ได้ — ใช้ Supabase SQL Editor แทน"
      INFO "  → เปิด: https://supabase.com/dashboard/project/$sbProject/sql"
      INFO "  → วางเนื้อหาจาก: supabase\schema.sql"
    }
  }

  # ─ rls.sql ─
  $rlsFile = "$ROOT\supabase\rls.sql"
  if (Test-Path $rlsFile) {
    $sql2 = Get-Content $rlsFile -Raw -Encoding UTF8
    try {
      Invoke-RestMethod -Uri "$sbUrl/rest/v1/rpc/exec_sql" -Method Post -Headers $headers -Body (ConvertTo-Json @{ query = $sql2 }) -ErrorAction Stop | Out-Null
      OK "rls.sql สำเร็จ"
    } catch { WARN "rls.sql — รัน manually ใน SQL Editor" }
  }

  # ─ line-migration.sql ─
  $lineSQL = "$ROOT\supabase\line-migration.sql"
  if (Test-Path $lineSQL) {
    $sql3 = Get-Content $lineSQL -Raw -Encoding UTF8
    try {
      Invoke-RestMethod -Uri "$sbUrl/rest/v1/rpc/exec_sql" -Method Post -Headers $headers -Body (ConvertTo-Json @{ query = $sql3 }) -ErrorAction Stop | Out-Null
      OK "line-migration.sql สำเร็จ"
    } catch { WARN "line-migration.sql — รัน manually ใน SQL Editor" }
  }

  # ─ ตั้งค่า LINE settings ในตาราง settings ─
  if ($lineToken -or $lineSecret -or $lineLiffId) {
    INFO "บันทึก LINE settings ลง DB..."
    $settingsPayload = @(
      @{key="line_channel_access_token"; value=$lineToken},
      @{key="line_channel_secret";       value=$lineSecret},
      @{key="line_liff_id";             value=$lineLiffId},
      @{key="line_push_quota_limit";    value="200"},
      @{key="line_push_quota_used";     value="0"}
    ) | Where-Object { $_.value }
    
    foreach ($s in $settingsPayload) {
      try {
        Invoke-RestMethod -Uri "$sbUrl/rest/v1/settings" `
          -Method Post -Headers (@{} + $headers + @{"Prefer"="resolution=merge-duplicates"}) `
          -Body (ConvertTo-Json @($s)) -ErrorAction Stop | Out-Null
      } catch {}
    }
    OK "LINE settings บันทึกแล้ว"
  }

  # ─ สร้าง Storage bucket 'slips' ─
  INFO "สร้าง Storage bucket 'slips'..."
  try {
    Invoke-RestMethod -Uri "$sbUrl/storage/v1/bucket" -Method Post -Headers $headers `
      -Body (ConvertTo-Json @{id="slips"; name="slips"; public=$true}) -ErrorAction Stop | Out-Null
    OK "Bucket 'slips' สร้างแล้ว"
  } catch { WARN "Bucket 'slips' อาจมีอยู่แล้ว (ข้าม)" }

} else {
  WARN "ไม่มี Service Key — ข้ามขั้นตอน SQL"
  INFO "รัน SQL ด้วยตนเองที่: https://supabase.com/dashboard/project/$sbProject/sql"
  INFO "ไฟล์ที่ต้องรัน (ตามลำดับ):"
  INFO "  1. supabase\schema.sql"
  INFO "  2. supabase\rls.sql"
  INFO "  3. supabase\line-migration.sql"
}

# ============================================================
Title "5. Deploy Supabase Edge Functions"

if ($sbExe -and $sbAccessToken) {
  INFO "Login Supabase CLI..."
  & $sbExe login --token $sbAccessToken 2>&1 | Out-Null
  
  INFO "Link project..."
  & $sbExe link --project-ref $sbProject --password "" 2>&1 | Out-Null

  $functions = @("line-webhook","line-push","cleanup-old-slips","send-email")
  foreach ($fn in $functions) {
    $fnPath = "$ROOT\supabase\functions\$fn"
    if (Test-Path $fnPath) {
      INFO "Deploying $fn..."
      $out = & $sbExe functions deploy $fn --project-ref $sbProject 2>&1
      if ($LASTEXITCODE -eq 0) { OK "$fn deployed" }
      else { WARN "$fn deploy ไม่สำเร็จ: $($out | Select-Object -Last 3 | Out-String)" }
    }
  }

  # ตั้งค่า secrets ใน Edge Functions
  if ($lineToken)  { & $sbExe secrets set LINE_CHANNEL_ACCESS_TOKEN=$lineToken --project-ref $sbProject 2>&1 | Out-Null; OK "Secrets: LINE_CHANNEL_ACCESS_TOKEN" }
  if ($lineSecret) { & $sbExe secrets set LINE_CHANNEL_SECRET=$lineSecret --project-ref $sbProject 2>&1 | Out-Null; OK "Secrets: LINE_CHANNEL_SECRET" }

} elseif (-not $sbExe) {
  WARN "ไม่มี Supabase CLI — deploy ด้วยตนเอง"
  INFO "รันใน PowerShell:"
  INFO "  supabase login"
  INFO "  supabase link --project-ref $sbProject"
  INFO "  supabase functions deploy line-webhook"
  INFO "  supabase functions deploy line-push"
  INFO "  supabase functions deploy cleanup-old-slips"
  INFO "  supabase functions deploy send-email"
} else {
  WARN "ไม่มี Access Token — ข้ามการ deploy functions"
}

# ============================================================
Title "6. ตั้งค่า LINE Webhook URL"

$webhookUrl = "https://mwigdgxrfpcmfjuztmip.supabase.co/functions/v1/line-webhook"
INFO "Webhook URL ที่ต้องตั้งใน LINE Developers Console:"
Write-Host "  $webhookUrl" -ForegroundColor Yellow
INFO "ขั้นตอน:"
INFO "  1. ไป https://developers.line.biz/console/"
INFO "  2. เลือก Channel → Messaging API"
INFO "  3. Webhook URL → วาง URL ด้านบน"
INFO "  4. เปิด [Use Webhook] ✅"

# ============================================================
Title "7. สร้าง Rich Menu (ถ้ามี LINE Token)"

if ($lineToken -and $lineLiffId) {
  $rmFile = "$ROOT\supabase\line-richmenu.json"
  if (Test-Path $rmFile) {
    INFO "สร้าง Rich Menu..."
    & "$ROOT\supabase\line-richmenu-setup.ps1" -ChannelToken $lineToken -LiffId $lineLiffId
  }
} else {
  WARN "ไม่มี LINE Token/LIFF ID — ข้ามการสร้าง Rich Menu"
  INFO "รันด้วยตนเอง: .\supabase\line-richmenu-setup.ps1 -ChannelToken 'xxx' -LiffId 'yyy'"
}

# ============================================================
Title "8. GitHub Pages"

$ghPagesUrl = "https://krumumpiano-source.github.io/HOME-PPK-2026"
OK "Code push ขึ้น GitHub แล้ว"
INFO "เปิด GitHub Pages ได้ที่:"
INFO "  https://github.com/krumumpiano-source/HOME-PPK-2026/settings/pages"
INFO "  → Source: Deploy from branch"
INFO "  → Branch: main  /  Folder: / (root)"
INFO "  → Save"
Write-Host "`n  URL: $ghPagesUrl" -ForegroundColor Cyan

# ============================================================
Title "9. สรุป"

Write-Host @"

  ┌─────────────────────────────────────────────┐
  │         HOME PPK 2026 — Setup Summary        │
  ├─────────────────────────────────────────────┤
  │ GitHub Pages : $ghPagesUrl
  │ Supabase URL : https://mwigdgxrfpcmfjuztmip.supabase.co
  │ Webhook URL  : $webhookUrl
  ├─────────────────────────────────────────────┤
  │ สิ่งที่ต้องทำเพิ่มเติม (manual):             │
  │  □ เปิด GitHub Pages ใน GitHub Settings      │
  │  □ ตั้งค่า LINE Webhook URL                  │
  │  □ รัน SQL ถ้ายังไม่ได้รัน                  │
  └─────────────────────────────────────────────┘

"@ -ForegroundColor White

OK "setup-all.ps1 เสร็จสิ้น!"
