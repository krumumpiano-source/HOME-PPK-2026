$request = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Request.gs' -Raw -Encoding UTF8
$config = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Config.gs' -Raw -Encoding UTF8
$db = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Database.gs' -Raw -Encoding UTF8
$main = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Main.gs' -Raw -Encoding UTF8
$pass = 0; $fail = 0; $total = 0
$errors = @()

Write-Host ''
Write-Host '========================================================'
Write-Host '   TEST Request.gs — Requests (4 types) & Queue System'
Write-Host '========================================================'
Write-Host ''

# ============================================================
# Test 1: Core Request Functions (5 required)
# ============================================================
Write-Host '[Test 1] Core Request Functions — 5 required'
$reqFuncs = @(
  'handleSubmitRequest',
  'getRequests',
  'getRequestDetail',
  'handleReviewRequest',
  'createRequestYearSheet'
)
$ok1 = 0
foreach ($fn in $reqFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($request.Contains($search)) { $pass++; $ok1++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok1 + ' / ' + $reqFuncs.Count + ' passed')

# ============================================================
# Test 2: Queue Functions (7 required)
# ============================================================
Write-Host '[Test 2] Queue Functions — 7 required'
$queueFuncs = @(
  'getQueue',
  'addToQueue',
  'removeFromQueue',
  'handleUpdateQueue',
  'approveFromQueue',
  'setQueueExpiryDate',
  'checkAndExpireQueue'
)
$ok2 = 0
foreach ($fn in $queueFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($request.Contains($search)) { $pass++; $ok2++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok2 + ' / ' + $queueFuncs.Count + ' passed')

# ============================================================
# Test 3: Attachment Function (1 required)
# ============================================================
Write-Host '[Test 3] Attachment Function — 1 required'
$ok3 = 0
$total++
if ($request.Contains('function saveRequestAttachments(')) { $pass++; $ok3++ }
else { $fail++; $errors += '  FAIL: function saveRequestAttachments() NOT FOUND' }
Write-Host ('  ' + $ok3 + ' / 1 passed')

# ============================================================
# Test 4: Private Helper (1 required)
# ============================================================
Write-Host '[Test 4] Private Helper — 1 required'
$ok4 = 0
$total++
if ($request.Contains('function _getYearFromDate(')) { $pass++; $ok4++ }
else { $fail++; $errors += '  FAIL: function _getYearFromDate() NOT FOUND' }
Write-Host ('  ' + $ok4 + ' / 1 passed')

# ============================================================
# Test 5: Schema Headers — 5 header arrays
# ============================================================
Write-Host '[Test 5] Schema Headers — 5 arrays'
$ok5 = 0

$total++
if ($request.Contains('RESIDENCE_REQUEST_HEADERS')) { $pass++; $ok5++ }
else { $fail++; $errors += '  FAIL: RESIDENCE_REQUEST_HEADERS NOT FOUND' }

$total++
if ($request.Contains('TRANSFER_REQUEST_HEADERS')) { $pass++; $ok5++ }
else { $fail++; $errors += '  FAIL: TRANSFER_REQUEST_HEADERS NOT FOUND' }

$total++
if ($request.Contains('RETURN_REQUEST_HEADERS')) { $pass++; $ok5++ }
else { $fail++; $errors += '  FAIL: RETURN_REQUEST_HEADERS NOT FOUND' }

$total++
if ($request.Contains('REPAIR_REQUEST_HEADERS')) { $pass++; $ok5++ }
else { $fail++; $errors += '  FAIL: REPAIR_REQUEST_HEADERS NOT FOUND' }

$total++
if ($request.Contains('QUEUE_HEADERS')) { $pass++; $ok5++ }
else { $fail++; $errors += '  FAIL: QUEUE_HEADERS NOT FOUND' }

Write-Host ('  ' + $ok5 + ' / 5 passed')

# ============================================================
# Test 6: REQUEST_TYPE_MAP — 4 types
# ============================================================
Write-Host '[Test 6] REQUEST_TYPE_MAP — 4 types'
$ok6 = 0

$total++
if ($request.Contains('REQUEST_TYPE_MAP')) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: REQUEST_TYPE_MAP NOT FOUND' }

$total++
if ($request.Contains("'residence'") -and $request.Contains("'Residence'")) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: residence type mapping NOT FOUND' }

$total++
if ($request.Contains("'transfer'") -and $request.Contains("'Transfer'")) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: transfer type mapping NOT FOUND' }

$total++
if ($request.Contains("'return'") -and $request.Contains("'Return'")) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: return type mapping NOT FOUND' }

$total++
if ($request.Contains("'repair'") -and $request.Contains("'Repair'")) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: repair type mapping NOT FOUND' }

Write-Host ('  ' + $ok6 + ' / 5 passed')

# ============================================================
# Test 7: Residence request — key columns
# ============================================================
Write-Host '[Test 7] Residence request headers — key columns'
$resHeaders = @('stay_type', 'queue_position', 'expiry_date', 'assigned_house', 'subject_group', 'user_id')
$ok7 = 0
foreach ($h in $resHeaders) {
  $total++
  if ($request.Contains("'$h'")) { $pass++; $ok7++ }
  else { $fail++; $errors += ('  FAIL: Residence header "' + $h + '" NOT FOUND') }
}
Write-Host ('  ' + $ok7 + ' / ' + $resHeaders.Count + ' passed')

# ============================================================
# Test 8: Transfer request — key columns
# ============================================================
Write-Host '[Test 8] Transfer request headers — key columns'
$trfHeaders = @('current_house', 'transfer_type', 'preferred_house')
$ok8 = 0
foreach ($h in $trfHeaders) {
  $total++
  if ($request.Contains("'$h'")) { $pass++; $ok8++ }
  else { $fail++; $errors += ('  FAIL: Transfer header "' + $h + '" NOT FOUND') }
}
Write-Host ('  ' + $ok8 + ' / ' + $trfHeaders.Count + ' passed')

# ============================================================
# Test 9: Return request — key columns
# ============================================================
Write-Host '[Test 9] Return request headers — key columns'
$rtnHeaders = @('return_date')
$ok9 = 0
foreach ($h in $rtnHeaders) {
  $total++
  if ($request.Contains("'$h'")) { $pass++; $ok9++ }
  else { $fail++; $errors += ('  FAIL: Return header "' + $h + '" NOT FOUND') }
}
Write-Host ('  ' + $ok9 + ' / ' + $rtnHeaders.Count + ' passed')

# ============================================================
# Test 10: Repair request — key columns
# ============================================================
Write-Host '[Test 10] Repair request headers — key columns'
$rprHeaders = @('repair_detail', 'urgency', 'cost_responsibility')
$ok10 = 0
foreach ($h in $rprHeaders) {
  $total++
  if ($request.Contains("'$h'")) { $pass++; $ok10++ }
  else { $fail++; $errors += ('  FAIL: Repair header "' + $h + '" NOT FOUND') }
}
Write-Host ('  ' + $ok10 + ' / ' + $rprHeaders.Count + ' passed')

# ============================================================
# Test 11: Queue headers — key columns
# ============================================================
Write-Host '[Test 11] Queue headers — key columns'
$queueHeaders = @('request_id', 'request_year', 'queue_position', 'added_at', 'approved_at')
$ok11 = 0
foreach ($h in $queueHeaders) {
  $total++
  if ($request.Contains("'$h'")) { $pass++; $ok11++ }
  else { $fail++; $errors += ('  FAIL: Queue header "' + $h + '" NOT FOUND') }
}
Write-Host ('  ' + $ok11 + ' / ' + $queueHeaders.Count + ' passed')

# ============================================================
# Test 12: Status flow — pending → reviewing → waiting → approved → completed
# ============================================================
Write-Host '[Test 12] Status flow — 6 checks'
$ok12 = 0

$total++
if ($request.Contains("'pending'")) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: status pending NOT FOUND' }

$total++
if ($request.Contains("'approved'")) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: status approved NOT FOUND' }

$total++
if ($request.Contains('rejected') -or $request.Contains('reject')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: status rejected NOT FOUND' }

$total++
if ($request.Contains("'waiting'")) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: status waiting NOT FOUND' }

$total++
if ($request.Contains("'completed'")) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: status completed NOT FOUND' }

$total++
if ($request.Contains("'expired'")) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: status expired NOT FOUND' }

Write-Host ('  ' + $ok12 + ' / 6 passed')

# ============================================================
# Test 13: Config.gs references
# ============================================================
Write-Host '[Test 13] Config references — 6 checks'
$ok13 = 0

$total++
if ($request.Contains('SPREADSHEET_IDS.REQUESTS')) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: SPREADSHEET_IDS.REQUESTS NOT USED' }

$total++
if ($request.Contains('SPREADSHEET_IDS.MAIN')) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: SPREADSHEET_IDS.MAIN NOT USED' }

$total++
if ($request.Contains('CURRENT_YEAR')) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: CURRENT_YEAR NOT USED' }

$total++
if ($request.Contains('ID_PREFIXES.REQ')) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: ID_PREFIXES.REQ NOT USED' }

$total++
if ($request.Contains('ID_PREFIXES.TRF')) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: ID_PREFIXES.TRF NOT USED' }

$total++
if ($request.Contains('ID_PREFIXES.QUE')) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: ID_PREFIXES.QUE NOT USED' }

Write-Host ('  ' + $ok13 + ' / 6 passed')

# ============================================================
# Test 14: ID_PREFIXES for all 4 types + queue
# ============================================================
Write-Host '[Test 14] ID_PREFIXES all types — 4 checks'
$ok14 = 0

$total++
if ($request.Contains('ID_PREFIXES.RTN')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: ID_PREFIXES.RTN NOT USED (return)' }

$total++
if ($request.Contains('ID_PREFIXES.RPR')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: ID_PREFIXES.RPR NOT USED (repair)' }

$total++
if ($request.Contains('SHEET_NAMES.QUEUE') -or $request.Contains('SHEET_NAMES.Queue')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: SHEET_NAMES.QUEUE NOT USED' }

$total++
if ($request.Contains('SHEET_NAMES.HOUSING') -or $request.Contains('SHEET_NAMES.Housing')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: SHEET_NAMES.HOUSING NOT USED' }

Write-Host ('  ' + $ok14 + ' / 4 passed')

# ============================================================
# Test 15: Review request — switch by type
# ============================================================
Write-Host '[Test 15] handleReviewRequest — type switch — 4 checks'
$ok15 = 0

$total++
# Residence: approved → assign house or queue
$resApprove = "case 'residence'"
if ($request.Contains($resApprove)) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: case residence NOT FOUND in handleReviewRequest' }

$total++
# Transfer: moveResident
$trnApprove = "case 'transfer'"
if ($request.Contains($trnApprove)) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: case transfer NOT FOUND in handleReviewRequest' }

$total++
# Return: set available + remove resident
$rtnApprove = "case 'return'"
if ($request.Contains($rtnApprove)) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: case return NOT FOUND in handleReviewRequest' }

$total++
# Repair: simple complete
$rprApprove = "case 'repair'"
if ($request.Contains($rprApprove)) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: case repair NOT FOUND in handleReviewRequest' }

Write-Host ('  ' + $ok15 + ' / 4 passed')

# ============================================================
# Test 16: Housing integration on approve
# ============================================================
Write-Host '[Test 16] Housing integration — 5 checks'
$ok16 = 0

$total++
# Residence approved → Housing status → occupied
if ($request.Contains("'occupied'")) { $pass++; $ok16++ }
else { $fail++; $errors += '  FAIL: status occupied NOT FOUND (housing update)' }

$total++
# Return approved → Housing status → available
if ($request.Contains("'available'")) { $pass++; $ok16++ }
else { $fail++; $errors += '  FAIL: status available NOT FOUND (housing return)' }

$total++
# Transfer → moveResident
if ($request.Contains('moveResident(')) { $pass++; $ok16++ }
else { $fail++; $errors += '  FAIL: moveResident NOT CALLED (transfer)' }

$total++
# Return → removeResident
if ($request.Contains('removeResident(')) { $pass++; $ok16++ }
else { $fail++; $errors += '  FAIL: removeResident NOT CALLED (return)' }

$total++
# Queue → addToQueue on no house available
if ($request.Contains('addToQueue(')) { $pass++; $ok16++ }
else { $fail++; $errors += '  FAIL: addToQueue NOT CALLED when no house available' }

Write-Host ('  ' + $ok16 + ' / 5 passed')

# ============================================================
# Test 17: Queue expiry — checkAndExpireQueue
# ============================================================
Write-Host '[Test 17] Queue expiry — 3 checks'
$ok17 = 0

$total++
# Compares expiry_date with now
$expiryPattern = 'expiry_date.*<.*now|expiry_date.*now'
if ($request -match $expiryPattern) { $pass++; $ok17++ }
else { $fail++; $errors += '  FAIL: Queue expiry date comparison NOT FOUND' }

$total++
# Syncs back to Residence_{year}
if ($request.Contains("getYearSheetName('Residence'") -or $request.Contains('getYearSheetName("Residence"')) { $pass++; $ok17++ }
else { $fail++; $errors += '  FAIL: Queue to Residence sync NOT FOUND' }

$total++
$queueExpireLog = "writeLog\('QUEUE_EXPIRE'"
if ($request -match $queueExpireLog) { $pass++; $ok17++ }
else { $fail++; $errors += '  FAIL: writeLog QUEUE_EXPIRE NOT FOUND' }

Write-Host ('  ' + $ok17 + ' / 3 passed')

# ============================================================
# Test 18: Attachment — Drive integration
# ============================================================
Write-Host '[Test 18] Attachment Drive integration — 4 checks'
$ok18 = 0

$total++
if ($request.Contains('DriveApp.getFolderById(')) { $pass++; $ok18++ }
else { $fail++; $errors += '  FAIL: DriveApp.getFolderById NOT FOUND' }

$total++
if ($request.Contains('getRequestFolderId(')) { $pass++; $ok18++ }
else { $fail++; $errors += '  FAIL: getRequestFolderId NOT USED' }

$total++
if ($request.Contains('base64Decode') -or $request.Contains('Utilities.base64Decode')) { $pass++; $ok18++ }
else { $fail++; $errors += '  FAIL: base64Decode NOT FOUND for attachments' }

$total++
if ($request.Contains('attachment_file_ids')) { $pass++; $ok18++ }
else { $fail++; $errors += '  FAIL: attachment_file_ids field NOT FOUND' }

Write-Host ('  ' + $ok18 + ' / 4 passed')

# ============================================================
# Test 19: Database.gs function usage
# ============================================================
Write-Host '[Test 19] Database.gs function usage — 5 checks'
$ok19 = 0

$total++
if ($request.Contains('readSheetData(')) { $pass++; $ok19++ }
else { $fail++; $errors += '  FAIL: readSheetData NOT USED' }

$total++
if ($request.Contains('appendRowToSheet(')) { $pass++; $ok19++ }
else { $fail++; $errors += '  FAIL: appendRowToSheet NOT USED' }

$total++
if ($request.Contains('updateRowInSheet(')) { $pass++; $ok19++ }
else { $fail++; $errors += '  FAIL: updateRowInSheet NOT USED' }

$total++
if ($request.Contains('findRowByValue(')) { $pass++; $ok19++ }
else { $fail++; $errors += '  FAIL: findRowByValue NOT USED' }

$total++
if ($request.Contains('getOrCreateSheet(')) { $pass++; $ok19++ }
else { $fail++; $errors += '  FAIL: getOrCreateSheet NOT USED' }

Write-Host ('  ' + $ok19 + ' / 5 passed')

# ============================================================
# Test 20: Logging — writeLog usage
# ============================================================
Write-Host '[Test 20] writeLog usage — 4 checks'
$ok20 = 0

$total++
$logSubmit = "writeLog\('SUBMIT_REQUEST'"
if ($request -match $logSubmit) { $pass++; $ok20++ }
else { $fail++; $errors += '  FAIL: writeLog SUBMIT_REQUEST NOT FOUND' }

$total++
$logReview = "writeLog\('REVIEW_REQUEST'"
if ($request -match $logReview) { $pass++; $ok20++ }
else { $fail++; $errors += '  FAIL: writeLog REVIEW_REQUEST NOT FOUND' }

$total++
$logQueue = "writeLog\('ADD_TO_QUEUE'|writeLog\('QUEUE_"
if ($request -match $logQueue) { $pass++; $ok20++ }
else { $fail++; $errors += '  FAIL: writeLog Queue action NOT FOUND' }

$total++
if ($request.Contains("'Request'")) { $pass++; $ok20++ }
else { $fail++; $errors += '  FAIL: Module name Request NOT FOUND in writeLog' }

Write-Host ('  ' + $ok20 + ' / 4 passed')

# ============================================================
# Test 21: Cache invalidation
# ============================================================
Write-Host '[Test 21] Cache invalidation — 1 check'
$ok21 = 0

$total++
if ($request.Contains('invalidateCache(')) { $pass++; $ok21++ }
else { $fail++; $errors += '  FAIL: invalidateCache NOT FOUND in Request.gs' }

Write-Host ('  ' + $ok21 + ' / 1 passed')

# ============================================================
# Test 22: No duplicate functions
# ============================================================
Write-Host '[Test 22] No duplicate functions — 4 checks'
$ok22 = 0

$total++
if (-not $request.Contains('function doGet(')) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: Request.gs contains doGet()' }

$total++
if (-not $request.Contains('function doPost(')) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: Request.gs contains doPost()' }

$total++
if (-not $request.Contains('const FOLDER_IDS')) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: Request.gs contains FOLDER_IDS' }

$total++
if (-not $request.Contains('const SPREADSHEET_IDS')) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: Request.gs contains SPREADSHEET_IDS' }

Write-Host ('  ' + $ok22 + ' / 4 passed')

# ============================================================
# Test 23: Documentation
# ============================================================
Write-Host '[Test 23] Documentation — 4 checks'
$ok23 = 0

$total++
if ($request.Contains('Step: 23') -or $request.Contains('Step 23')) { $pass++; $ok23++ }
else { $fail++; $errors += '  FAIL: Step 23 NOT FOUND in header' }

$total++
if ($request.Contains('Dependencies:') -or $request.Contains('Config.gs, Database.gs')) { $pass++; $ok23++ }
else { $fail++; $errors += '  FAIL: Dependencies note NOT FOUND' }

$total++
if ($request.Contains('Version: 1.0')) { $pass++; $ok23++ }
else { $fail++; $errors += '  FAIL: Version NOT FOUND' }

$total++
if ($request.Contains('Finance.gs') -or $request.Contains('Step 24')) { $pass++; $ok23++ }
else { $fail++; $errors += '  FAIL: Next step reference NOT FOUND' }

Write-Host ('  ' + $ok23 + ' / 4 passed')

# ============================================================
# Test 24: Function count
# ============================================================
Write-Host '[Test 24] Function count check'
$funcMatches = [regex]::Matches($request, 'function \w+\(')
$total++
$funcCount = $funcMatches.Count
if ($funcCount -ge 14) { $pass++ }
else { $fail++; $errors += ('  FAIL: Only ' + $funcCount + ' functions found (need >= 14)') }
Write-Host ('  Total functions: ' + $funcCount + ' (need >= 14)')

# ============================================================
# Test 25: Error handling
# ============================================================
Write-Host '[Test 25] Error handling — 3 checks'
$ok25 = 0

$total++
if ($request.Contains('success: false')) { $pass++; $ok25++ }
else { $fail++; $errors += '  FAIL: success: false NOT FOUND' }

$total++
if ($request.Contains('success: true')) { $pass++; $ok25++ }
else { $fail++; $errors += '  FAIL: success: true NOT FOUND' }

$total++
$validations = ([regex]::Matches($request, 'success: false')).Count
if ($validations -ge 5) { $pass++; $ok25++ }
else { $fail++; $errors += ('  FAIL: Only ' + $validations + ' error returns (need >= 5)') }

Write-Host ('  ' + $ok25 + ' / 3 passed')

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
  Write-Host '  Request.gs is complete and matches plan specs!'
} else {
  Write-Host ('  >>> ' + $fail + ' TESTS FAILED <<<')
}
Write-Host '========================================================'
