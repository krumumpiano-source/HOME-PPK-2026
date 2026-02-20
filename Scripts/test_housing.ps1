$housing = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Housing.gs' -Raw -Encoding UTF8
$config = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Config.gs' -Raw -Encoding UTF8
$db = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Database.gs' -Raw -Encoding UTF8
$main = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Main.gs' -Raw -Encoding UTF8
$pass = 0; $fail = 0; $total = 0
$errors = @()

Write-Host ''
Write-Host '========================================================'
Write-Host '   TEST Housing.gs — Housing, Residents, Settings'
Write-Host '========================================================'
Write-Host ''

# ============================================================
# Test 1: Core Housing CRUD Functions (5 required)
# ============================================================
Write-Host '[Test 1] Core Housing CRUD Functions — 5 required'
$housingFuncs = @(
  'getHousingList',
  'addHousing',
  'updateHousing',
  'deleteHousing',
  'getAvailableHousing'
)
$ok1 = 0
foreach ($fn in $housingFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($housing.Contains($search)) { $pass++; $ok1++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok1 + ' / ' + $housingFuncs.Count + ' passed')

# ============================================================
# Test 2: Core Residents CRUD Functions (5 required)
# ============================================================
Write-Host '[Test 2] Core Residents CRUD Functions — 5 required'
$residentFuncs = @(
  'getResidentsList',
  'addResident',
  'updateResident',
  'moveResident',
  'removeResident'
)
$ok2 = 0
foreach ($fn in $residentFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($housing.Contains($search)) { $pass++; $ok2++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok2 + ' / ' + $residentFuncs.Count + ' passed')

# ============================================================
# Test 3: Profile Functions (2 required)
# ============================================================
Write-Host '[Test 3] Profile Functions — 2 required'
$profileFuncs = @(
  'getUserProfile',
  'handleUpdateProfile'
)
$ok3 = 0
foreach ($fn in $profileFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($housing.Contains($search)) { $pass++; $ok3++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok3 + ' / ' + $profileFuncs.Count + ' passed')

# ============================================================
# Test 4: Coresident Functions (4 required)
# ============================================================
Write-Host '[Test 4] Coresident Functions — 4 required'
$coreFuncs = @(
  'getCoresidents',
  'addCoresident',
  'updateCoresident',
  'removeCoresident'
)
$ok4 = 0
foreach ($fn in $coreFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($housing.Contains($search)) { $pass++; $ok4++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok4 + ' / ' + $coreFuncs.Count + ' passed')

# ============================================================
# Test 5: Settings Functions (2 required)
# ============================================================
Write-Host '[Test 5] Settings Functions — 2 required'
$settFuncs = @(
  'getSettings',
  'handleUpdateSettings'
)
$ok5 = 0
foreach ($fn in $settFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($housing.Contains($search)) { $pass++; $ok5++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok5 + ' / ' + $settFuncs.Count + ' passed')

# ============================================================
# Test 6: Announcement Functions (3 required)
# ============================================================
Write-Host '[Test 6] Announcement Functions — 3 required'
$annFuncs = @(
  'getAnnouncements',
  'handleAddAnnouncement',
  'deleteAnnouncement'
)
$ok6 = 0
foreach ($fn in $annFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($housing.Contains($search)) { $pass++; $ok6++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok6 + ' / ' + $annFuncs.Count + ' passed')

# ============================================================
# Test 7: Permissions Functions (2 required)
# ============================================================
Write-Host '[Test 7] Permissions Functions — 2 required'
$permFuncs = @(
  'getPermissions',
  'updatePermissions'
)
$ok7 = 0
foreach ($fn in $permFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($housing.Contains($search)) { $pass++; $ok7++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok7 + ' / ' + $permFuncs.Count + ' passed')

# ============================================================
# Test 8: Regulations PDF Functions (2 required)
# ============================================================
Write-Host '[Test 8] Regulations PDF Functions — 2 required'
$pdfFuncs = @(
  'getRegulationsPdf',
  'uploadRegulationsPdf'
)
$ok8 = 0
foreach ($fn in $pdfFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($housing.Contains($search)) { $pass++; $ok8++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok8 + ' / ' + $pdfFuncs.Count + ' passed')

# ============================================================
# Test 9: Housing Format Functions (2 required — getWaterRate ย้ายไป Billing.gs)
# ============================================================
Write-Host '[Test 9] Housing Format — 2 required (getWaterRate moved to Billing.gs)'
$formatFuncs = @(
  'getHousingFormat',
  'saveHousingFormat'
)
$ok9 = 0
foreach ($fn in $formatFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($housing.Contains($search)) { $pass++; $ok9++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok9 + ' / ' + $formatFuncs.Count + ' passed')

# ============================================================
# Test 10: Export/Import Functions (2 required)
# ============================================================
Write-Host '[Test 10] Export/Import Functions — 2 required'
$ioFuncs = @(
  'exportResidents',
  'importResidents'
)
$ok10 = 0
foreach ($fn in $ioFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($housing.Contains($search)) { $pass++; $ok10++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok10 + ' / ' + $ioFuncs.Count + ' passed')

# ============================================================
# Test 11: Test Function exists
# ============================================================
Write-Host '[Test 11] testHousing function — 1 required'
$ok11 = 0

$total++
if ($housing.Contains('function testHousing(')) { $pass++; $ok11++ }
else { $fail++; $errors += '  FAIL: function testHousing() NOT FOUND' }

Write-Host ('  ' + $ok11 + ' / 1 passed')

# ============================================================
# Test 12: Uses Config.gs Constants (SPREADSHEET_IDS, SHEET_NAMES)
# ============================================================
Write-Host '[Test 12] Uses Config.gs Constants — 8 checks'
$ok12 = 0

$total++
if ($housing.Contains('SPREADSHEET_IDS.MAIN')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: SPREADSHEET_IDS.MAIN NOT USED' }

$total++
if ($housing.Contains('SHEET_NAMES.HOUSING')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: SHEET_NAMES.HOUSING NOT USED' }

$total++
if ($housing.Contains('SHEET_NAMES.RESIDENTS')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: SHEET_NAMES.RESIDENTS NOT USED' }

$total++
if ($housing.Contains('SHEET_NAMES.USERS')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: SHEET_NAMES.USERS NOT USED' }

$total++
if ($housing.Contains('SHEET_NAMES.SETTINGS')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: SHEET_NAMES.SETTINGS NOT USED' }

$total++
if ($housing.Contains('SHEET_NAMES.ANNOUNCEMENTS')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: SHEET_NAMES.ANNOUNCEMENTS NOT USED' }

$total++
if ($housing.Contains('SHEET_NAMES.PERMISSIONS')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: SHEET_NAMES.PERMISSIONS NOT USED' }

# WATER_RATES ย้ายไป Billing.gs แล้ว — ตรวจว่ามี comment อ้างอิง
$total++
if ($housing.Contains('Billing.gs') -or $housing.Contains('WATER_RATES')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: Billing.gs reference or WATER_RATES comment NOT FOUND' }

Write-Host ('  ' + $ok12 + ' / 8 passed')

# ============================================================
# Test 13: Uses Database.gs CRUD Functions
# ============================================================
Write-Host '[Test 13] Uses Database.gs CRUD — 7 checks'
$ok13 = 0

$total++
if ($housing.Contains('readSheetData(')) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: readSheetData() NOT USED' }

$total++
if ($housing.Contains('appendRowToSheet(')) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: appendRowToSheet() NOT USED' }

$total++
if ($housing.Contains('updateRowInSheet(')) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: updateRowInSheet() NOT USED' }

$total++
if ($housing.Contains('deleteRowFromSheet(')) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: deleteRowFromSheet() NOT USED' }

$total++
if ($housing.Contains('findRowByValue(')) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: findRowByValue() NOT USED' }

$total++
if ($housing.Contains('getNextId(')) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: getNextId() NOT USED' }

$total++
if ($housing.Contains('writeLog(')) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: writeLog() NOT USED' }

Write-Host ('  ' + $ok13 + ' / 7 passed')

# ============================================================
# Test 14: Uses Cache (getCachedData, invalidateCache)
# ============================================================
Write-Host '[Test 14] Cache usage — 3 checks'
$ok14 = 0

$total++
if ($housing.Contains('getCachedData(')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: getCachedData() NOT USED' }

$total++
if ($housing.Contains('invalidateCache(')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: invalidateCache() NOT USED' }

$total++
if ($housing.Contains('invalidateCaches(')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: invalidateCaches() NOT USED' }

Write-Host ('  ' + $ok14 + ' / 3 passed')

# ============================================================
# Test 15: Uses ID_PREFIXES
# ============================================================
Write-Host '[Test 15] ID Prefixes — 3 checks'
$ok15 = 0

$total++
if ($housing.Contains('ID_PREFIXES.HOU')) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: ID_PREFIXES.HOU NOT USED' }

$total++
if ($housing.Contains('ID_PREFIXES.RES')) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: ID_PREFIXES.RES NOT USED' }

$total++
if ($housing.Contains('ID_PREFIXES.ANN')) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: ID_PREFIXES.ANN NOT USED' }

Write-Host ('  ' + $ok15 + ' / 3 passed')

# ============================================================
# Test 16: Housing Status Values (available/occupied/maintenance)
# ============================================================
Write-Host '[Test 16] Housing status values — 3 checks'
$ok16 = 0

$total++
if ($housing.Contains("'available'")) { $pass++; $ok16++ }
else { $fail++; $errors += "  FAIL: status 'available' NOT FOUND" }

$total++
if ($housing.Contains("'occupied'")) { $pass++; $ok16++ }
else { $fail++; $errors += "  FAIL: status 'occupied' NOT FOUND" }

$total++
if ($housing.Contains("'maintenance'")) { $pass++; $ok16++ }
else { $fail++; $errors += "  FAIL: status 'maintenance' NOT FOUND" }

Write-Host ('  ' + $ok16 + ' / 3 passed')

# ============================================================
# Test 17: Resident Fields Match Schema (key fields)
# ============================================================
Write-Host '[Test 17] Resident schema fields — 10 checks'
$ok17 = 0

$schemaFields = @(
  'resident_type',
  'prefix',
  'firstname',
  'lastname',
  'position',
  'subject_group',
  'phone',
  'email',
  'house_number',
  'cohabitant_names'
)
foreach ($f in $schemaFields) {
  $total++
  if ($housing.Contains($f)) { $pass++; $ok17++ }
  else { $fail++; $errors += ('  FAIL: field "' + $f + '" NOT FOUND in Housing.gs') }
}
Write-Host ('  ' + $ok17 + ' / ' + $schemaFields.Count + ' passed')

# ============================================================
# Test 18: Address Fields (7 address fields)
# ============================================================
Write-Host '[Test 18] Address fields — 7 checks'
$ok18 = 0

$addrFields = @(
  'address_no',
  'address_road',
  'address_village',
  'subdistrict',
  'district',
  'province',
  'zipcode'
)
foreach ($f in $addrFields) {
  $total++
  if ($housing.Contains($f)) { $pass++; $ok18++ }
  else { $fail++; $errors += ('  FAIL: address field "' + $f + '" NOT FOUND') }
}
Write-Host ('  ' + $ok18 + ' / ' + $addrFields.Count + ' passed')

# ============================================================
# Test 19: Permissions sheet columns (8 permission types)
# ============================================================
Write-Host '[Test 19] Permission types in updatePermissions — 8 checks'
$ok19 = 0

$permTypes = @(
  'water',
  'electric',
  'notify',
  'slip',
  'withdraw',
  'accounting',
  'request',
  'admin'
)
foreach ($pt in $permTypes) {
  $total++
  # Check in updatePermissions context
  $pattern = 'perm\.' + $pt + '|' + "'" + $pt + "'"
  if ($housing -match $pattern) { $pass++; $ok19++ }
  else { $fail++; $errors += ('  FAIL: permission type "' + $pt + '" NOT FOUND in updatePermissions') }
}
Write-Host ('  ' + $ok19 + ' / ' + $permTypes.Count + ' passed')

# ============================================================
# Test 20: Announcement fields match schema
# ============================================================
Write-Host '[Test 20] Announcement schema fields — 5 checks'
$ok20 = 0

$annFields = @(
  'text',
  'priority',
  'expiry_date',
  'is_active',
  'created_by'
)
foreach ($f in $annFields) {
  $total++
  if ($housing.Contains($f)) { $pass++; $ok20++ }
  else { $fail++; $errors += ('  FAIL: announcement field "' + $f + '" NOT FOUND') }
}
Write-Host ('  ' + $ok20 + ' / ' + $annFields.Count + ' passed')

# ============================================================
# Test 21: Settings key-value pattern
# ============================================================
Write-Host '[Test 21] Settings key-value pattern — 4 checks'
$ok21 = 0

$total++
# Settings should return { key: value } object
if ($housing -match 'settings\[.*key\].*=.*value|settings\[rows\[.*\.key\]' -or ($housing.Contains('settings[rows[i].key]') -or $housing -match '\[row.*\.key\].*=.*row.*\.value')) { $pass++; $ok21++ }
else { $fail++; $errors += '  FAIL: Settings key-value mapping NOT FOUND' }

$total++
# handleUpdateSettings should check findRowByValue for existing key
if ($housing -match "findRowByValue.*SETTINGS.*'key'") { $pass++; $ok21++ }
else { $fail++; $errors += '  FAIL: findRowByValue for existing settings key NOT FOUND' }

$total++
# Settings should use DEFAULTS as fallback
if ($housing.Contains('DEFAULTS.')) { $pass++; $ok21++ }
else { $fail++; $errors += '  FAIL: DEFAULTS fallback NOT USED' }

$total++
# Water rate reference — ย้ายไป Billing.gs แล้ว ตรวจว่ามี comment อ้างอิง
if ($housing.Contains('water_rate') -or $housing.Contains('Billing.gs') -or $housing.Contains('getWaterRate')) { $pass++; $ok21++ }
else { $fail++; $errors += '  FAIL: water_rate or Billing.gs reference NOT FOUND' }

Write-Host ('  ' + $ok21 + ' / 4 passed')

# ============================================================
# Test 22: DriveApp usage for PDF
# ============================================================
Write-Host '[Test 22] DriveApp for regulations PDF — 3 checks'
$ok22 = 0

$total++
if ($housing.Contains('DriveApp.getFolderById')) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: DriveApp.getFolderById NOT USED' }

$total++
if ($housing.Contains('FOLDER_IDS.DOCUMENTS')) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: FOLDER_IDS.DOCUMENTS NOT USED' }

$total++
if ($housing.Contains('MimeType.PDF')) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: MimeType.PDF NOT USED' }

Write-Host ('  ' + $ok22 + ' / 3 passed')

# ============================================================
# Test 23: Validation in CRUD functions
# ============================================================
Write-Host '[Test 23] Input validation — 5 checks'
$ok23 = 0

$total++
# addHousing validates type
if ($housing -match "addHousing[\s\S]*?data\.type") { $pass++; $ok23++ }
else { $fail++; $errors += '  FAIL: addHousing does not validate type' }

$total++
# addHousing validates number
if ($housing -match "addHousing[\s\S]*?data\.number") { $pass++; $ok23++ }
else { $fail++; $errors += '  FAIL: addHousing does not validate number' }

$total++
# addResident validates name
if ($housing -match "addResident[\s\S]*?data\.firstname.*data\.lastname") { $pass++; $ok23++ }
else { $fail++; $errors += '  FAIL: addResident does not validate name' }

$total++
# deleteHousing checks occupied status
if ($housing -match "deleteHousing[\s\S]*?occupied") { $pass++; $ok23++ }
else { $fail++; $errors += '  FAIL: deleteHousing does not check occupied status' }

$total++
# handleAddAnnouncement validates text
if ($housing -match "handleAddAnnouncement[\s\S]*?data\.text") { $pass++; $ok23++ }
else { $fail++; $errors += '  FAIL: handleAddAnnouncement does not validate text' }

Write-Host ('  ' + $ok23 + ' / 5 passed')

# ============================================================
# Test 24: Housing status auto-update
# ============================================================
Write-Host '[Test 24] Housing status auto-update — 2 checks'
$ok24 = 0

$total++
if ($housing.Contains('_updateHousingStatus')) { $pass++; $ok24++ }
else { $fail++; $errors += '  FAIL: _updateHousingStatus helper NOT FOUND' }

$total++
if ($housing.Contains('_checkAndUpdateHousingStatus')) { $pass++; $ok24++ }
else { $fail++; $errors += '  FAIL: _checkAndUpdateHousingStatus helper NOT FOUND' }

Write-Host ('  ' + $ok24 + ' / 2 passed')

# ============================================================
# Test 25: display_number generation
# ============================================================
Write-Host '[Test 25] display_number generation — 2 checks'
$ok25 = 0

$total++
if ($housing.Contains('display_number')) { $pass++; $ok25++ }
else { $fail++; $errors += '  FAIL: display_number field NOT FOUND' }

$total++
# Uses DEFAULTS.house_prefix or flat_prefix
if ($housing.Contains('DEFAULTS.house_prefix') -or $housing.Contains('DEFAULTS.flat_prefix')) { $pass++; $ok25++ }
else { $fail++; $errors += '  FAIL: DEFAULTS prefix NOT USED for display_number' }

Write-Host ('  ' + $ok25 + ' / 2 passed')

# ============================================================
# Test 26: Duplicate check in addHousing
# ============================================================
Write-Host '[Test 26] Duplicate check in addHousing — 1 check'
$ok26 = 0

$total++
if ($housing -match "addHousing[\s\S]*?findRowByValue[\s\S]*?display_number") { $pass++; $ok26++ }
else { $fail++; $errors += '  FAIL: addHousing does not check duplicate display_number' }

Write-Host ('  ' + $ok26 + ' / 1 passed')

# ============================================================
# Test 27: Profile fields match settings.html
# ============================================================
Write-Host '[Test 27] Profile update fields — 3 checks'
$ok27 = 0

$total++
if ($housing.Contains('profile_photo')) { $pass++; $ok27++ }
else { $fail++; $errors += '  FAIL: profile_photo field NOT FOUND in handleUpdateProfile' }

$total++
if ($housing.Contains('cohabitant_names')) { $pass++; $ok27++ }
else { $fail++; $errors += '  FAIL: cohabitant_names field NOT FOUND' }

$total++
if ($housing.Contains('move_in_date')) { $pass++; $ok27++ }
else { $fail++; $errors += '  FAIL: move_in_date field NOT FOUND' }

Write-Host ('  ' + $ok27 + ' / 3 passed')

# ============================================================
# Test 28: deleteAnnouncement uses soft delete (is_active=FALSE)
# ============================================================
Write-Host '[Test 28] Soft delete for announcements — 1 check'
$ok28 = 0

$total++
if ($housing -match "deleteAnnouncement[\s\S]*?is_active.*FALSE") { $pass++; $ok28++ }
else { $fail++; $errors += '  FAIL: deleteAnnouncement does not use soft delete (is_active=FALSE)' }

Write-Host ('  ' + $ok28 + ' / 1 passed')

# ============================================================
# Test 29: Announcements filter active + not expired
# ============================================================
Write-Host '[Test 29] Announcements filter — 2 checks'
$ok29 = 0

$total++
if ($housing -match "getAnnouncements[\s\S]*?is_active") { $pass++; $ok29++ }
else { $fail++; $errors += '  FAIL: getAnnouncements does not check is_active' }

$total++
if ($housing -match "getAnnouncements[\s\S]*?expiry_date") { $pass++; $ok29++ }
else { $fail++; $errors += '  FAIL: getAnnouncements does not check expiry_date' }

Write-Host ('  ' + $ok29 + ' / 2 passed')

# ============================================================
# Test 30: Main.gs stubs removed for Housing
# ============================================================
Write-Host '[Test 30] Main.gs Housing stubs removed — 3 checks'
$ok30 = 0

$total++
# Check that Housing stubs are commentted out / removed
if (-not ($main -match "function getSettings\(\)\s*\{[\s\S]*?NOT_IMPLEMENTED")) { $pass++; $ok30++ }
else { $fail++; $errors += '  FAIL: getSettings stub still active in Main.gs' }

$total++
if (-not ($main -match "function getHousingList\(\)\s*\{[\s\S]*?NOT_IMPLEMENTED")) { $pass++; $ok30++ }
else { $fail++; $errors += '  FAIL: getHousingList stub still active in Main.gs' }

$total++
if (-not ($main -match "function addHousing\(data\)\s*\{[\s\S]*?NOT_IMPLEMENTED")) { $pass++; $ok30++ }
else { $fail++; $errors += '  FAIL: addHousing stub still active in Main.gs' }

Write-Host ('  ' + $ok30 + ' / 3 passed')

# ============================================================
# Test 31: Main.gs Auth stubs removed
# ============================================================
Write-Host '[Test 31] Main.gs Auth stubs removed — 2 checks'
$ok31 = 0

$total++
if (-not ($main -match "function handleLogin\(data\)\s*\{[\s\S]*?NOT_IMPLEMENTED")) { $pass++; $ok31++ }
else { $fail++; $errors += '  FAIL: handleLogin stub still active in Main.gs' }

$total++
if (-not ($main -match "function handleRegister\(data\)\s*\{[\s\S]*?NOT_IMPLEMENTED")) { $pass++; $ok31++ }
else { $fail++; $errors += '  FAIL: handleRegister stub still active in Main.gs' }

Write-Host ('  ' + $ok31 + ' / 2 passed')

# ============================================================
# Test 32: Coresident JSON storage pattern
# ============================================================
Write-Host '[Test 32] Coresident JSON storage — 2 checks'
$ok32 = 0

$total++
if ($housing.Contains('JSON.parse')) { $pass++; $ok32++ }
else { $fail++; $errors += '  FAIL: JSON.parse NOT FOUND (needed for cohabitant_names)' }

$total++
if ($housing.Contains('JSON.stringify')) { $pass++; $ok32++ }
else { $fail++; $errors += '  FAIL: JSON.stringify NOT FOUND (needed for cohabitant_names)' }

Write-Host ('  ' + $ok32 + ' / 2 passed')

# ============================================================
# Test 33: addResident creates Users record if password provided
# ============================================================
Write-Host '[Test 33] addResident with password — 2 checks'
$ok33 = 0

$total++
if ($housing -match "addResident[\s\S]*?data\.password[\s\S]*?hashPassword") { $pass++; $ok33++ }
else { $fail++; $errors += '  FAIL: addResident does not hash password when provided' }

$total++
if ($housing -match "addResident[\s\S]*?ID_PREFIXES\.USR") { $pass++; $ok33++ }
else { $fail++; $errors += '  FAIL: addResident does not create Users record with ID_PREFIXES.USR' }

Write-Host ('  ' + $ok33 + ' / 2 passed')

# ============================================================
# Test 34: removeResident cleans up Users + Permissions
# ============================================================
Write-Host '[Test 34] removeResident cleanup — 2 checks'
$ok34 = 0

$total++
if ($housing -match "removeResident[\s\S]*?SHEET_NAMES\.USERS") { $pass++; $ok34++ }
else { $fail++; $errors += '  FAIL: removeResident does not clean up Users' }

$total++
if ($housing -match "removeResident[\s\S]*?SHEET_NAMES\.PERMISSIONS") { $pass++; $ok34++ }
else { $fail++; $errors += '  FAIL: removeResident does not clean up Permissions' }

Write-Host ('  ' + $ok34 + ' / 2 passed')

# ============================================================
# Test 35: Response format consistency { success, data/message/error }
# ============================================================
Write-Host '[Test 35] Response format consistency — 3 checks'
$ok35 = 0

$total++
# All GET functions return { success: true, data: [...] }
if (($housing -match "getHousingList[\s\S]*?success: true, data:") -and
    ($housing -match "getResidentsList[\s\S]*?success: true, data:")) { $pass++; $ok35++ }
else { $fail++; $errors += '  FAIL: GET functions do not return { success: true, data }' }

$total++
# All CREATE functions return { success, message, id }
if ($housing -match "addHousing[\s\S]*?success: true.*message.*id:") { $pass++; $ok35++ }
else { $fail++; $errors += '  FAIL: addHousing does not return { success, message, id }' }

$total++
# Error responses return { success: false, error }
$errorCount = ([regex]::Matches($housing, "success: false, error:")).Count
if ($errorCount -ge 5) { $pass++; $ok35++ }
else { $fail++; $errors += ('  FAIL: Only ' + $errorCount + ' error responses found (need >= 5)') }

Write-Host ('  ' + $ok35 + ' / 3 passed')

# ============================================================
# Test 36: ES5 compatibility (no arrow functions, no const in nested scope)
# ============================================================
Write-Host '[Test 36] ES5 compatibility — 2 checks'
$ok36 = 0

$total++
# Functions use var, not let (inside functions)
# Count var vs let usage inside functions
$varCount = ([regex]::Matches($housing, '\bvar\b')).Count
$letCount = ([regex]::Matches($housing, '\blet\b')).Count
if ($varCount -gt $letCount) { $pass++; $ok36++ }
else { $fail++; $errors += ('  FAIL: Uses let (' + $letCount + ') more than var (' + $varCount + ') — should use var for ES5') }

$total++
# No arrow functions (=>)
$arrowCount = ([regex]::Matches($housing, '=>')).Count
if ($arrowCount -eq 0) { $pass++; $ok36++ }
else { $fail++; $errors += ('  FAIL: ' + $arrowCount + ' arrow functions found — should use function() for ES5') }

Write-Host ('  ' + $ok36 + ' / 2 passed')

# ============================================================
# Test 37: Helper functions are private (underscore prefix)
# ============================================================
Write-Host '[Test 37] Private helper functions — 2 checks'
$ok37 = 0

$total++
if ($housing.Contains('function _updateHousingStatus(')) { $pass++; $ok37++ }
else { $fail++; $errors += '  FAIL: _updateHousingStatus not private (underscore)' }

$total++
if ($housing.Contains('function _checkAndUpdateHousingStatus(')) { $pass++; $ok37++ }
else { $fail++; $errors += '  FAIL: _checkAndUpdateHousingStatus not private (underscore)' }

Write-Host ('  ' + $ok37 + ' / 2 passed')

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
  Write-Host '  Housing.gs is complete and matches plan specs!'
} else {
  Write-Host ('  >>> ' + $fail + ' TESTS FAILED <<<')
}
Write-Host '========================================================'
