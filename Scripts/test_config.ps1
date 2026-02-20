$config = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Config.gs' -Raw -Encoding UTF8
$pass = 0; $fail = 0; $total = 0
$errors = @()

Write-Host ''
Write-Host '========================================================'
Write-Host '   TEST Config.gs vs setup_report JSON'
Write-Host '========================================================'
Write-Host ''

# Test 1: FOLDER_IDS
Write-Host '[Test 1] FOLDER_IDS - 12 folders'
$folderTests = @(
  ,@('ROOT','1SXKp_IoghVjemM5PtOimHRY-XvgX-O8l')
  ,@('DATA','1PaizJ3ykCFCAEQep1Df1wGTKUYhK7_mw')
  ,@('SLIPS','1dvOTXTqFv38UH4Oirt41AmLi11dZ7HNG')
  ,@('REQUEST_ATTACHMENTS','154nAS8Ssw223YvUKWMkxVG5jP592WFYf')
  ,@('ACCOUNTING_RECEIPTS','1iycNHSfceR9aSOIotc3UbXbTNntpBc66')
  ,@('DOCUMENTS','18kp2jGnO-fNw0rKdJEAEnmxYjCwf029A')
  ,@('BACKUPS','1TwqBZkzAS65T3vVSLE6sOfD6YTa4PHP1')
  ,@('SCRIPTS','1tSN73KZRlZV5uM3_RsI3nsE2gwLypeeJ')
  ,@('RESIDENCE_REQ','1F5mleAj-DF3zk3-K5fXoop_rHYNcLd73')
  ,@('TRANSFER_REQ','141e9DtEeuUtVTTN-j8xwmtVH9KjjMTlU')
  ,@('RETURN_REQ','1NEPgLDNe1DIa94QotTmMdW_nbD6Cin99')
  ,@('REPAIR_REQ','11VG5-Al5lmcfbPtJ6CZ8AeMNtHolJvHU')
)
$ok1 = 0
foreach ($t in $folderTests) {
  $total++
  if ($config.Contains($t[1])) { $pass++; $ok1++ }
  else { $fail++; $errors += ('  FAIL: FOLDER_IDS.' + $t[0] + ' NOT FOUND') }
}
Write-Host ('  ' + $ok1 + ' / ' + $folderTests.Count + ' passed')

# Test 2: SPREADSHEET_IDS
Write-Host '[Test 2] SPREADSHEET_IDS - 8 files'
$ssTests = @(
  ,@('MAIN','1dd3A0dLTWH-kS039jeKI5hW4J6YkMzYbL2lGFJ-OTLo')
  ,@('WATER','1Pts3g9ERLoHx38RX_HIw1rSN09LolBG6ajBg2-ggMJ0')
  ,@('ELECTRIC','1U-TftIkFye9UUzl5vTsNdHloownuJAHbZeOTw_PQ-tA')
  ,@('NOTIFICATIONS','16ffpM7mm8t7sWNpQa-B0pOCvtlHEje8yDx8p5EVr6Kc')
  ,@('PAYMENTS','1r-KKoMQzOBs31nHprcQRjdRdqyfMruCKqweZeNLN4As')
  ,@('REQUESTS','1C8ZbAedKCs31iLbnGBzshN9iZN-N7ZfOrT8W2PjQb2I')
  ,@('ACCOUNTING','1oRUwt9qo0pF8nEV-j6Mry_10Rq1tcamqZ18R17ZCf5c')
  ,@('WITHDRAW','1gMMI2ulRo935Yz3KRN9CkTm_oSXqO9mXlKbhMuW1GhI')
)
$ok2 = 0
foreach ($t in $ssTests) {
  $total++
  if ($config.Contains($t[1])) { $pass++; $ok2++ }
  else { $fail++; $errors += ('  FAIL: SPREADSHEET_IDS.' + $t[0] + ' NOT FOUND') }
}
Write-Host ('  ' + $ok2 + ' / ' + $ssTests.Count + ' passed')

# Test 3: SLIP_FOLDERS
Write-Host '[Test 3] SLIP_FOLDERS 2569 - year + 12 months'
$slipTests = @(
  ,@('YEAR_ROOT','15xzaAL5TwX9Lu-fG7NEeQHPIC9V-QAdV')
  ,@('01-Jan','1cNZwGrw2NalSjItrv_wiF56wHWXhAl8X')
  ,@('02-Feb','1Or9o6_M5kwFMNx4fmR30pkBp-RicSF40')
  ,@('03-Mar','1B2R4y4INZvmsDx7bjhosoUWkykqadr8S')
  ,@('04-Apr','1ewZH3ZbRP9uWl3qSz3NljwphdexM-nHA')
  ,@('05-May','1jCz1HXuTsqmntf1F0gyUQYk4OzSjhUh_')
  ,@('06-Jun','1FyNXO7UijJ1YALP8R4LYKRNVc8C2-XaL')
  ,@('07-Jul','1cJV5Bp_Hkb3mxloqTvNx7b6EqK36Ee_7')
  ,@('08-Aug','13ZK2Me4Q7ChMTxILdmjJiFU7gn6ncdgG')
  ,@('09-Sep','1nMH3KSovbXXX2pvQFkd9hYy_pMHwn24D')
  ,@('10-Oct','1WfwMQAz4A9qtpaa6o-tdrpC1WW7QFm6w')
  ,@('11-Nov','1jf_IkNs82kWrR4yf3c3zrxtR4FLNWqaz')
  ,@('12-Dec','1er_tvG_IIJ0KbIRvz_zUAaVxSIs_cGSp')
)
$ok3 = 0
foreach ($t in $slipTests) {
  $total++
  if ($config.Contains($t[1])) { $pass++; $ok3++ }
  else { $fail++; $errors += ('  FAIL: SLIP ' + $t[0] + ' NOT FOUND') }
}
Write-Host ('  ' + $ok3 + ' / ' + $slipTests.Count + ' passed')

# Test 4: SHEET_NAMES
Write-Host '[Test 4] SHEET_NAMES - 12 fixed sheets'
$sheets = @('Housing','Residents','Users','Permissions','Settings','Announcements','Logs','WaterRates','CommonFee','Exemptions','Outstanding','Queue')
$ok4 = 0
foreach ($s in $sheets) {
  $total++
  $search = "'" + $s + "'"
  if ($config.Contains($search)) { $pass++; $ok4++ }
  else { $fail++; $errors += ('  FAIL: SHEET ' + $s + ' NOT FOUND') }
}
Write-Host ('  ' + $ok4 + ' / ' + $sheets.Count + ' passed')

# Test 5: DEFAULTS
Write-Host '[Test 5] DEFAULTS - 22 keys'
$dkeys = @('org_name','school_name','water_rate','common_fee_house','common_fee_flat','garbage_fee','due_date','reminder_days','house_prefix','flat_prefix','electric_method','electric_rate','electric_min_charge','electric_rounding','water_min_charge','water_rounding','house_number_format','flat_number_format','require_login','allow_reset_password','allow_registration','queue_expiry_days')
$ok5 = 0
foreach ($dk in $dkeys) {
  $total++
  $search = $dk + ':'
  if ($config.Contains($search)) { $pass++; $ok5++ }
  else { $fail++; $errors += ('  FAIL: DEFAULT ' + $dk + ' NOT FOUND') }
}
Write-Host ('  ' + $ok5 + ' / ' + $dkeys.Count + ' passed')

# Test 6: ID_PREFIXES
Write-Host '[Test 6] ID_PREFIXES - 24 prefixes'
$prefixes = @('HOU','RES','USR','WTR','ELC','SLP','PAY','REQ','TRF','RTN','RPR','QUE','INC','EXP','WTD','ANN','LOG','RAT','CMF','EXM','OUT','ACT','NTF','REG')
$ok6 = 0
foreach ($px in $prefixes) {
  $total++
  $search = $px + ':'
  if ($config.Contains($search)) { $pass++; $ok6++ }
  else { $fail++; $errors += ('  FAIL: PREFIX ' + $px + ' NOT FOUND') }
}
Write-Host ('  ' + $ok6 + ' / ' + $prefixes.Count + ' passed')

# Test 7: Functions
Write-Host '[Test 7] Functions - 6 required'
$funcs = @('getSlipFolderId','getSlipYearFolderId','getRequestFolderId','getYearSheetName','getYearOnlySheetName','testConfig')
$ok7 = 0
foreach ($fn in $funcs) {
  $total++
  $search = 'function ' + $fn
  if ($config.Contains($search)) { $pass++; $ok7++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + ' NOT FOUND') }
}
Write-Host ('  ' + $ok7 + ' / ' + $funcs.Count + ' passed')

# Test 8: Misc
Write-Host '[Test 8] Misc - 4 checks'
$ok8 = 0

$total++
if ($config.Contains('CURRENT_YEAR = 2569')) { $pass++; $ok8++ }
else { $fail++; $errors += '  FAIL: CURRENT_YEAR != 2569' }

$total++
if ($config.Contains('DRIVE_URLS')) { $pass++; $ok8++ }
else { $fail++; $errors += '  FAIL: DRIVE_URLS missing' }

$total++
if ($config.Contains('THAI_MONTHS')) { $pass++; $ok8++ }
else { $fail++; $errors += '  FAIL: THAI_MONTHS missing' }

$total++
if ($config.Contains('THAI_MONTH_NAMES')) { $pass++; $ok8++ }
else { $fail++; $errors += '  FAIL: THAI_MONTH_NAMES missing' }
Write-Host ('  ' + $ok8 + ' / 4 passed')

# Test 9: Business rules
Write-Host '[Test 9] Business rules - 3 checks'
$ok9 = 0

$total++
if ($config -match "water_rate:\s+''") { $pass++; $ok9++ }
else { $fail++; $errors += '  FAIL: water_rate should be empty string' }

$total++
if ($config -match "electric_rate:\s+''") { $pass++; $ok9++ }
else { $fail++; $errors += '  FAIL: electric_rate should be empty string' }

$total++
if ($config.Contains("flat_prefix:")) {
  if ($config -match "flat_prefix:\s+'") { $pass++; $ok9++ }
  else { $fail++; $errors += '  FAIL: flat_prefix format wrong' }
} else { $fail++; $errors += '  FAIL: flat_prefix not found' }
Write-Host ('  ' + $ok9 + ' / 3 passed')

# SUMMARY
Write-Host ''
Write-Host '========================================================'
Write-Host '   RESULT'
Write-Host '========================================================'
Write-Host ('  Total Tests:  ' + $total)
Write-Host ('  Passed:       ' + $pass)
Write-Host ('  Failed:       ' + $fail)
Write-Host ''

if ($errors.Count -gt 0) {
  Write-Host '  ERRORS:'
  foreach ($e in $errors) { Write-Host $e }
  Write-Host ''
}

if ($fail -eq 0) {
  Write-Host ('  >>> ALL ' + $total + ' TESTS PASSED <<<')
  Write-Host '  Config.gs is correct and matches JSON report!'
} else {
  Write-Host ('  >>> ' + $fail + ' TESTS FAILED <<<')
}
Write-Host '========================================================'
