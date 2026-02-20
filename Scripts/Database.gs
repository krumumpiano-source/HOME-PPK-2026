/**
 * ============================================================================
 * HOME PPK 2026 - Database.gs — 🗄️ CRUD กลาง
 * ============================================================================
 * ฟังก์ชันกลางสำหรับอ่าน/เขียน Google Sheets
 * ทุกไฟล์ .gs เรียก CRUD ผ่านไฟล์นี้ — ไม่เข้าถึง Sheet โดยตรง
 * 
 * ฟีเจอร์:
 *   - CRUD: readSheetData, appendRowToSheet, updateRowInSheet, deleteRowFromSheet
 *   - Batch: batchAppendRows, batchUpdateRows
 *   - Filter: readSheetDataFiltered, findRowByValue
 *   - Lock: withLock (LockService ป้องกัน race condition)
 *   - Cache: getCachedData, invalidateCache (CacheService ลด API calls)
 *   - Log: writeLog (บันทึก Logs sheet)
 *   - ID: getNextId (สร้าง ID อัตโนมัติ)
 *   - Backup: createBackup (สำเนา Sheets ไป Backups/)
 *   - Archive: archiveLogs (ย้าย Log เก่า > N เดือน)
 * 
 * Version: 1.0
 * วันที่สร้าง: 17 กุมภาพันธ์ 2569
 * Step: 17 (ระยะที่ 2)
 * ============================================================================
 * 
 * Dependencies: Config.gs (SPREADSHEET_IDS, FOLDER_IDS, SHEET_NAMES, ID_PREFIXES)
 * 
 * ============================================================================
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const BATCH_SIZE = 50;         // แถว/batch สำหรับ bulk operations
const CACHE_TTL = 21600;       // Cache 6 ชั่วโมง (วินาที)
const LOCK_TIMEOUT = 30000;    // รอ lock สูงสุด 30 วินาที

// ============================================================================
// LOCK SERVICE — ป้องกัน Race Condition (S0-5)
// ============================================================================

/**
 * Wrap callback ด้วย LockService.getScriptLock()
 * ป้องกัน 2 คนเขียน Sheet พร้อมกัน
 * @param {Function} callback - ฟังก์ชันที่ต้อง lock
 * @returns {Object} ผลลัพธ์จาก callback หรือ error
 */
function withLock(callback) {
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(LOCK_TIMEOUT)) {
      return { success: false, error: 'ระบบกำลังประมวลผล กรุณาลองใหม่' };
    }
    return callback();
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// SHEET ACCESS — เปิด Sheet
// ============================================================================

/**
 * เปิด sheet ตามชื่อ
 * @param {string} spreadsheetId - Spreadsheet ID
 * @param {string} sheetName - ชื่อ sheet
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} sheet object
 * @throws {Error} ถ้าไม่พบ sheet
 */
function getSheetByName(spreadsheetId, sheetName) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`ไม่พบแผ่นงาน "${sheetName}" ใน Spreadsheet ID: ${spreadsheetId}`);
  }
  return sheet;
}

/**
 * เปิด sheet — ถ้าไม่มีให้สร้างใหม่พร้อม headers
 * ใช้สำหรับ sheet ตามปี (เช่น '2569') ที่ยังไม่มี
 * @param {string} spreadsheetId - Spreadsheet ID
 * @param {string} sheetName - ชื่อ sheet
 * @param {string[]} [headers] - หัวคอลัมน์ (ถ้าต้องสร้าง) 
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} sheet object
 */
function getOrCreateSheet(spreadsheetId, sheetName, headers) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

// ============================================================================
// READ — อ่านข้อมูล
// ============================================================================

/**
 * อ่านข้อมูลทั้ง sheet เป็น array of objects
 * @param {string} spreadsheetId - Spreadsheet ID
 * @param {string} sheetName - ชื่อ sheet
 * @param {number} [startRow=2] - แถวเริ่มต้น (default: 2 = ข้ามหัว)
 * @returns {Object[]} array of objects (key = header)
 */
function readSheetData(spreadsheetId, sheetName, startRow) {
  startRow = startRow || 2;
  const sheet = getSheetByName(spreadsheetId, sheetName);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < startRow || lastCol === 0) return [];

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const data = sheet.getRange(startRow, 1, lastRow - startRow + 1, lastCol).getValues();

  return data.map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) {
      obj[h] = row[i];
    });
    return obj;
  });
}

/**
 * อ่านแบบกรองเงื่อนไข
 * @param {string} spreadsheetId - Spreadsheet ID
 * @param {string} sheetName - ชื่อ sheet
 * @param {string} filterColumn - ชื่อคอลัมน์ที่ต้องการกรอง
 * @param {*} filterValue - ค่าที่ต้องการ
 * @returns {Object[]} array of objects ที่ตรงเงื่อนไข
 */
function readSheetDataFiltered(spreadsheetId, sheetName, filterColumn, filterValue) {
  const allData = readSheetData(spreadsheetId, sheetName);
  return allData.filter(function(row) {
    return String(row[filterColumn]) === String(filterValue);
  });
}

/**
 * ค้นหาแถวแรกตามค่า
 * @param {string} spreadsheetId - Spreadsheet ID
 * @param {string} sheetName - ชื่อ sheet
 * @param {string} column - ชื่อคอลัมน์
 * @param {*} value - ค่าที่ต้องการ
 * @returns {Object|null} object ที่พบ หรือ null
 */
function findRowByValue(spreadsheetId, sheetName, column, value) {
  const allData = readSheetData(spreadsheetId, sheetName);
  for (var i = 0; i < allData.length; i++) {
    if (String(allData[i][column]) === String(value)) {
      return allData[i];
    }
  }
  return null;
}

// ============================================================================
// CREATE — เพิ่มข้อมูล (ใช้ LockService)
// ============================================================================

/**
 * เพิ่มแถวใหม่ — ป้องกัน race condition ด้วย LockService
 * @param {string} spreadsheetId - Spreadsheet ID
 * @param {string} sheetName - ชื่อ sheet
 * @param {Object} data - ข้อมูลแถวใหม่ { header: value, ... }
 * @returns {Object} { success, message } หรือ { success, error }
 */
function appendRowToSheet(spreadsheetId, sheetName, data) {
  return withLock(function() {
    var sheet = getSheetByName(spreadsheetId, sheetName);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var row = headers.map(function(h) { return data[h] !== undefined ? data[h] : ''; });
    sheet.appendRow(row);
    return { success: true, message: 'เพิ่มข้อมูลสำเร็จ' };
  });
}

/**
 * เพิ่มหลายแถวพร้อมกัน — ใช้ setValues (เร็วกว่า appendRow loop 10-50 เท่า)
 * แบ่ง batch ตาม BATCH_SIZE เพื่อป้องกัน timeout
 * @param {string} spreadsheetId - Spreadsheet ID
 * @param {string} sheetName - ชื่อ sheet
 * @param {Object[]} dataArray - array ของ data objects
 * @returns {Object} { success, message }
 */
function batchAppendRows(spreadsheetId, sheetName, dataArray) {
  return withLock(function() {
    var sheet = getSheetByName(spreadsheetId, sheetName);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    for (var i = 0; i < dataArray.length; i += BATCH_SIZE) {
      var batch = dataArray.slice(i, i + BATCH_SIZE);
      var rows = batch.map(function(data) {
        return headers.map(function(h) { return data[h] !== undefined ? data[h] : ''; });
      });
      var startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rows.length, headers.length).setValues(rows);
      SpreadsheetApp.flush();
    }

    return { success: true, message: 'เพิ่ม ' + dataArray.length + ' แถวสำเร็จ' };
  });
}

// ============================================================================
// UPDATE — แก้ไขข้อมูล (ใช้ LockService)
// ============================================================================

/**
 * อัปเดตแถวตาม ID — ป้องกัน race condition ด้วย LockService
 * @param {string} spreadsheetId - Spreadsheet ID
 * @param {string} sheetName - ชื่อ sheet
 * @param {string} idColumn - ชื่อคอลัมน์ ID (เช่น 'id', 'key')
 * @param {*} idValue - ค่า ID ที่ต้องการอัปเดต
 * @param {Object} data - ข้อมูลที่ต้องการอัปเดต { header: newValue, ... }
 * @returns {Object} { success, message } หรือ { success, error }
 */
function updateRowInSheet(spreadsheetId, sheetName, idColumn, idValue, data) {
  return withLock(function() {
    var sheet = getSheetByName(spreadsheetId, sheetName);
    var dataRange = sheet.getDataRange().getValues();
    var headers = dataRange[0];
    var idColIndex = headers.indexOf(idColumn);

    if (idColIndex === -1) {
      return { success: false, error: 'ไม่พบคอลัมน์ "' + idColumn + '"' };
    }

    for (var i = 1; i < dataRange.length; i++) {
      if (String(dataRange[i][idColIndex]) === String(idValue)) {
        headers.forEach(function(h, j) {
          if (data[h] !== undefined) {
            sheet.getRange(i + 1, j + 1).setValue(data[h]);
          }
        });
        return { success: true, message: 'อัปเดตสำเร็จ' };
      }
    }

    return { success: false, error: 'ไม่พบข้อมูลที่ต้องการแก้ไข (ID: ' + idValue + ')' };
  });
}

/**
 * อัปเดตหลายแถวพร้อมกัน
 * @param {string} spreadsheetId - Spreadsheet ID
 * @param {string} sheetName - ชื่อ sheet
 * @param {string} idColumn - ชื่อคอลัมน์ ID
 * @param {Array<{id: *, data: Object}>} updates - array ของ { id, data }
 * @returns {Object} { success, message }
 */
function batchUpdateRows(spreadsheetId, sheetName, idColumn, updates) {
  return withLock(function() {
    var sheet = getSheetByName(spreadsheetId, sheetName);
    var dataRange = sheet.getDataRange().getValues();
    var headers = dataRange[0];
    var idColIndex = headers.indexOf(idColumn);
    var updatedCount = 0;

    if (idColIndex === -1) {
      return { success: false, error: 'ไม่พบคอลัมน์ "' + idColumn + '"' };
    }

    updates.forEach(function(update) {
      for (var i = 1; i < dataRange.length; i++) {
        if (String(dataRange[i][idColIndex]) === String(update.id)) {
          headers.forEach(function(h, j) {
            if (update.data[h] !== undefined) {
              sheet.getRange(i + 1, j + 1).setValue(update.data[h]);
            }
          });
          updatedCount++;
          break;
        }
      }
    });

    return { success: true, message: 'อัปเดต ' + updatedCount + ' แถวสำเร็จ' };
  });
}

// ============================================================================
// DELETE — ลบข้อมูล (ใช้ LockService)
// ============================================================================

/**
 * ลบแถวตาม ID — ป้องกัน race condition ด้วย LockService
 * ลบจากล่างขึ้นบนเพื่อป้องกัน index shift
 * @param {string} spreadsheetId - Spreadsheet ID
 * @param {string} sheetName - ชื่อ sheet
 * @param {string} idColumn - ชื่อคอลัมน์ ID
 * @param {*} idValue - ค่า ID ที่ต้องการลบ
 * @returns {Object} { success, message } หรือ { success, error }
 */
function deleteRowFromSheet(spreadsheetId, sheetName, idColumn, idValue) {
  return withLock(function() {
    var sheet = getSheetByName(spreadsheetId, sheetName);
    var dataRange = sheet.getDataRange().getValues();
    var headers = dataRange[0];
    var idColIndex = headers.indexOf(idColumn);

    if (idColIndex === -1) {
      return { success: false, error: 'ไม่พบคอลัมน์ "' + idColumn + '"' };
    }

    for (var i = dataRange.length - 1; i >= 1; i--) {
      if (String(dataRange[i][idColIndex]) === String(idValue)) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'ลบข้อมูลสำเร็จ' };
      }
    }

    return { success: false, error: 'ไม่พบข้อมูลที่ต้องการลบ (ID: ' + idValue + ')' };
  });
}

// ============================================================================
// ID GENERATION — สร้าง ID อัตโนมัติ
// ============================================================================

/**
 * สร้าง ID อัตโนมัติ: PREFIX + timestamp + random
 * ตัวอย่าง: HOU-1708123456789-A3K
 * @param {string} prefix - คำนำหน้า (เช่น 'HOU', 'RES', 'USR')
 * @returns {string} ID ใหม่ที่ไม่ซ้ำ
 */
function getNextId(prefix) {
  var timestamp = new Date().getTime();
  var random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return prefix + '-' + timestamp + '-' + random;
}

// ============================================================================
// CACHE SERVICE — ลด Sheets API calls (S0-6, §9.1)
// ============================================================================

/**
 * อ่านจาก CacheService ก่อน — ถ้าไม่มีจึงอ่านจาก Sheet แล้ว cache
 * @param {string} cacheKey - key สำหรับ cache (เช่น 'settings', 'housing')
 * @param {string} spreadsheetId - Spreadsheet ID
 * @param {string} sheetName - ชื่อ sheet
 * @returns {Object[]} array of objects
 */
function getCachedData(cacheKey, spreadsheetId, sheetName) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get(cacheKey);

  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // cache เสีย → อ่านจาก Sheet ใหม่
    }
  }

  var data = readSheetData(spreadsheetId, sheetName);

  // CacheService limit = 100KB per key → ตรวจขนาดก่อน cache
  var jsonStr = JSON.stringify(data);
  if (jsonStr.length < 100000) {
    cache.put(cacheKey, jsonStr, CACHE_TTL);
  }

  return data;
}

/**
 * ลบ cache เมื่อมีการเขียนข้อมูล
 * @param {string} cacheKey - key ที่ต้องการลบ
 */
function invalidateCache(cacheKey) {
  var cache = CacheService.getScriptCache();
  cache.remove(cacheKey);
}

/**
 * ลบ cache หลาย key พร้อมกัน
 * @param {string[]} cacheKeys - array ของ key ที่ต้องการลบ
 */
function invalidateCaches(cacheKeys) {
  var cache = CacheService.getScriptCache();
  cacheKeys.forEach(function(key) {
    cache.remove(key);
  });
}

// ============================================================================
// WRITE LOG — บันทึกกิจกรรม
// ============================================================================

/**
 * บันทึก Log ลง Logs sheet ใน [MAIN]
 * @param {string} action - ชื่อ action (เช่น 'LOGIN', 'UPDATE_SETTINGS')
 * @param {string} userId - user ID หรือ email
 * @param {string} detail - รายละเอียด
 * @param {string} [module] - ชื่อ module (เช่น 'Auth', 'Housing')
 */
function writeLog(action, userId, detail, module) {
  try {
    var logId = getNextId(ID_PREFIXES.LOG);
    appendRowToSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.LOGS, {
      id: logId,
      timestamp: new Date().toISOString(),
      user_email: userId || '',
      action: action || '',
      module: module || '',
      details: detail || '',
      ip_address: ''  // GAS ไม่สามารถดึง IP ได้โดยตรง
    });
  } catch (e) {
    // Log ต้องไม่ throw error ทำให้ระบบหลักพัง
    Logger.log('writeLog error: ' + e.message);
  }
}

// ============================================================================
// BACKUP — สำเนา Sheets ไป Backups/ (§6.3)
// ============================================================================

/**
 * สำเนา Google Sheets ทั้ง 8 ไฟล์ไปโฟลเดอร์ Backups/
 * ตั้งชื่อ: Backup_{YYYYMMDD_HHmmss}_{ชื่อไฟล์}
 * @returns {Object} { success, backupName, fileCount }
 */
function createBackup() {
  var backupFolder = DriveApp.getFolderById(FOLDER_IDS.BACKUPS);
  var now = new Date();
  var dateStr = Utilities.formatDate(now, 'Asia/Bangkok', 'yyyyMMdd_HHmmss');
  var backupName = 'Backup_' + dateStr;

  // สร้าง sub-folder สำหรับ backup ครั้งนี้
  var subFolder = backupFolder.createFolder(backupName);

  var spreadsheetIds = SPREADSHEET_IDS;
  var fileCount = 0;

  Object.keys(spreadsheetIds).forEach(function(key) {
    try {
      var ssId = spreadsheetIds[key];
      var file = DriveApp.getFileById(ssId);
      file.makeCopy(backupName + '_' + key, subFolder);
      fileCount++;
    } catch (e) {
      Logger.log('Backup error for ' + key + ': ' + e.message);
    }
  });

  writeLog('BACKUP', 'SYSTEM', 'สำรองข้อมูล: ' + backupName + ' (' + fileCount + ' ไฟล์)', 'Database');

  return {
    success: true,
    backupName: backupName,
    fileCount: fileCount,
    folderId: subFolder.getId()
  };
}

/**
 * คืนค่าจากสำเนา — overwrite sheets ปัจจุบัน
 * ⚠️ ฟังก์ชันนี้อันตราย — ข้อมูลปัจจุบันจะถูกเขียนทับ
 * @param {string} backupFolderId - ID ของโฟลเดอร์ backup
 * @returns {Object} { success, message, restoredCount }
 */
function restoreBackup(backupFolderId) {
  return withLock(function() {
    var backupFolder = DriveApp.getFolderById(backupFolderId);
    var files = backupFolder.getFiles();
    var restoredCount = 0;

    while (files.hasNext()) {
      var backupFile = files.next();
      var fileName = backupFile.getName();

      // ค้นหาว่า backup นี้คือไฟล์ไหน (เช่น Backup_20690217_120000_MAIN → MAIN)
      Object.keys(SPREADSHEET_IDS).forEach(function(key) {
        if (fileName.indexOf('_' + key) !== -1) {
          try {
            var targetSs = SpreadsheetApp.openById(SPREADSHEET_IDS[key]);
            var backupSs = SpreadsheetApp.openById(backupFile.getId());

            // คัดลอก sheets จาก backup ไปทับ target
            var backupSheets = backupSs.getSheets();
            var targetSheets = targetSs.getSheets();

            // ลบ sheets เก่าทั้งหมด (เก็บ 1 sheet ไว้เพื่อไม่ให้ spreadsheet ว่าง)
            if (targetSheets.length > 1) {
              for (var i = 1; i < targetSheets.length; i++) {
                targetSs.deleteSheet(targetSheets[i]);
              }
            }

            // คัดลอก sheets จาก backup
            backupSheets.forEach(function(bSheet) {
              var newSheet = bSheet.copyTo(targetSs);
              newSheet.setName(bSheet.getName());
            });

            // ลบ sheet แรกเดิม (ที่เก็บไว้ตอนแรก)
            var remainingFirst = targetSs.getSheets()[0];
            if (targetSs.getSheets().length > backupSheets.length) {
              targetSs.deleteSheet(remainingFirst);
            }

            restoredCount++;
          } catch (e) {
            Logger.log('Restore error for ' + key + ': ' + e.message);
          }
        }
      });
    }

    writeLog('RESTORE', 'SYSTEM', 'คืนค่าจาก backup: ' + backupFolderId + ' (' + restoredCount + ' ไฟล์)', 'Database');

    return {
      success: true,
      message: 'คืนค่าสำเร็จ ' + restoredCount + ' ไฟล์',
      restoredCount: restoredCount
    };
  });
}

// ============================================================================
// ARCHIVE LOGS — ย้าย Log เก่า > N เดือน (§9.1)
// ============================================================================

/**
 * ย้าย Log เก่ากว่า N เดือนไปไฟล์แยก Logs_Archive_{year}
 * ตั้งเป็น Trigger รายเดือน
 * @param {number} [monthsToKeep=6] - เก็บ Log ล่าสุดกี่เดือน
 * @returns {Object} { success, archivedCount }
 */
function archiveLogs(monthsToKeep) {
  monthsToKeep = monthsToKeep || 6;

  return withLock(function() {
    var sheet = getSheetByName(SPREADSHEET_IDS.MAIN, SHEET_NAMES.LOGS);
    var dataRange = sheet.getDataRange().getValues();
    if (dataRange.length <= 1) {
      return { success: true, archivedCount: 0, message: 'ไม่มี Log ให้ archive' };
    }

    var headers = dataRange[0];
    var timestampIdx = headers.indexOf('timestamp');
    if (timestampIdx === -1) {
      return { success: false, error: 'ไม่พบคอลัมน์ timestamp' };
    }

    var cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsToKeep);

    var rowsToArchive = [];
    var rowIndicesToDelete = [];

    for (var i = 1; i < dataRange.length; i++) {
      var ts = new Date(dataRange[i][timestampIdx]);
      if (ts < cutoffDate) {
        rowsToArchive.push(dataRange[i]);
        rowIndicesToDelete.push(i + 1); // 1-based row number
      }
    }

    if (rowsToArchive.length === 0) {
      return { success: true, archivedCount: 0, message: 'ไม่มี Log เก่าเกิน ' + monthsToKeep + ' เดือน' };
    }

    // สร้าง/เปิด archive sheet
    var archiveYear = new Date(rowsToArchive[0][timestampIdx]).getFullYear();
    // แปลงเป็นปี พ.ศ.
    var buddhistYear = archiveYear + 543;
    var archiveSheetName = 'Logs_Archive_' + buddhistYear;
    var archiveSheet = getOrCreateSheet(SPREADSHEET_IDS.MAIN, archiveSheetName, headers);

    // เพิ่ม rows ที่ archive
    var startRow = archiveSheet.getLastRow() + 1;
    archiveSheet.getRange(startRow, 1, rowsToArchive.length, headers.length).setValues(rowsToArchive);

    // ลบ rows เก่าจาก sheet หลัก (ลบจากล่างขึ้นบน)
    rowIndicesToDelete.sort(function(a, b) { return b - a; });
    rowIndicesToDelete.forEach(function(rowNum) {
      sheet.deleteRow(rowNum);
    });

    writeLog('ARCHIVE_LOGS', 'SYSTEM', 'Archive ' + rowsToArchive.length + ' logs เก่ากว่า ' + monthsToKeep + ' เดือน → ' + archiveSheetName, 'Database');

    return {
      success: true,
      archivedCount: rowsToArchive.length,
      archiveSheet: archiveSheetName,
      message: 'ย้าย ' + rowsToArchive.length + ' log ไปยัง ' + archiveSheetName
    };
  });
}

// ============================================================================
// ERROR HANDLING — Pattern มาตรฐาน (§9.4)
// ============================================================================

/**
 * Wrap handler ด้วย try-catch + logging
 * ใช้ใน Main.gs เพื่อจัดการ error แบบเดียวกันทุก route
 * @param {Function} handler - ฟังก์ชัน handler
 * @param {string} actionName - ชื่อ action (สำหรับ log)
 * @returns {Object} ผลลัพธ์ หรือ error object
 */
function safeExecute(handler, actionName) {
  try {
    return handler();
  } catch (e) {
    writeLog('ERROR', 'SYSTEM', actionName + ': ' + e.message, 'Error');
    return {
      success: false,
      error: 'เกิดข้อผิดพลาด: ' + e.message,
      action: actionName
    };
  }
}

// ============================================================================
// TEST FUNCTION — รันใน GAS Editor เพื่อตรวจสอบ
// ============================================================================

/**
 * ทดสอบ Database.gs — รันใน GAS Editor
 * ✅ ผ่าน = CRUD ทำงานครบ ไม่มี error
 * ❌ ไม่ผ่าน = error → ตรวจ Database.gs + Config.gs
 * ⚠️ ใช้ Logs sheet ใน [MAIN] เป็นตัวทดสอบ
 */
function testDB() {
  Logger.log('=== TEST DATABASE.gs ===');

  // Test 1: readSheetData
  Logger.log('\n--- READ ---');
  var settings = readSheetData(SPREADSHEET_IDS.MAIN, 'Settings');
  Logger.log('  Settings rows: ' + settings.length);
  if (settings.length === 0) Logger.log('  ⚠️ Settings ว่าง — อาจยังไม่ได้รัน setupAll()');

  // Test 2: appendRowToSheet
  Logger.log('\n--- APPEND ---');
  var testId = getNextId('TST');
  var appendResult = appendRowToSheet(SPREADSHEET_IDS.MAIN, 'Logs', {
    id: testId,
    timestamp: new Date().toISOString(),
    user_email: 'TEST_USER',
    action: 'TEST',
    module: 'Database',
    details: 'ทดสอบ appendRowToSheet',
    ip_address: ''
  });
  Logger.log('  Append result: ' + JSON.stringify(appendResult));

  // Test 3: readSheetDataFiltered
  Logger.log('\n--- READ FILTERED ---');
  var filtered = readSheetDataFiltered(SPREADSHEET_IDS.MAIN, 'Logs', 'id', testId);
  Logger.log('  Found rows: ' + filtered.length);
  if (filtered.length !== 1) throw new Error('readSheetDataFiltered ไม่พบข้อมูลที่เพิ่งเพิ่ม');

  // Test 4: updateRowInSheet
  Logger.log('\n--- UPDATE ---');
  var updateResult = updateRowInSheet(SPREADSHEET_IDS.MAIN, 'Logs', 'id', testId, {
    details: 'ทดสอบ updateRowInSheet — อัปเดตแล้ว'
  });
  Logger.log('  Update result: ' + JSON.stringify(updateResult));

  // Test 5: deleteRowFromSheet
  Logger.log('\n--- DELETE ---');
  var deleteResult = deleteRowFromSheet(SPREADSHEET_IDS.MAIN, 'Logs', 'id', testId);
  Logger.log('  Delete result: ' + JSON.stringify(deleteResult));

  // Test 6: Verify deletion
  var verify = readSheetDataFiltered(SPREADSHEET_IDS.MAIN, 'Logs', 'id', testId);
  Logger.log('  After delete, found rows: ' + verify.length);
  if (verify.length !== 0) throw new Error('deleteRowFromSheet ไม่ได้ลบจริง');

  // Test 7: getNextId format
  Logger.log('\n--- ID GENERATION ---');
  var id1 = getNextId('HOU');
  var id2 = getNextId('HOU');
  Logger.log('  ID 1: ' + id1);
  Logger.log('  ID 2: ' + id2);
  if (id1 === id2) throw new Error('getNextId สร้าง ID ซ้ำ!');

  // Test 8: LockService (withLock)
  Logger.log('\n--- LOCK SERVICE ---');
  var lockResult = withLock(function() {
    return { success: true, message: 'Lock ทำงานปกติ' };
  });
  Logger.log('  Lock result: ' + JSON.stringify(lockResult));

  // Test 9: safeExecute
  Logger.log('\n--- SAFE EXECUTE ---');
  var safeResult = safeExecute(function() {
    return { success: true, data: 'test' };
  }, 'testAction');
  Logger.log('  Safe result: ' + JSON.stringify(safeResult));

  Logger.log('\n✅ DATABASE TEST PASSED');
}

// ============================================================================
// END OF Database.gs
// ============================================================================
