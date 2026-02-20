$billing = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Billing.gs' -Raw -Encoding UTF8
$config = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Config.gs' -Raw -Encoding UTF8
$db = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Database.gs' -Raw -Encoding UTF8
$main = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Main.gs' -Raw -Encoding UTF8
$pass = 0; $fail = 0; $total = 0
$errors = @()

Write-Host ''
Write-Host '========================================================'
Write-Host '   TEST Billing.gs — Water, Electric, CommonFee, Summary'
Write-Host '========================================================'
Write-Host ''

# ============================================================
# Test 1: Water Functions (7 required)
# ============================================================
Write-Host '[Test 1] Water Functions — 7 required'
$waterFuncs = @(
  'getWaterBills',
  'saveWaterBill',
  'createWaterYearSheet',
  'getPreviousWaterMeter',
  'calculateWaterAmount',
  'getWaterRate',
  'updateWaterRate'
)
$ok1 = 0
foreach ($fn in $waterFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($billing.Contains($search)) { $pass++; $ok1++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok1 + ' / ' + $waterFuncs.Count + ' passed')

# ============================================================
# Test 2: Electric Functions (3 required)
# ============================================================
Write-Host '[Test 2] Electric Functions — 3 required'
$electricFuncs = @(
  'getElectricBills',
  'saveElectricBill',
  'createElectricYearSheet'
)
$ok2 = 0
foreach ($fn in $electricFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($billing.Contains($search)) { $pass++; $ok2++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok2 + ' / ' + $electricFuncs.Count + ' passed')

# ============================================================
# Test 3: CommonFee & Exemptions Functions (5 required)
# ============================================================
Write-Host '[Test 3] CommonFee & Exemptions — 5 required'
$feeFuncs = @(
  'getCommonFee',
  'updateCommonFee',
  'getExemptions',
  'updateExemptions',
  'deleteExemption'
)
$ok3 = 0
foreach ($fn in $feeFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($billing.Contains($search)) { $pass++; $ok3++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok3 + ' / ' + $feeFuncs.Count + ' passed')

# ============================================================
# Test 4: Summary & Notification Functions (6 required)
# ============================================================
Write-Host '[Test 4] Summary & Notification — 6 required'
$summaryFuncs = @(
  'getBillSummary',
  'getBillSummaryAll',
  'getDueDate',
  'saveNotificationSnapshot',
  'getNotificationHistory',
  'createNotificationYearSheet'
)
$ok4 = 0
foreach ($fn in $summaryFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($billing.Contains($search)) { $pass++; $ok4++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok4 + ' / ' + $summaryFuncs.Count + ' passed')

# ============================================================
# Test 5: Private Helper Functions (7 required)
# ============================================================
Write-Host '[Test 5] Private Helpers — 7 required'
$privateFuncs = @(
  '_parsePeriod',
  '_deleteMonthData',
  '_isExempt',
  '_getActiveExemptions',
  '_isExemptFromList',
  '_applyRounding',
  'testBilling'
)
$ok5 = 0
foreach ($fn in $privateFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($billing.Contains($search)) { $pass++; $ok5++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok5 + ' / ' + $privateFuncs.Count + ' passed')

# ============================================================
# Test 6: Schema Headers — 3 header arrays
# ============================================================
Write-Host '[Test 6] Schema Headers — 3 arrays'
$ok6 = 0

$total++
if ($billing.Contains('WATER_YEAR_HEADERS')) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: WATER_YEAR_HEADERS NOT FOUND' }

$total++
if ($billing.Contains('ELECTRIC_YEAR_HEADERS')) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: ELECTRIC_YEAR_HEADERS NOT FOUND' }

$total++
if ($billing.Contains('NOTIFICATIONS_YEAR_HEADERS')) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: NOTIFICATIONS_YEAR_HEADERS NOT FOUND' }

Write-Host ('  ' + $ok6 + ' / 3 passed')

# ============================================================
# Test 7: Water Year Headers — 11 columns
# ============================================================
Write-Host '[Test 7] Water Year Headers — 11 columns'
$waterHeaders = @('id', 'month', 'house_number', 'resident_name', 'prev_meter', 'curr_meter', 'units', 'rate', 'amount', 'saved_at', 'saved_by')
$ok7 = 0
foreach ($h in $waterHeaders) {
  $total++
  if ($billing.Contains("'$h'")) { $pass++; $ok7++ }
  else { $fail++; $errors += ('  FAIL: Water header "' + $h + '" NOT FOUND') }
}
Write-Host ('  ' + $ok7 + ' / ' + $waterHeaders.Count + ' passed')

# ============================================================
# Test 8: Electric Year Headers — 10 columns
# ============================================================
Write-Host '[Test 8] Electric Year Headers — key columns'
$electricHeaders = @('pea_total', 'lost_house', 'lost_flat')
$ok8 = 0
foreach ($h in $electricHeaders) {
  $total++
  if ($billing.Contains("'$h'")) { $pass++; $ok8++ }
  else { $fail++; $errors += ('  FAIL: Electric header "' + $h + '" NOT FOUND') }
}
Write-Host ('  ' + $ok8 + ' / ' + $electricHeaders.Count + ' passed')

# ============================================================
# Test 9: Notifications Year Headers — key columns
# ============================================================
Write-Host '[Test 9] Notification Year Headers — key columns'
$notifHeaders = @('water_amount', 'electric_amount', 'common_fee', 'total_amount', 'is_exempt', 'due_date')
$ok9 = 0
foreach ($h in $notifHeaders) {
  $total++
  if ($billing.Contains("'$h'")) { $pass++; $ok9++ }
  else { $fail++; $errors += ('  FAIL: Notification header "' + $h + '" NOT FOUND') }
}
Write-Host ('  ' + $ok9 + ' / ' + $notifHeaders.Count + ' passed')

# ============================================================
# Test 10: Config.gs references — SPREADSHEET_IDS
# ============================================================
Write-Host '[Test 10] Config references — 6 checks'
$ok10 = 0

$total++
if ($billing.Contains('SPREADSHEET_IDS.WATER')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: SPREADSHEET_IDS.WATER NOT USED' }

$total++
if ($billing.Contains('SPREADSHEET_IDS.ELECTRIC')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: SPREADSHEET_IDS.ELECTRIC NOT USED' }

$total++
if ($billing.Contains('SPREADSHEET_IDS.NOTIFICATIONS')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: SPREADSHEET_IDS.NOTIFICATIONS NOT USED' }

$total++
if ($billing.Contains('SPREADSHEET_IDS.MAIN')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: SPREADSHEET_IDS.MAIN NOT USED' }

$total++
if ($billing.Contains('SHEET_NAMES.WATER_RATES') -or $billing.Contains('SHEET_NAMES.WaterRates')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: SHEET_NAMES.WATER_RATES NOT USED' }

$total++
if ($billing.Contains('SHEET_NAMES.EXEMPTIONS') -or $billing.Contains('SHEET_NAMES.Exemptions')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: SHEET_NAMES.EXEMPTIONS NOT USED' }

Write-Host ('  ' + $ok10 + ' / 6 passed')

# ============================================================
# Test 11: ID_PREFIXES usage
# ============================================================
Write-Host '[Test 11] ID_PREFIXES usage — 5 checks'
$ok11 = 0

$total++
if ($billing.Contains('ID_PREFIXES.WTR')) { $pass++; $ok11++ }
else { $fail++; $errors += '  FAIL: ID_PREFIXES.WTR NOT USED (water)' }

$total++
if ($billing.Contains('ID_PREFIXES.ELC')) { $pass++; $ok11++ }
else { $fail++; $errors += '  FAIL: ID_PREFIXES.ELC NOT USED (electric)' }

$total++
if ($billing.Contains('ID_PREFIXES.RAT')) { $pass++; $ok11++ }
else { $fail++; $errors += '  FAIL: ID_PREFIXES.RAT NOT USED (rate)' }

$total++
if ($billing.Contains('ID_PREFIXES.EXM')) { $pass++; $ok11++ }
else { $fail++; $errors += '  FAIL: ID_PREFIXES.EXM NOT USED (exemption)' }

$total++
if ($billing.Contains('ID_PREFIXES.NTF')) { $pass++; $ok11++ }
else { $fail++; $errors += '  FAIL: ID_PREFIXES.NTF NOT USED (notification)' }

Write-Host ('  ' + $ok11 + ' / 5 passed')

# ============================================================
# Test 12: Database.gs function usage
# ============================================================
Write-Host '[Test 12] Database.gs function usage — 7 checks'
$ok12 = 0

$total++
if ($billing.Contains('readSheetData(')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: readSheetData NOT USED' }

$total++
if ($billing.Contains('appendRowToSheet(')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: appendRowToSheet NOT USED' }

$total++
if ($billing.Contains('updateRowInSheet(')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: updateRowInSheet NOT USED' }

$total++
if ($billing.Contains('deleteRowFromSheet(')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: deleteRowFromSheet NOT USED' }

$total++
if ($billing.Contains('getOrCreateSheet(')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: getOrCreateSheet NOT USED' }

$total++
if ($billing.Contains('batchAppendRows(')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: batchAppendRows NOT USED' }

$total++
if ($billing.Contains('getNextId(')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: getNextId NOT USED' }

Write-Host ('  ' + $ok12 + ' / 7 passed')

# ============================================================
# Test 13: Logging — writeLog usage
# ============================================================
Write-Host '[Test 13] writeLog usage — 5 checks'
$ok13 = 0

$total++
$logWater = "writeLog\('SAVE_WATER_BILL'"
if ($billing -match $logWater) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: writeLog SAVE_WATER_BILL NOT FOUND' }

$total++
$logElectric = "writeLog\('SAVE_ELECTRIC_BILL'"
if ($billing -match $logElectric) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: writeLog SAVE_ELECTRIC_BILL NOT FOUND' }

$total++
$logRate = "writeLog\('UPDATE_WATER_RATE'"
if ($billing -match $logRate) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: writeLog UPDATE_WATER_RATE NOT FOUND' }

$total++
$logExempt = "writeLog\('UPDATE_EXEMPTION'|writeLog\('DELETE_EXEMPTION'"
if ($billing -match $logExempt) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: writeLog EXEMPTION NOT FOUND' }

$total++
if ($billing.Contains("'Billing'")) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: Module name Billing NOT FOUND in writeLog' }

Write-Host ('  ' + $ok13 + ' / 5 passed')

# ============================================================
# Test 14: Cache invalidation
# ============================================================
Write-Host '[Test 14] Cache invalidation — 2 checks'
$ok14 = 0

$total++
if ($billing.Contains('invalidateCache(')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: invalidateCache NOT FOUND' }

$total++
if ($billing.Contains("'waterBills_'") -or $billing.Contains("'electricBills_'")) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: cache key waterBills_ / electricBills_ NOT FOUND' }

Write-Host ('  ' + $ok14 + ' / 2 passed')

# ============================================================
# Test 15: Period validation — _parsePeriod
# ============================================================
Write-Host '[Test 15] Period validation — 4 checks'
$ok15 = 0

$total++
if ($billing.Contains("split('-')")) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: period split by - NOT FOUND' }

$total++
if ($billing.Contains('length !== 2')) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: _parsePeriod split length check NOT FOUND' }

$total++
if ($billing.Contains('month') -and $billing.Contains('year')) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: month/year object return NOT FOUND' }

$total++
if ($billing.Contains('getYearOnlySheetName(')) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: getYearOnlySheetName NOT USED' }

Write-Host ('  ' + $ok15 + ' / 4 passed')

# ============================================================
# Test 16: Water calculation — min charge + rounding
# ============================================================
Write-Host '[Test 16] Water calculation — 4 checks'
$ok16 = 0

$total++
if ($billing.Contains('DEFAULTS.water_min_charge')) { $pass++; $ok16++ }
else { $fail++; $errors += '  FAIL: DEFAULTS.water_min_charge NOT USED' }

$total++
if ($billing.Contains('DEFAULTS.water_rounding')) { $pass++; $ok16++ }
else { $fail++; $errors += '  FAIL: DEFAULTS.water_rounding NOT USED' }

$total++
if ($billing.Contains('DEFAULTS.electric_min_charge')) { $pass++; $ok16++ }
else { $fail++; $errors += '  FAIL: DEFAULTS.electric_min_charge NOT USED' }

$total++
if ($billing.Contains('DEFAULTS.electric_rounding')) { $pass++; $ok16++ }
else { $fail++; $errors += '  FAIL: DEFAULTS.electric_rounding NOT USED' }

Write-Host ('  ' + $ok16 + ' / 4 passed')

# ============================================================
# Test 17: Rounding modes — _applyRounding
# ============================================================
Write-Host '[Test 17] Rounding modes — 3 checks'
$ok17 = 0

$total++
if ($billing.Contains('Math.round(')) { $pass++; $ok17++ }
else { $fail++; $errors += '  FAIL: Math.round NOT FOUND' }

$total++
if ($billing.Contains('Math.ceil(')) { $pass++; $ok17++ }
else { $fail++; $errors += '  FAIL: Math.ceil NOT FOUND' }

$total++
if ($billing.Contains('Math.floor(')) { $pass++; $ok17++ }
else { $fail++; $errors += '  FAIL: Math.floor NOT FOUND' }

Write-Host ('  ' + $ok17 + ' / 3 passed')

# ============================================================
# Test 18: Overwrite logic — _deleteMonthData
# ============================================================
Write-Host '[Test 18] Overwrite logic — 3 checks'
$ok18 = 0

$total++
if ($billing.Contains('_deleteMonthData(')) { $pass++; $ok18++ }
else { $fail++; $errors += '  FAIL: _deleteMonthData NOT CALLED' }

$total++
if ($billing.Contains('deleteRow(')) { $pass++; $ok18++ }
else { $fail++; $errors += '  FAIL: deleteRow NOT FOUND in _deleteMonthData' }

$total++
if ($billing.Contains('withLock(')) { $pass++; $ok18++ }
else { $fail++; $errors += '  FAIL: withLock NOT USED in _deleteMonthData' }

Write-Host ('  ' + $ok18 + ' / 3 passed')

# ============================================================
# Test 19: Bill summary — house/flat common fee
# ============================================================
Write-Host '[Test 19] Bill summary — 4 checks'
$ok19 = 0

$total++
if ($billing.Contains('getCommonFee()')) { $pass++; $ok19++ }
else { $fail++; $errors += '  FAIL: getCommonFee call NOT FOUND in getBillSummary' }

$total++
if ($billing.Contains("type === 'flat'") -or $billing.Contains('type === "flat"')) { $pass++; $ok19++ }
else { $fail++; $errors += '  FAIL: flat type check NOT FOUND in getBillSummary' }

$total++
if ($billing.Contains('_isExempt(') -or $billing.Contains('_isExemptFromList(')) { $pass++; $ok19++ }
else { $fail++; $errors += '  FAIL: exemption check NOT FOUND in getBillSummary' }

$total++
if ($billing.Contains('SHEET_NAMES.HOUSING') -or $billing.Contains('SHEET_NAMES.Housing')) { $pass++; $ok19++ }
else { $fail++; $errors += '  FAIL: SHEET_NAMES.HOUSING NOT USED' }

Write-Host ('  ' + $ok19 + ' / 4 passed')

# ============================================================
# Test 20: Error handling — success: false/true
# ============================================================
Write-Host '[Test 20] Error handling — 4 checks'
$ok20 = 0

$total++
if ($billing.Contains('success: false')) { $pass++; $ok20++ }
else { $fail++; $errors += '  FAIL: success: false NOT FOUND' }

$total++
if ($billing.Contains('success: true')) { $pass++; $ok20++ }
else { $fail++; $errors += '  FAIL: success: true NOT FOUND' }

$total++
$validations = ([regex]::Matches($billing, 'success: false')).Count
if ($validations -ge 5) { $pass++; $ok20++ }
else { $fail++; $errors += ('  FAIL: Only ' + $validations + ' error returns (need >= 5)') }

$total++
$msgPattern = "message:\s*'"
if ($billing -match $msgPattern) { $pass++; $ok20++ }
else { $fail++; $errors += '  FAIL: validation message pattern NOT FOUND' }

Write-Host ('  ' + $ok20 + ' / 4 passed')

# ============================================================
# Test 21: No duplicate functions from other modules
# ============================================================
Write-Host '[Test 21] No duplicate functions — 5 checks'
$ok21 = 0

$total++
if (-not $billing.Contains('function doGet(')) { $pass++; $ok21++ }
else { $fail++; $errors += '  FAIL: Billing.gs contains doGet() — should be in Main.gs' }

$total++
if (-not $billing.Contains('function doPost(')) { $pass++; $ok21++ }
else { $fail++; $errors += '  FAIL: Billing.gs contains doPost() — should be in Main.gs' }

$total++
if (-not $billing.Contains('function readSheetData(')) { $pass++; $ok21++ }
else { $fail++; $errors += '  FAIL: Billing.gs contains readSheetData() — should be in Database.gs' }

$total++
if (-not $billing.Contains('const FOLDER_IDS')) { $pass++; $ok21++ }
else { $fail++; $errors += '  FAIL: Billing.gs contains FOLDER_IDS — should be in Config.gs' }

$total++
if (-not $billing.Contains('const SPREADSHEET_IDS')) { $pass++; $ok21++ }
else { $fail++; $errors += '  FAIL: Billing.gs contains SPREADSHEET_IDS — should be in Config.gs' }

Write-Host ('  ' + $ok21 + ' / 5 passed')

# ============================================================
# Test 22: Documentation
# ============================================================
Write-Host '[Test 22] Documentation — 4 checks'
$ok22 = 0

$total++
if ($billing.Contains('Step: 21') -or $billing.Contains('Step 21')) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: Step 21 NOT FOUND in header' }

$total++
if ($billing.Contains('Dependencies:') -or $billing.Contains('Config.gs, Database.gs')) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: Dependencies note NOT FOUND' }

$total++
if ($billing.Contains('Version: 1.0')) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: Version NOT FOUND' }

$total++
if ($billing.Contains('Payment.gs') -or $billing.Contains('Step 22')) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: Next step reference NOT FOUND' }

Write-Host ('  ' + $ok22 + ' / 4 passed')

# ============================================================
# Test 23: Function count
# ============================================================
Write-Host '[Test 23] Function count check'
$funcMatches = [regex]::Matches($billing, 'function \w+\(')
$total++
$funcCount = $funcMatches.Count
if ($funcCount -ge 28) { $pass++ }
else { $fail++; $errors += ('  FAIL: Only ' + $funcCount + ' functions found (need >= 28)') }
Write-Host ('  Total functions: ' + $funcCount + ' (need >= 28)')

# ============================================================
# Test 24: getBillSummaryAll — batch performance
# ============================================================
Write-Host '[Test 24] getBillSummaryAll batch — 3 checks'
$ok24 = 0

$total++
if ($billing.Contains('getHousingList()')) { $pass++; $ok24++ }
else { $fail++; $errors += '  FAIL: getHousingList call NOT FOUND in getBillSummaryAll' }

$total++
if ($billing.Contains('getResidentsList()')) { $pass++; $ok24++ }
else { $fail++; $errors += '  FAIL: getResidentsList call NOT FOUND in getBillSummaryAll' }

$total++
if ($billing.Contains('_getActiveExemptions()')) { $pass++; $ok24++ }
else { $fail++; $errors += '  FAIL: _getActiveExemptions batch call NOT FOUND' }

Write-Host ('  ' + $ok24 + ' / 3 passed')

# ============================================================
# SUMMARY
# ============================================================
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
  Write-Host '  Billing.gs is complete and matches plan specs!'
} else {
  Write-Host ('  >>> ' + $fail + ' TESTS FAILED <<<')
}
Write-Host '========================================================'
