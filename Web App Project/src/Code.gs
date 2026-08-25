/**
 * Google Apps Script Web App - Server Side Logic
 * 
 * Target Spreadsheet: https://docs.google.com/spreadsheets/d/1LxiBdUywd5IMLckyRZvPyLRKkV_TQXO5PUh_xaPROvo/edit#gid=0
 * A열: 사원번호
 * B열: 비밀번호
 */

const SPREADSHEET_ID = '1LxiBdUywd5IMLckyRZvPyLRKkV_TQXO5PUh_xaPROvo';
const SHEET_NAME = '시트1'; // 시트 이름이 다를 경우 수정 필요 (gid=0은 보통 첫 번째 시트)

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('hy MOBILITY - CS Manager')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * HTML 파일 포함 유틸리티
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * 로그인 확인
 */
function checkLogin(employeeId, password) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    for (let i = 0; i < data.length; i++) {
      // A열: 사원번호, B열: 비밀번호
      if (String(data[i][0]) === String(employeeId) && verifyPassword_(password, data[i][1])) {
        const userName = data[i][2] || '사용자'; // C열: 이름
        const userPhone = String(data[i][3] || '').trim(); // D열: 연락처
        
        // E~R열: 모든 메뉴 권한 정보 (D열 연락처 추가로 +1 이동)
        const fullPermissions = {
          bs: [data[i][4], data[i][5], data[i][6], data[i][7]], // E~H (서비스1~4)
          address: data[i][8], // I
          parts: data[i][9],   // J
          delivery: [data[i][10], data[i][11], data[i][12]], // K~M
          stats: data[i][13],  // N
          guide: data[i][14],  // O
          driver: {            // P~Q
            pickup: data[i][15],   // P: 기사 회수
            delivery: data[i][16]  // Q: 기사 배송
          },
          installInfo: data[i][17] // R: 부품 장착 정보
        };
        
        return { 
          success: true, 
          message: '로그인 성공', 
          employeeId: String(data[i][0] || '').trim(),
          userPhone: userPhone,
          userName: userName, 
          permissions: fullPermissions,
          sessionToken: createSessionToken_(String(data[i][0] || '').trim(), userName, userPhone, fullPermissions)
        };
      }
    }
    return { success: false, message: '사원번호 또는 비밀번호가 일치하지 않습니다.' };
  } catch (e) {
    return { success: false, message: '에러 발생: ' + e.toString() };
  }
}

/**
 * 비밀번호 변경
 */
function updatePassword(employeeId, oldPassword, newPassword) {
  try {
    const policy = validatePasswordPolicy_(newPassword);
    if (!policy.valid) {
      return { success: false, message: policy.message };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    // 헤더가 있을 수 있으므로 그대로 순회하며 찾습니다.
    for (let i = 0; i < data.length; i++) {
      // A열: 사원번호 (index 0), B열: 비밀번호 (index 1)
      if (String(data[i][0]) === String(employeeId)) {
        if (verifyPassword_(oldPassword, data[i][1])) {
          // 기존 비밀번호 일치: 새 비밀번호로 업데이트 (i는 0-index이므로 실제 행은 i+1, B열은 2번 열)
          sheet.getRange(i + 1, 2).setValue(encodePassword_(newPassword));
          return { success: true, message: '비밀번호가 성공적으로 변경되었습니다.' };
        } else {
          return { success: false, message: '기존 비밀번호가 일치하지 않습니다.' };
        }
      }
    }
    return { success: false, message: '존재하지 않는 사원번호입니다.' };
  } catch (e) {
    return { success: false, message: '에러 발생: ' + e.toString() };
  }
}

/**
 * 비밀번호 변경용 스프레드시트 (위 SPREADSHEET_ID와 동일하게 사용 중)
 */
const BS_SPREADSHEET_ID = '1uhkhWWBzvleJwKR_D-VAWXNWq7O3JwB4fib7vKZ52iY';
const BRANCH_ADDRESS_SPREADSHEET_ID = '10vY7bq8AXW3XkimW-ibyOGh4LaWRCLaR1Df69Iy9Lt0';
const DELIVERY_SPREADSHEET_ID = '1IiUSZmNSG8PCZJtyNPNqE1ZXByRIpHJSOeuX6X9H3qc';
const INSTALL_INFO_SPREADSHEET_ID = '1rdWEaYLMLqVjluW6wkB48Xg54k6Cza_4od8IC7TpKeo';
const AS_DAILY_STATS_SPREADSHEET_ID = '1OeNfrMuR6U_EQPuUIHGCEj31BFDGHGc74uMyiM6wY9c';
const AS_DAILY_RAW_SHEET_NAME = 'AS_RAW_UNIFIED';
const AS_DAILY_SUMMARY_SHEET_NAME = 'AS_DAILY_SUMMARY';
const AS_DAILY_WORK_SHEET_NAME = 'AS_DAILY_WORK';
const AS_DAILY_DETAIL_MAX_ITEMS = 500;
const APP_DRIVE_FOLDER_NAME = '[APP]CocoCsManager2026';
const AS_DAILY_EXPORT_FOLDER_NAME = '다운로드';
const AS_DAILY_EXPORT_FOLDER_ID = '1UVt0Wjgak7lE2iRv2zcJbLEDfuIWap4j'; // 다운로드 폴더 ID를 입력하면 폴더명 중복 없이 고정 사용합니다.
const AS_DAILY_EXPORT_RETENTION_DAYS = 7;
const AS_DAILY_EXPORT_FILE_PREFIX = 'AS일일실적_';
const AS_DAILY_STATS_CACHE_SECONDS = 60 * 5;
const AS_DAILY_DETAIL_CACHE_SECONDS = 60 * 5;
const AS_DAILY_CACHE_MAX_BYTES = 90 * 1024;
const BS_SERVICE_SHEETS = ['서비스1', '서비스2', '서비스3', '서비스4'];
const BS_STATS_CACHE_SECONDS = 60 * 3;
const BS_STATS_CACHE_PREFIX = 'bsStats:part:v1:';
const BS_STATS_DATA_START_ROW = 5;
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8시간
const SESSION_STORE_PREFIX = 'session:';
const PASSWORD_HASH_PREFIX = 'sha256';
const DELIVERY_CANCEL_HEADERS = [
  '신청자사번',
  '취소요청여부',
  '취소요청일시',
  '취소요청자사번',
  '취소요청자명',
  '취소승인일시',
  '취소승인자사번',
  '취소승인자명'
];

function isAllowedFlag_(value) {
  const v = String(value || '').trim().toLowerCase();
  return v === 'o';
}

function hasDeliveryManagePermission_(permissions) {
  if (!permissions || !permissions.delivery || !Array.isArray(permissions.delivery)) return false;
  return isAllowedFlag_(permissions.delivery[1]);
}

function hasDeliveryListPermission_(permissions) {
  if (!permissions || !permissions.delivery || !Array.isArray(permissions.delivery)) return false;
  return isAllowedFlag_(permissions.delivery[2]);
}

function hasDeliveryMenuPermission_(permissions) {
  if (!permissions || !permissions.delivery || !Array.isArray(permissions.delivery)) return false;
  return permissions.delivery.some(function (p) { return isAllowedFlag_(p); });
}

function hasDriverPickupPermission_(permissions) {
  return !!(permissions && permissions.driver && isAllowedFlag_(permissions.driver.pickup));
}

function hasDriverDeliveryPermission_(permissions) {
  return !!(permissions && permissions.driver && isAllowedFlag_(permissions.driver.delivery));
}

function hasAnyDeliveryPermission_(permissions) {
  return hasDeliveryMenuPermission_(permissions) ||
    hasDriverPickupPermission_(permissions) ||
    hasDriverDeliveryPermission_(permissions);
}

function hasBsPermission_(permissions) {
  return getAllowedBsServiceSheets_(permissions).length > 0;
}

function getAllowedBsServiceSheets_(permissions) {
  if (!permissions || !permissions.bs || !Array.isArray(permissions.bs)) return [];
  return BS_SERVICE_SHEETS.filter(function(sheetName, index) {
    return isAllowedFlag_(permissions.bs[index]);
  });
}

function isAuthorizedBsPartRequest_(permissions, part) {
  const requestedPart = String(part || '').trim();
  if (!requestedPart) return hasBsPermission_(permissions);
  return getAllowedBsServiceSheets_(permissions).indexOf(requestedPart) !== -1;
}

function hasInstallInfoPermission_(permissions) {
  return !!(permissions && isAllowedFlag_(permissions.installInfo));
}

function hasStatsPermission_(permissions) {
  return !!(permissions && isAllowedFlag_(permissions.stats));
}

function createSessionToken_(employeeId, userName, userPhone, permissions) {
  const token = Utilities.getUuid() + Utilities.getUuid();
  const payload = {
    employeeId: String(employeeId || '').trim(),
    userName: String(userName || '').trim(),
    userPhone: String(userPhone || '').trim(),
    permissions: permissions || {},
    createdAt: new Date().toISOString(),
    expiresAt: createSessionExpiresAt_()
  };
  cleanupExpiredSessions_();
  saveSessionData_(token, payload);
  return token;
}

function clearSessionToken_(sessionToken) {
  const token = String(sessionToken || '').trim();
  if (!token) return;
  const key = getSessionStorageKey_(token);
  CacheService.getScriptCache().remove(key);
  PropertiesService.getScriptProperties().deleteProperty(key);
}

function getSessionStorageKey_(sessionToken) {
  return SESSION_STORE_PREFIX + String(sessionToken || '').trim();
}

function createSessionExpiresAt_() {
  return new Date(new Date().getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
}

function saveSessionData_(sessionToken, session) {
  const token = String(sessionToken || '').trim();
  if (!token || !session) return;

  const key = getSessionStorageKey_(token);
  const raw = JSON.stringify(session);
  CacheService.getScriptCache().put(key, raw, SESSION_TTL_SECONDS);
  PropertiesService.getScriptProperties().setProperty(key, raw);
}

function parseSessionData_(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function isSessionExpired_(session) {
  if (!session || !session.expiresAt) return false;
  const expiresAt = new Date(session.expiresAt).getTime();
  return isNaN(expiresAt) || expiresAt <= new Date().getTime();
}

function cleanupExpiredSessions_() {
  const props = PropertiesService.getScriptProperties();
  const allProps = props.getProperties();
  const cache = CacheService.getScriptCache();

  Object.keys(allProps).forEach(function(key) {
    if (key.indexOf(SESSION_STORE_PREFIX) !== 0) return;
    const session = parseSessionData_(allProps[key]);
    if (!session || isSessionExpired_(session)) {
      props.deleteProperty(key);
      cache.remove(key);
    }
  });
}

function toHex_(bytes) {
  return bytes.map(function (b) {
    const value = (b < 0) ? b + 256 : b;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
}

function hashPassword_(plainText, salt) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(salt || '') + '|' + String(plainText || ''),
    Utilities.Charset.UTF_8
  );
  return toHex_(digest);
}

function encodePassword_(plainText) {
  const salt = Utilities.getUuid().replace(/-/g, '');
  const hash = hashPassword_(plainText, salt);
  return PASSWORD_HASH_PREFIX + '$' + salt + '$' + hash;
}

function verifyPassword_(inputPassword, storedPassword) {
  const input = String(inputPassword || '');
  const stored = String(storedPassword || '');
  const parts = stored.split('$');

  if (parts.length === 3 && parts[0] === PASSWORD_HASH_PREFIX) {
    const salt = parts[1];
    const expected = parts[2];
    return hashPassword_(input, salt) === expected;
  }
  // 레거시 평문 비밀번호 호환
  return stored === input;
}

function validatePasswordPolicy_(password) {
  const value = String(password || '');
  const specialPattern = /[~`!@#$%^&*()_\-+={[}\]|\\:;"'<,>.?/]/;

  if (value.length < 8 || value.length > 20) {
    return { valid: false, message: '비밀번호는 8~20자로 입력해주세요.' };
  }
  if (/\s/.test(value)) {
    return { valid: false, message: '비밀번호에는 공백을 사용할 수 없습니다.' };
  }
  if (!/[a-z]/.test(value)) {
    return { valid: false, message: '비밀번호에 영어 소문자를 1자 이상 포함해주세요.' };
  }
  if (!/[0-9]/.test(value)) {
    return { valid: false, message: '비밀번호에 숫자를 1자 이상 포함해주세요.' };
  }
  if (!specialPattern.test(value)) {
    return { valid: false, message: '비밀번호에 특수문자를 1자 이상 포함해주세요.' };
  }
  return { valid: true, message: '' };
}

function getSessionData_(sessionToken) {
  const token = String(sessionToken || '').trim();
  if (!token) return null;

  const key = getSessionStorageKey_(token);
  const cache = CacheService.getScriptCache();
  let raw = cache.get(key);
  let session = parseSessionData_(raw);

  if (!session) {
    raw = PropertiesService.getScriptProperties().getProperty(key);
    session = parseSessionData_(raw);
  }

  if (!session) return null;

  if (isSessionExpired_(session)) {
    clearSessionToken_(token);
    return null;
  }

  if (!session.expiresAt) {
    session.expiresAt = createSessionExpiresAt_();
    saveSessionData_(token, session);
  } else if (!cache.get(key)) {
    cache.put(key, JSON.stringify(session), SESSION_TTL_SECONDS);
  }

  return session;
}

function requireSession_(sessionToken) {
  const token = String(sessionToken || '').trim();
  const session = getSessionData_(sessionToken);
  if (!session) return { success: false, message: '로그인 세션이 만료되었습니다. 다시 로그인해주세요.' };
  // 호출 시점마다 TTL을 연장해 사용 중 세션 만료로 인한 오동작을 줄입니다.
  session.expiresAt = createSessionExpiresAt_();
  saveSessionData_(token, session);
  return { success: true, session: session };
}

function logout(sessionToken) {
  try {
    clearSessionToken_(sessionToken);
    return { success: true };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * BS 시트 데이터 로딩 헬퍼
 * part가 '서비스1'~'서비스4' → 해당 시트만 로딩
 * part가 빈 문자열/null → 전체(서비스1~4) 통합
 * 반환: [{ sheetName, data(2d array) }, ...]
 */
function getBsSheetData_(part) {
  const requestedPart = String(part || '').trim();
  const targetSheets = requestedPart && BS_SERVICE_SHEETS.indexOf(requestedPart) !== -1
    ? [requestedPart]
    : BS_SERVICE_SHEETS.slice();
  return getBsSheetDataByNames_(targetSheets);
}

function getAuthorizedBsSheetData_(permissions, part) {
  const allowedSheets = getAllowedBsServiceSheets_(permissions);
  const requestedPart = String(part || '').trim();
  const targetSheets = requestedPart ? [requestedPart] : allowedSheets;

  return getBsSheetDataByNames_(targetSheets.filter(function(sheetName) {
    return allowedSheets.indexOf(sheetName) !== -1;
  }));
}

function getBsSheetDataByNames_(targetSheets) {
  const ss = SpreadsheetApp.openById(BS_SPREADSHEET_ID);
  const result = [];
  targetSheets.forEach(function(name) {
    const sheet = ss.getSheetByName(name);
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      result.push({ sheetName: name, data: data });
    }
  });
  return result;
}


/**
 * 영업점 주소록 검색 및 연관된 BS 데이터 집계
 */
function searchBranchAddress(sessionToken, keyword, part) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { error: auth.message };
    if (!isAllowedFlag_(auth.session.permissions.address)) return { error: '영업점 주소록 권한이 없습니다.' };

    const addressSs = SpreadsheetApp.openById(BRANCH_ADDRESS_SPREADSHEET_ID);
    const addressSheet = addressSs.getSheets()[0];
    const addressData = addressSheet.getDataRange().getValues();
    
    // 시트명 기반 BS 데이터 로딩
    const bsSheets = getBsSheetData_(part);

    const results = [];
    const searchKeyword = String(keyword || '').trim().toLowerCase().replace(/\s+/g, '');
    const searchPart = String(part || '').trim().toLowerCase();

    for (let i = 1; i < addressData.length; i++) {
        const rowPart = String(addressData[i][0] || '').trim().toLowerCase(); 
        const rowBranch = String(addressData[i][1] || '').trim().toLowerCase().replace(/\s+/g, '');
        
        if (rowBranch.includes(searchKeyword)) {
          if (!searchPart || rowPart.includes(searchPart)) {
            
            const branchInfo = {
              part: String(addressData[i][0] || ''),
              name: String(addressData[i][1] || ''),
              address: String(addressData[i][2] || ''),
              tel: String(addressData[i][3] || ''),
              managerTel: String(addressData[i][4] || ''),
              stats: {
                  totalTarget: 0,
                  completedTarget: 0,
                  bsTotal: 0,
                  bsCompleted: 0,
                  reworkTotal: 0,
                  reworkCompleted: 0,
                  bsList: [],
                  bsDoneList: [],
                  reworkList: [],
                  reworkDoneList: []
              }
            };

            // 매칭된 시트들에서 영업점 BS/리워크 현황 집계
            bsSheets.forEach(function(sheetObj) {
              const bsData = sheetObj.data;
              for (let j = 4; j < bsData.length; j++) {
                const bsRowBranch = String(bsData[j][4] || '').trim().toLowerCase();
                
                if (bsRowBranch === branchInfo.name.toLowerCase()) {
                  const vin = String(bsData[j][1] || '').trim();
                  const type = String(bsData[j][9] || '');
                  const isCompleted = String(bsData[j][12] || '').trim() !== '';
                  const vehicleItem = { vin: vin, completed: isCompleted, cartVersion: String(bsData[j][0] || '') };

                  if (type.includes('리워크')) {
                      branchInfo.stats.reworkTotal++;
                      if (isCompleted) {
                        branchInfo.stats.reworkCompleted++;
                        branchInfo.stats.reworkDoneList.push(vehicleItem);
                      } else {
                        branchInfo.stats.reworkList.push(vehicleItem);
                      }
                  } else if (type === 'O' || type === 'o') {
                      branchInfo.stats.bsTotal++;
                      if (isCompleted) {
                        branchInfo.stats.bsCompleted++;
                        branchInfo.stats.bsDoneList.push(vehicleItem);
                      } else {
                        branchInfo.stats.bsList.push(vehicleItem);
                      }
                  }
                }
              }
            });

            branchInfo.stats.totalTarget = branchInfo.stats.bsTotal + branchInfo.stats.reworkTotal;
            branchInfo.stats.completedTarget = branchInfo.stats.bsCompleted + branchInfo.stats.reworkCompleted;
            branchInfo.stats.completionRate = branchInfo.stats.totalTarget > 0 ? Math.round((branchInfo.stats.completedTarget / branchInfo.stats.totalTarget) * 100) : 0;
            branchInfo.stats.bsRate = branchInfo.stats.bsTotal > 0 ? Math.round((branchInfo.stats.bsCompleted / branchInfo.stats.bsTotal) * 100) : 0;
            branchInfo.stats.reworkRate = branchInfo.stats.reworkTotal > 0 ? Math.round((branchInfo.stats.reworkCompleted / branchInfo.stats.reworkTotal) * 100) : 0;

            results.push(branchInfo);
          }
        }
    }
    return results;
  } catch (e) {
    console.error('searchBranchAddress error: ' + e.toString());
    return { error: e.toString() };
  }
}

/**
 * 영업점별 통계 계산 헬퍼 (시트명 기반)
 * allDataSets: getBsSheetData_()의 반환값 [{ sheetName, data }, ...]
 */
function calculateBranchStats(targetBranchName, allDataSets) {
  let regularTotal = 0, regularCompleted = 0;
  let reworkTotal = 0, reworkCompleted = 0;
  
  const cleanTargetBranch = targetBranchName ? targetBranchName.toLowerCase().replace(/\s+/g, '') : '';

  allDataSets.forEach(function(sheetObj) {
    const data = sheetObj.data;
    for (let i = 4; i < data.length; i++) {
      const row = data[i];
      const rowBranch = String(row[4] || '').toLowerCase().trim().replace(/\s+/g, '');
      
      if (rowBranch === cleanTargetBranch) {
        const isCompleted = String(row[12] || '').trim() !== '';
        const type = String(row[9] || '');
        
        if (type.includes('리워크')) {
          reworkTotal++;
          if (isCompleted) reworkCompleted++;
        } else if (type === 'O' || type === 'o') {
          regularTotal++;
          if (isCompleted) regularCompleted++;
        }
      }
    }
  });
  
  const total = regularTotal + reworkTotal;
  const completed = regularCompleted + reworkCompleted;
  
  return {
    name: targetBranchName,
    total: total, completed: completed,
    rate: total ? Math.round((completed / total) * 100) : 0,
    regularTotal: regularTotal, regularCompleted: regularCompleted,
    regularRate: regularTotal ? Math.round((regularCompleted / regularTotal) * 100) : 0,
    reworkTotal: reworkTotal, reworkCompleted: reworkCompleted,
    reworkRate: reworkTotal ? Math.round((reworkCompleted / reworkTotal) * 100) : 0
  };
}

/**
 * BS 및 리워크 검색 (시트명 기반)
 */
function searchBS(sessionToken, keyword, part) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { error: auth.message };
    if (!hasBsPermission_(auth.session.permissions)) return { error: 'BS 조회 권한이 없습니다.' };
    if (!isAuthorizedBsPartRequest_(auth.session.permissions, part)) return { error: '해당 서비스 조회 권한이 없습니다.' };

    if (!keyword) return [];

    const bsSheets = getAuthorizedBsSheetData_(auth.session.permissions, part);
    const results = [];
    const searchStr = String(keyword).trim().toUpperCase();

    bsSheets.forEach(function(sheetObj) {
      const data = sheetObj.data;
      for (let i = 4; i < data.length; i++) {
        const row = data[i];
        const vin = String(row[1] || '').trim().toUpperCase();
        const barcodeVin = String(row[21] || '').trim().toUpperCase();

        if (vin.includes(searchStr) || barcodeVin.includes(searchStr)) {
          const vehicle = mapRowToVehicleData(row, i + 1);
          vehicle.sourceSheet = sheetObj.sheetName; // 어느 시트에서 찾았는지 기록
          vehicle.branchSummary = calculateBranchStats(vehicle.salesPoint, bsSheets);
          results.push(vehicle);
        }
      }
    });
    
    return results.slice(0, 30);
  } catch (e) {
    console.error('searchBS error: ' + e.toString());
    return { error: e.toString() };
  }
}

/**
 * 부품 장착 정보 검색 (시트명 기반)
 */
function searchInstallInfo(sessionToken, keyword) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { error: auth.message };
    if (!hasInstallInfoPermission_(auth.session.permissions)) return { error: '부품 장착 정보 조회 권한이 없습니다.' };

    const vinKeyword = normalizeLooseText_(keyword);
    if (!vinKeyword) return { error: '차대번호를 입력해주세요.' };

    const ss = SpreadsheetApp.openById(INSTALL_INFO_SPREADSHEET_ID);
    const cartSheet = ss.getSheetByName('카트 정보');
    const warrantySheet = ss.getSheetByName('부품보증기간');
    const installSheet = ss.getSheetByName('부품 장착 정보');
    if (!cartSheet || !warrantySheet || !installSheet) {
      return { error: '필수 시트를 찾을 수 없습니다. (카트 정보/부품보증기간/부품 장착 정보)' };
    }

    const cartLastRow = cartSheet.getLastRow();
    if (cartLastRow < 2) return { error: '카트 정보 시트에 조회할 데이터가 없습니다.' };

    const cartRowCount = cartLastRow - 1;
    const cartValues = cartSheet.getRange(2, 2, cartRowCount, 8).getValues(); // B~I
    const cartDisplayValues = cartSheet.getRange(2, 2, cartRowCount, 8).getDisplayValues(); // B~I
    const cartInfo = findCartInfoByVin_(cartValues, cartDisplayValues, vinKeyword);
    if (!cartInfo) return { error: '해당 차대번호를 카트 정보에서 찾을 수 없습니다.' };

    const warrantyLastRow = warrantySheet.getLastRow();
    const warrantyValues = warrantyLastRow > 0 ? warrantySheet.getRange(1, 1, warrantyLastRow, 4).getValues() : []; // A~D
    const warrantyDisplayValues = warrantyLastRow > 0 ? warrantySheet.getRange(1, 1, warrantyLastRow, 4).getDisplayValues() : []; // A~D

    const resolvedVin = cartInfo.normalizedVin;
    const cartVersion = cartInfo.cartVersion;
    const manufactureDate = cartInfo.manufactureDate;
    const baseDate = manufactureDate || '';

    const normalizedVersion = normalizeLooseText_(cartVersion);
    const partMap = buildPartWarrantyMap_(warrantyValues, warrantyDisplayValues, normalizedVersion);
    const parts = Object.keys(partMap);
    if (parts.length === 0) {
      return { error: '부품보증기간 시트에서 카트 버전에 해당하는 부품 기준을 찾지 못했습니다.' };
    }

    const today = new Date();
    const installMap = buildBestInstallMapByVinFromSheet_(installSheet, resolvedVin || vinKeyword);
    const items = parts.map(function(partName) {
      const fallbackInstalledDate = baseDate;
      const fallbackUsageDays = calcDaysFromDateString_(fallbackInstalledDate, today);
      const fallbackWarrantyDays = Number(partMap[partName] || 0);
      const fallbackWarrantyType = decideWarrantyType_(fallbackUsageDays, fallbackWarrantyDays);

      const installInfo = installMap[normalizeLooseText_(partName)];
      if (!installInfo) {
        return {
          partName: partName,
          installedDate: fallbackInstalledDate || '-',
          usageDays: fallbackUsageDays >= 0 ? String(fallbackUsageDays) : '-',
          warrantyType: fallbackWarrantyType,
          rank: 0,
          source: 'fallback'
        };
      }

      const installedDate = installInfo.installedDate || '-';
      const usageDaysNum = calcDaysFromDateString_(installedDate, today);
      const usageDaysDisplay = usageDaysNum >= 0 ? String(usageDaysNum) : '-';
      const warrantyDays = Number(partMap[partName] || 0);
      const warrantyTypeDisplay = decideWarrantyType_(usageDaysNum, warrantyDays);

      return {
        partName: partName,
        installedDate: installedDate,
        usageDays: usageDaysDisplay,
        warrantyType: warrantyTypeDisplay,
        rank: installInfo.rank,
        source: 'install'
      };
    });

    return {
      vin: cartInfo.vin || '-',
      cartVersion: cartVersion || '-',
      baseDate: baseDate || '-',
      searchedAt: Utilities.formatDate(today, 'GMT+9', 'yyyy-MM-dd'),
      items: items
    };
  } catch (e) {
    console.error('searchInstallInfo error: ' + e.toString());
    return { error: e.toString() };
  }
}

/**
 * 마스터 통계 조회 (시트명 기반)
 */
function getMasterStats(sessionToken, masterName, part) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { error: auth.message };
    if (!hasBsPermission_(auth.session.permissions)) return { error: 'BS 조회 권한이 없습니다.' };
    if (!isAuthorizedBsPartRequest_(auth.session.permissions, part)) return { error: '해당 서비스 조회 권한이 없습니다.' };

    const bsSheets = getAuthorizedBsSheetData_(auth.session.permissions, part);
    
    let regularTotal = 0, regularCompleted = 0;
    let reworkTotal = 0, reworkCompleted = 0;
    const branchStatsMap = {};

    const targetMaster = String(masterName).trim().toLowerCase();

    bsSheets.forEach(function(sheetObj) {
      const data = sheetObj.data;
      for (let i = 4; i < data.length; i++) {
        const row = data[i];
        const rowMaster = String(row[11] || '').trim().toLowerCase();
        
        if (rowMaster === targetMaster) {
          const isCompleted = String(row[12] || '').trim() !== '';
          const type = String(row[9] || '');
          const dispBranchName = String(row[4] || '기타');
          const cleanBranchName = String(row[4] || '기타').toLowerCase().replace(/\s+/g, '');

          if (type.includes('리워크')) {
            reworkTotal++;
            if (isCompleted) reworkCompleted++;
          } else if (type === 'O' || type === 'o') {
            regularTotal++;
            if (isCompleted) regularCompleted++;
          }

          if (!branchStatsMap[cleanBranchName]) {
            branchStatsMap[cleanBranchName] = { 
              name: dispBranchName, total: 0, completed: 0, 
              regularTotal: 0, regularCompleted: 0, 
              reworkTotal: 0, reworkCompleted: 0 
            };
          }
          const b = branchStatsMap[cleanBranchName];
          
          if (type.includes('리워크')) {
            b.reworkTotal++;
            if (isCompleted) b.reworkCompleted++;
          } else if (type === 'O' || type === 'o') {
            b.regularTotal++;
            if (isCompleted) b.regularCompleted++;
          }
        }
      }
    });
    
    const total = regularTotal + reworkTotal;
    const completed = regularCompleted + reworkCompleted;

    const branchStats = Object.values(branchStatsMap).map(b => {
      b.total = b.regularTotal + b.reworkTotal;
      b.completed = b.regularCompleted + b.reworkCompleted;
      return {
        ...b,
        rate: b.total ? Math.round((b.completed / b.total) * 100) : 0,
        regularRate: b.regularTotal ? Math.round((b.regularCompleted / b.regularTotal) * 100) : 0,
        reworkRate: b.reworkTotal ? Math.round((b.reworkCompleted / b.reworkTotal) * 100) : 0
      };
    }).sort((a, b) => b.rate - a.rate);

    return {
      total: total, completed: completed,
      completionRate: total ? Math.round((completed / total) * 100) : 0,
      regularTotal: regularTotal, regularCompleted: regularCompleted,
      regularCompletionRate: regularTotal ? Math.round((regularCompleted / regularTotal) * 100) : 0,
      reworkTotal: reworkTotal, reworkCompleted: reworkCompleted,
      reworkCompletionRate: reworkTotal ? Math.round((reworkCompleted / reworkTotal) * 100) : 0,
      branchStats: branchStats
    };
  } catch (e) {
    return { error: e.toString() };
  }
}

/**
 * BS 및 리워크 실적 조회
 * 권한이 허용된 서비스 시트의 현재 누적 진행 현황을 파트/마스터 단위로 집계합니다.
 */
function getBsPerformanceStats(sessionToken, partFilter, typeFilter) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message, parts: [] };
    if (!hasStatsPermission_(auth.session.permissions)) {
      return { success: false, message: '실적 통계 조회 권한이 없습니다.', parts: [] };
    }
    if (!hasBsPermission_(auth.session.permissions)) {
      return { success: false, message: 'BS 조회 권한이 없습니다.', parts: [] };
    }

    const requestedPartText = String(partFilter || '').trim();
    const requestedPart = !requestedPartText || requestedPartText === '전체' ? '' : requestedPartText;
    if (requestedPart && !isAuthorizedBsPartRequest_(auth.session.permissions, requestedPart)) {
      return { success: false, message: '해당 서비스 조회 권한이 없습니다.', parts: [] };
    }

    const requestedType = String(typeFilter || 'ALL').trim().toUpperCase();
    const selectedType = ['ALL', 'BS', 'REWORK'].indexOf(requestedType) !== -1 ? requestedType : 'ALL';
    const allowedParts = getAllowedBsServiceSheets_(auth.session.permissions);
    const targetParts = requestedPart ? [requestedPart] : allowedParts;
    const partStats = [];
    let ss = null;

    targetParts.forEach(function(sheetName) {
      let stats = getCachedBsPerformancePart_(sheetName);
      if (!stats) {
        if (!ss) ss = SpreadsheetApp.openById(BS_SPREADSHEET_ID);
        stats = buildBsPerformancePartFromSheet_(ss.getSheetByName(sheetName), sheetName);
        putCachedBsPerformancePart_(sheetName, stats);
      }
      partStats.push(stats);
    });

    const overall = createBsPerformanceMetricSet_();
    partStats.forEach(function(part) {
      mergeBsPerformanceMetricSet_(overall, part);
    });
    finalizeBsPerformanceMetricSet_(overall);

    return {
      success: true,
      asOfDate: Utilities.formatDate(new Date(), 'GMT+9', 'yyyy-MM-dd'),
      campaignYear: Utilities.formatDate(new Date(), 'GMT+9', 'yyyy'),
      partFilter: requestedPart || '전체',
      typeFilter: selectedType,
      allowedParts: allowedParts,
      overall: overall,
      parts: partStats
    };
  } catch (e) {
    return { success: false, message: e.toString(), parts: [] };
  }
}

function buildBsPerformancePartFromSheet_(sheet, sheetName) {
  const result = createBsPerformanceMetricSet_();
  result.part = String(sheetName || '').trim();
  result.masters = [];

  if (!sheet) {
    finalizeBsPerformanceMetricSet_(result);
    return result;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < BS_STATS_DATA_START_ROW) {
    finalizeBsPerformanceMetricSet_(result);
    return result;
  }

  // J~U: 대상구분, 파트, 마스터, 완료상태/일자, 메모/제외/폐기, 점검결과 4종
  const rows = sheet.getRange(BS_STATS_DATA_START_ROW, 10, lastRow - BS_STATS_DATA_START_ROW + 1, 12).getDisplayValues();
  const masters = {};

  rows.forEach(function(row) {
    const targetText = String(row[0] || '').trim(); // J
    const isRework = targetText.indexOf('리워크') !== -1;
    const isBs = targetText.toUpperCase() === 'O';
    if (!isBs && !isRework) return;

    const masterName = String(row[2] || '').trim() || '미지정'; // L
    const masterKey = 'master:' + normalizeLooseText_(masterName);
    if (!masters[masterKey]) {
      masters[masterKey] = createBsPerformanceMetricSet_();
      masters[masterKey].name = masterName;
    }

    const isCompleted = String(row[3] || '').trim() !== ''; // M
    const metricName = isRework ? 'rework' : 'bs';
    addBsPerformanceTarget_(result[metricName], isCompleted);
    addBsPerformanceTarget_(masters[masterKey][metricName], isCompleted);

    if (isBs && isCompleted) {
      addBsPerformanceGrades_(result.grades, row);
      addBsPerformanceGrades_(masters[masterKey].grades, row);
    }
  });

  result.masters = Object.keys(masters).map(function(key) {
    const master = masters[key];
    finalizeBsPerformanceMetricSet_(master);
    return master;
  }).sort(function(a, b) {
    if (a.name === '미지정') return 1;
    if (b.name === '미지정') return -1;
    return a.name.localeCompare(b.name, 'ko');
  });
  result.masterCount = result.masters.length;
  finalizeBsPerformanceMetricSet_(result);
  return result;
}

function createBsPerformanceMetricSet_() {
  return {
    bs: createBsPerformanceMetric_(),
    rework: createBsPerformanceMetric_(),
    grades: { s: 0, a: 0, b: 0, c: 0, total: 0, difference: 0 },
    masterCount: 0
  };
}

function createBsPerformanceMetric_() {
  return { target: 0, completed: 0, incomplete: 0, rate: null };
}

function addBsPerformanceTarget_(metric, isCompleted) {
  metric.target++;
  if (isCompleted) metric.completed++;
}

function addBsPerformanceGrades_(grades, row) {
  if (isAllowedFlag_(row[8])) grades.s++;  // R: 점검 -> S
  if (isAllowedFlag_(row[9])) grades.a++;  // S: 교체 -> A
  if (isAllowedFlag_(row[10])) grades.b++; // T: 이관 -> B
  if (isAllowedFlag_(row[11])) grades.c++; // U: 폐기 -> C
}

function finalizeBsPerformanceMetricSet_(metricSet) {
  finalizeBsPerformanceMetric_(metricSet.bs);
  finalizeBsPerformanceMetric_(metricSet.rework);
  const grades = metricSet.grades;
  grades.total = grades.s + grades.a + grades.b + grades.c;
  grades.difference = metricSet.bs.completed - grades.total;
  return metricSet;
}

function finalizeBsPerformanceMetric_(metric) {
  metric.incomplete = Math.max(metric.target - metric.completed, 0);
  metric.rate = metric.target > 0 ? Math.round((metric.completed / metric.target) * 1000) / 10 : null;
}

function mergeBsPerformanceMetricSet_(target, source) {
  ['bs', 'rework'].forEach(function(key) {
    target[key].target += Number(source[key].target || 0);
    target[key].completed += Number(source[key].completed || 0);
  });
  ['s', 'a', 'b', 'c'].forEach(function(key) {
    target.grades[key] += Number(source.grades[key] || 0);
  });
  target.masterCount += Number(source.masterCount || 0);
}

function getBsPerformancePartCacheKey_(sheetName) {
  return BS_STATS_CACHE_PREFIX + String(sheetName || '').trim();
}

function getCachedBsPerformancePart_(sheetName) {
  const raw = CacheService.getScriptCache().get(getBsPerformancePartCacheKey_(sheetName));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function putCachedBsPerformancePart_(sheetName, value) {
  try {
    CacheService.getScriptCache().put(
      getBsPerformancePartCacheKey_(sheetName),
      JSON.stringify(value),
      BS_STATS_CACHE_SECONDS
    );
  } catch (e) {
    console.warn('BS 실적 캐시 저장 실패: ' + e.toString());
  }
}

function clearBsPerformancePartCache_(sheetName) {
  CacheService.getScriptCache().remove(getBsPerformancePartCacheKey_(sheetName));
}

/**
 * 메모 저장 (시트명 기반 - 전체 시트 검색)
 */
function saveMemo(sessionToken, vin, memo) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message };
    if (!hasBsPermission_(auth.session.permissions)) return { success: false, message: '메모 저장 권한이 없습니다.' };

    const ss = SpreadsheetApp.openById(BS_SPREADSHEET_ID);
    const targetVin = String(vin).trim();

    const allowedSheets = getAllowedBsServiceSheets_(auth.session.permissions);
    for (let s = 0; s < allowedSheets.length; s++) {
      const sheet = ss.getSheetByName(allowedSheets[s]);
      if (!sheet) continue;
      const data = sheet.getDataRange().getValues();
      for (let i = 4; i < data.length; i++) {
        if (String(data[i][1]).trim() === targetVin) {
          sheet.getRange(i + 1, 15).setValue(memo); // O
          return { success: true, message: '비고가 저장되었습니다.' };
        }
      }
    }
    return { success: false, message: '해당 차대번호를 찾을 수 없습니다.' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * 점검 완료 처리 (시트명 기반 - 전체 시트 검색)
 */
function markAsComplete(sessionToken, vin, memo, processTypes) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message };
    if (!hasBsPermission_(auth.session.permissions)) return { success: false, message: '점검 완료 처리 권한이 없습니다.' };

    const ss = SpreadsheetApp.openById(BS_SPREADSHEET_ID);
    const today = Utilities.formatDate(new Date(), "GMT+9", "yyyy-MM-dd");
    const targetVin = String(vin).trim();

    const allowedSheets = getAllowedBsServiceSheets_(auth.session.permissions);
    for (let s = 0; s < allowedSheets.length; s++) {
      const sheet = ss.getSheetByName(allowedSheets[s]);
      if (!sheet) continue;
      const data = sheet.getDataRange().getValues();
      for (let i = 4; i < data.length; i++) {
        if (String(data[i][1]).trim() === targetVin) {
          const rowIdx = i + 1;
          sheet.getRange(rowIdx, 13).setValue('완료');      // M
          sheet.getRange(rowIdx, 14).setValue(today);      // N
          sheet.getRange(rowIdx, 15).setValue(memo);       // O
          
          if (processTypes) {
            sheet.getRange(rowIdx, 18).setValue(processTypes.inspection ? 'O' : ''); // R
            sheet.getRange(rowIdx, 19).setValue(processTypes.replace ? 'O' : '');    // S
            sheet.getRange(rowIdx, 20).setValue(processTypes.transfer ? 'O' : '');   // T
            sheet.getRange(rowIdx, 21).setValue(processTypes.disposal ? 'O' : '');   // U
          }

          clearBsPerformancePartCache_(allowedSheets[s]);
          
          return { success: true, message: '점검 완료 처리되었습니다.' };
        }
      }
    }
    return { success: false, message: '해당 차대번호를 찾을 수 없습니다.' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * 행 데이터를 객체로 변환
 */
function mapRowToVehicleData(row, rowNum) {
  function fmtDate(v) {
    if (!v) return '';
    if (v instanceof Date) return Utilities.formatDate(v, "GMT+9", "yyyy-MM-dd");
    return String(v).substring(0, 10);
  }

  return {
    row: rowNum,
    cartVersion: String(row[0] || ''),     // A
    vin: String(row[1] || '').trim(),      // B
    branch: String(row[2] || ''),          // C
    salesOffice: String(row[3] || ''),     // D
    salesPoint: String(row[4] || ''),      // E
    district: String(row[5] || ''),        // F
    manufactureDate: fmtDate(row[7]),      // H
    productionYear: String(row[8] || ''),   // I
    bsTarget: String(row[9] || ''),        // J
    part: String(row[10] || ''),           // K
    master: String(row[11] || ''),          // L
    completed: String(row[12] || ''),      // M
    completedDate: fmtDate(row[13]),       // N
    memo: String(row[14] || ''),           // O
    exclusionReason: String(row[15] || ''), // P
    disposalTarget: String(row[16] || ''),  // Q
    processInspection: String(row[17] || ''), // R
    processReplace: String(row[18] || ''),    // S
    processTransfer: String(row[19] || ''),   // T
    processDisposal: String(row[20] || ''),   // U
    barcodeVin: String(row[21] || '').trim()  // V
  };
}

function normalizeText(value) {
  return String(value || '').toLowerCase().trim().replace(/\s+/g, '');
}

/**
 * 배차 신청용 파트별 영업점 옵션 조회
 */
function getDeliveryBranchOptionsByPart(sessionToken, part) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message, items: [] };
    if (!hasAnyDeliveryPermission_(auth.session.permissions)) return { success: false, message: '배차 기능 권한이 없습니다.', items: [] };

    const selectedPart = String(part || '').trim();
    if (!selectedPart) return { success: true, items: [] };

    const ss = SpreadsheetApp.openById(BRANCH_ADDRESS_SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const partKey = normalizeText(selectedPart);
    const dedupe = {};
    const items = [];

    for (let i = 1; i < data.length; i++) {
      const rowPart = normalizeText(data[i][0]);
      const branch = String(data[i][1] || '').trim();
      const address = String(data[i][2] || '').trim();

      if (!branch) continue;
      if (rowPart !== partKey) continue;

      const key = normalizeText(branch);
      if (dedupe[key]) continue;
      dedupe[key] = true;
      items.push({ branch: branch, address: address });
    }

    items.sort(function (a, b) {
      return a.branch.localeCompare(b.branch, 'ko');
    });

    return { success: true, items: items };
  } catch (e) {
    return { success: false, message: e.toString(), items: [] };
  }
}

function formatDeliveryDate(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, 'GMT+9', 'yyyy-MM-dd');
  }
  const text = String(value).trim();
  const match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) {
    const y = match[1];
    const m = match[2].padStart(2, '0');
    const d = match[3].padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  return text.substring(0, 10);
}

function formatDeliveryDateTime(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, 'GMT+9', 'yyyy-MM-dd HH:mm');
  }
  const text = String(value).trim();
  const ymdhm = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\s+(\d{1,2}):(\d{1,2})/);
  if (ymdhm) {
    const y = ymdhm[1];
    const m = ymdhm[2].padStart(2, '0');
    const d = ymdhm[3].padStart(2, '0');
    const hh = ymdhm[4].padStart(2, '0');
    const mm = ymdhm[5].padStart(2, '0');
    return y + '-' + m + '-' + d + ' ' + hh + ':' + mm;
  }
  return formatDeliveryDate(value);
}

function getDateOnly(value) {
  return formatDeliveryDate(value);
}

function normalizeDeliveryStatus(rawStatus) {
  const status = normalizeText(rawStatus);
  if (status === 'cancel' || status === 'canceled' || status === 'cancelled' || status === '배차취소' || status === '취소') {
    return '배차취소';
  }
  if (status === 'approved' || status === '승인' || status === '배차승인') {
    return '배차승인';
  }
  if (status === 'moving' || status === '이동중' || status === '이동 중') {
    return '이동 중';
  }
  if (status === 'completed' || status === '배송완료' || status === '배송 완료') {
    return '배송완료';
  }
  return '배차신청';
}

function getBranchContactLookup_() {
  const byBranch = {};
  const ss = SpreadsheetApp.openById(BRANCH_ADDRESS_SPREADSHEET_ID);
  const sheet = ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const branchName = String(data[i][1] || '').trim(); // B: 영업점
    if (!branchName) continue;
    const key = normalizeText(branchName);
    if (!byBranch[key]) {
      byBranch[key] = {
        tel: String(data[i][3] || '').trim(), // D: 영업점 번호
        managerTel: String(data[i][4] || '').trim() // E: 점장 번호
      };
    }
  }

  return byBranch;
}

function getLoginUserLookup_() {
  const byName = {};
  const byEmpId = {};
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const empId = String(data[i][0] || '').trim(); // A
    const name = String(data[i][2] || '').trim(); // C
    const phone = String(data[i][3] || '').trim(); // D
    if (empId && !byEmpId[empId]) {
      byEmpId[empId] = { name: name, phone: phone };
    }
    if (name && !byName[name]) {
      byName[name] = { empId: empId, phone: phone };
    }
  }
  return { byName: byName, byEmpId: byEmpId };
}

function isSameEmployeeId_(left, right) {
  const a = String(left || '').trim();
  const b = String(right || '').trim();
  return !!a && !!b && a === b;
}

function getDeliveryCancelRequestFlag_(value) {
  return isAllowedFlag_(value);
}

function ensureDeliveryCancelColumns_(sheet) {
  const range = sheet.getRange(1, 21, 1, DELIVERY_CANCEL_HEADERS.length); // U~AB
  const current = range.getValues()[0];
  const next = DELIVERY_CANCEL_HEADERS.map(function(header, index) {
    return String(current[index] || '').trim() ? current[index] : header;
  });
  range.setValues([next]);
}

/**
 * 배차 목록 조회
 */
function getDeliveryList(sessionToken, filters) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message, items: [] };
    if (!hasDeliveryListPermission_(auth.session.permissions)) return { success: false, message: '배차 목록 조회 권한이 없습니다.', items: [] };

    return { success: true, items: getDeliveryListItems_(filters) };
  } catch (e) {
    return { success: false, message: e.toString(), items: [] };
  }
}

function getDeliveryListItems_(filters) {
  const filter = filters || {};
  const ss = SpreadsheetApp.openById(DELIVERY_SPREADSHEET_ID);
  const sheet = ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const items = [];

    const dateFrom = String(filter.dateFrom || filter.date || '').trim();
    const dateTo = String(filter.dateTo || filter.date || '').trim();
    const searchKey = String(filter.searchKey || 'originPart').trim();
    const searchValue = normalizeText(filter.searchValue || '');
    const statusFilter = String(filter.status || 'ALL').trim();

  const loginLookup = getLoginUserLookup_();
  const branchContactLookup = getBranchContactLookup_();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const item = {
        rowNo: i + 1,
        requesterName: String(row[0] || '').trim(), // A
        category: String(row[1] || '').trim(), // B
        categoryCustom: String(row[2] || '').trim(), // C
        originPart: String(row[3] || '').trim(), // D
        originBranch: String(row[4] || '').trim(), // E
        originAddress: String(row[5] || '').trim(), // F
        originManual: String(row[6] || '').trim(), // G
        contentsCart: String(row[7] || '').trim(), // H
        contentsMaterial: String(row[8] || '').trim(), // I
        destPart: String(row[9] || '').trim(), // J
        destBranch: String(row[10] || '').trim(), // K
        destAddress: String(row[11] || '').trim(), // L
        destManual: String(row[12] || '').trim(), // M
        preferredDate: formatDeliveryDate(row[13]), // N (배차 신청일/희망일)
        applyDate: formatDeliveryDate(row[13]), // N
        approvedDate: formatDeliveryDate(row[14]), // O (배차 승인일)
        note: String(row[15] || '').trim(), // P (비고)
        status: '', // Q (배차상태)
        pickupEmpName: String(row[17] || '').trim(), // R (담당기사명 또는 사번)
        pickupAt: formatDeliveryDateTime(row[18]), // S (회수일시)
        deliveryCompletedAt: formatDeliveryDateTime(row[19]), // T (배송완료일시)
        requesterEmpId: String(row[20] || '').trim(), // U (신청자사번)
        cancelRequested: getDeliveryCancelRequestFlag_(row[21]), // V (취소요청여부)
        cancelRequestedAt: formatDeliveryDateTime(row[22]), // W (취소요청일시)
        cancelRequesterEmpId: String(row[23] || '').trim(), // X
        cancelRequesterName: String(row[24] || '').trim(), // Y
        cancelApprovedAt: formatDeliveryDateTime(row[25]), // Z
        cancelApproverEmpId: String(row[26] || '').trim(), // AA
        cancelApproverName: String(row[27] || '').trim(), // AB
        requesterPhone: '', // 신청자 연락처
        driverPhone: '', // 로그인 계정 목록 D열(연락처) 매핑
        originTel: '', // 주소록 D열(영업점 번호)
        originManagerTel: '', // 주소록 E열(점장 번호)
        destTel: '', // 주소록 D열(영업점 번호)
        destManagerTel: '' // 주소록 E열(점장 번호)
      };

      const requesterKey = String(item.requesterName || '').trim();
      if (requesterKey) {
        const requesterByEmp = loginLookup.byEmpId[requesterKey];
        if (requesterByEmp) {
          item.requesterName = requesterByEmp.name || requesterKey;
          item.requesterPhone = requesterByEmp.phone || '';
        } else {
          const requesterByName = loginLookup.byName[requesterKey];
          if (requesterByName) {
            item.requesterPhone = requesterByName.phone || '';
          }
        }
      }

      const driverKey = String(item.pickupEmpName || '').trim();
      if (driverKey) {
        const byEmp = loginLookup.byEmpId[driverKey];
        if (byEmp) {
          item.pickupEmpName = byEmp.name || driverKey;
          item.driverPhone = byEmp.phone || '';
        } else {
          const byName = loginLookup.byName[driverKey];
          if (byName) {
            item.driverPhone = byName.phone || '';
          }
        }
      }

      const originKey = normalizeText(item.originBranch);
      if (originKey && branchContactLookup[originKey]) {
        item.originTel = branchContactLookup[originKey].tel || '';
        item.originManagerTel = branchContactLookup[originKey].managerTel || '';
      }

      const destKey = normalizeText(item.destBranch);
      if (destKey && branchContactLookup[destKey]) {
        item.destTel = branchContactLookup[destKey].tel || '';
        item.destManagerTel = branchContactLookup[destKey].managerTel || '';
      }

      item.status = normalizeDeliveryStatus(row[16]);
      if (item.status === '배차승인' && item.cancelRequested) {
        item.searchDate = item.cancelRequestedAt || item.approvedDate || item.applyDate;
      } else if (item.status === '이동 중') {
        item.searchDate = item.pickupAt || item.approvedDate || item.applyDate;
      } else if (item.status === '배송완료') {
        item.searchDate = item.deliveryCompletedAt || item.pickupAt || item.approvedDate || item.applyDate;
      } else {
        item.searchDate = item.approvedDate || item.applyDate;
      }

      const targetDate = getDateOnly(item.searchDate);

      if (!item.requesterName && !item.category) continue;
      if (dateFrom && (!targetDate || targetDate < dateFrom)) continue;
      if (dateTo && (!targetDate || targetDate > dateTo)) continue;
      if (statusFilter === 'ALL' && item.status === '배차취소') continue;
      if (statusFilter === 'APPLY' && item.status !== '배차신청') continue;
      if (statusFilter === 'APPROVED' && item.status !== '배차승인') continue;
      if (statusFilter === 'MOVING' && item.status !== '이동 중') continue;
      if (statusFilter === 'DONE' && item.status !== '배송완료') continue;
      if (statusFilter === 'CANCEL' && item.status !== '배차취소') continue;

      if (searchValue) {
        let target = '';
        if (searchKey === 'originPart') {
          target = item.originPart;
        } else if (searchKey === 'destPart') {
          target = item.destPart;
        } else if (searchKey === 'part') { // backward compatibility
          target = [item.originPart, item.destPart].join(' ');
        } else if (searchKey === 'origin') {
          target = [item.originBranch, item.originAddress, item.originManual].join(' ');
        } else if (searchKey === 'dest') {
          target = [item.destBranch, item.destAddress, item.destManual].join(' ');
        } else if (searchKey === 'requester') {
          target = item.requesterName;
        } else if (searchKey === 'cart') {
          target = item.contentsCart;
        } else if (searchKey === 'material') {
          target = item.contentsMaterial;
        }
        if (!normalizeText(target).includes(searchValue)) continue;
      }

      items.push(item);
    }

    items.sort(function (a, b) {
      const ad = a.searchDate || '';
      const bd = b.searchDate || '';
      if (ad === bd) return b.rowNo - a.rowNo;
      return ad < bd ? 1 : -1;
    });

  return items;
}

/**
 * 승인 대기/승인 목록 조회
 */
function getDeliveryApprovalList(sessionToken, filters) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message, items: [] };
    if (!hasDeliveryManagePermission_(auth.session.permissions)) return { success: false, message: '배차 승인 권한이 없습니다.', items: [] };

    const filter = filters || {};
    const dateFrom = String(filter.dateFrom || '').trim();
    const dateTo = String(filter.dateTo || '').trim();
    const searchKey = String(filter.searchKey || 'originPart').trim();
    const searchValue = String(filter.searchValue || '').trim();
    const status = String(filter.status || 'APPROVAL_QUEUE').trim();

    const deliveryItems = getDeliveryListItems_({
      dateFrom: dateFrom,
      dateTo: dateTo,
      searchKey: searchKey,
      searchValue: searchValue,
      status: 'ALL'
    });

    const items = deliveryItems.filter(function(item) {
      const isApply = item.status === '배차신청';
      const isCancelRequest = item.status === '배차승인' && item.cancelRequested;

      if (status === 'APPLY') return isApply;
      if (status === 'CANCEL_REQUEST') return isCancelRequest;
      return isApply || isCancelRequest;
    });

    return { success: true, items: items };
  } catch (e) {
    return { success: false, message: e.toString(), items: [] };
  }
}

/**
 * 기사 회수 탭 조회
 * 조건: 배차신청/배차승인 상태 조회, 회수 처리는 배차승인만 가능
 */
function getDriverPickupList(sessionToken, filters) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message, items: [] };
    if (!hasDriverPickupPermission_(auth.session.permissions)) return { success: false, message: '기사 회수 권한이 없습니다.', items: [] };

    const filter = filters || {};
    const dateFrom = String(filter.dateFrom || '').trim();
    const dateTo = String(filter.dateTo || '').trim();
    const pickupStatusFilter = String(filter.pickupStatus || 'ALL').trim().toUpperCase();
    const allowedPickupViewStatuses = ['배차신청', '배차승인'];
    const deliveryItems = getDeliveryListItems_({ status: 'ALL' });

    const items = deliveryItems.filter(function (item) {
      if (allowedPickupViewStatuses.indexOf(item.status) === -1) return false;
      if (pickupStatusFilter === 'APPLY' && item.status !== '배차신청') return false;
      if (pickupStatusFilter === 'APPROVED' && item.status !== '배차승인') return false;
      if (item.status === '배차승인' && item.cancelRequested) return false;
      const targetDate = getDateOnly(item.searchDate);
      if (dateFrom && (!targetDate || targetDate < dateFrom)) return false;
      if (dateTo && (!targetDate || targetDate > dateTo)) return false;
      return true;
    });

    return { success: true, items: items };
  } catch (e) {
    return { success: false, message: e.toString(), items: [] };
  }
}

/**
 * 기사 배송관리 탭 조회
 * 조건: 이동 중 + 본인이 회수 처리한 건
 */
function getDriverDeliveryList(sessionToken, filters) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message, items: [] };
    if (!hasDriverDeliveryPermission_(auth.session.permissions)) return { success: false, message: '기사 배송 권한이 없습니다.', items: [] };

    const filter = filters || {};
    const dateFrom = String(filter.dateFrom || '').trim();
    const dateTo = String(filter.dateTo || '').trim();
    const empName = String(auth.session.userName || '').trim();
    if (!empName) return { success: false, message: '기사 계정 정보가 없습니다.', items: [] };

    const deliveryItems = getDeliveryListItems_({ status: 'MOVING' });

    const items = deliveryItems.filter(function (item) {
      if (item.status !== '이동 중') return false;
      if (String(item.pickupEmpName || '').trim() !== empName) return false;
      const pickupDate = getDateOnly(item.pickupAt);
      if (dateFrom && (!pickupDate || pickupDate < dateFrom)) return false;
      if (dateTo && (!pickupDate || pickupDate > dateTo)) return false;
      return true;
    });

    return { success: true, items: items };
  } catch (e) {
    return { success: false, message: e.toString(), items: [] };
  }
}

/**
 * 기사 회수 처리
 * 배차승인 -> 이동 중
 */
function markDeliveryInTransit(sessionToken, rowNo) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message };
    if (!hasDriverPickupPermission_(auth.session.permissions)) return { success: false, message: '기사 회수 권한이 없습니다.' };

    const rowIndex = Number(rowNo);
    const empId = String(auth.session.employeeId || '').trim();
    const empName = String(auth.session.userName || '').trim();
    if (!rowIndex || rowIndex < 2) return { success: false, message: '유효하지 않은 행 번호입니다.' };
    if (!empName) return { success: false, message: '기사 계정 정보가 없습니다.' };

    const ss = SpreadsheetApp.openById(DELIVERY_SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];
    const currentStatus = normalizeDeliveryStatus(sheet.getRange(rowIndex, 17).getValue()); // Q
    if (currentStatus !== '배차승인') {
      return { success: false, message: '배차승인 상태에서만 회수 처리할 수 있습니다.' };
    }
    if (getDeliveryCancelRequestFlag_(sheet.getRange(rowIndex, 22).getValue())) { // V
      return { success: false, message: '취소 요청된 배차는 회수 처리할 수 없습니다.' };
    }

    const now = Utilities.formatDate(new Date(), 'GMT+9', 'yyyy-MM-dd HH:mm');
    sheet.getRange(rowIndex, 17).setValue('이동 중'); // Q
    sheet.getRange(rowIndex, 18).setValue(empId || empName); // R (사번 우선 저장)
    sheet.getRange(rowIndex, 19).setValue(now); // S

    return { success: true, message: '회수 처리되었습니다.', status: '이동 중', pickupAt: now };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * 기사 배송완료 처리
 * 이동 중 -> 배송완료
 */
function markDeliveryCompleted(sessionToken, rowNo) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message };
    if (!hasDriverDeliveryPermission_(auth.session.permissions)) return { success: false, message: '기사 배송 권한이 없습니다.' };

    const rowIndex = Number(rowNo);
    const empId = String(auth.session.employeeId || '').trim();
    const empName = String(auth.session.userName || '').trim();
    if (!rowIndex || rowIndex < 2) return { success: false, message: '유효하지 않은 행 번호입니다.' };
    if (!empName) return { success: false, message: '기사 계정 정보가 없습니다.' };

    const ss = SpreadsheetApp.openById(DELIVERY_SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];
    const currentStatus = normalizeDeliveryStatus(sheet.getRange(rowIndex, 17).getValue()); // Q
    if (currentStatus !== '이동 중') {
      return { success: false, message: '이동 중 상태에서만 배송완료 처리할 수 있습니다.' };
    }

    const pickupEmpName = String(sheet.getRange(rowIndex, 18).getValue() || '').trim(); // R
    if (pickupEmpName && pickupEmpName !== empName && pickupEmpName !== empId) {
      return { success: false, message: '본인이 회수한 항목만 배송완료 처리할 수 있습니다.' };
    }

    const now = Utilities.formatDate(new Date(), 'GMT+9', 'yyyy-MM-dd HH:mm');
    sheet.getRange(rowIndex, 17).setValue('배송완료'); // Q
    sheet.getRange(rowIndex, 20).setValue(now); // T

    return { success: true, message: '배송완료 처리되었습니다.', status: '배송완료', completedAt: now };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function validateBulkDeliveryPickupRows_(sheet, rowIndexes) {
  if (!rowIndexes || rowIndexes.length === 0) {
    return { success: false, message: '선택된 항목이 없습니다.' };
  }
  if (rowIndexes.length > 100) {
    return { success: false, message: '한 번에 처리할 수 있는 항목은 최대 100건입니다.' };
  }

  for (let i = 0; i < rowIndexes.length; i++) {
    const rowIndex = rowIndexes[i];
    const currentStatus = normalizeDeliveryStatus(sheet.getRange(rowIndex, 17).getValue()); // Q
    if (currentStatus !== '배차승인') {
      return {
        success: false,
        message: '선택한 항목 중 배차승인 상태가 아닌 건이 있습니다. 목록을 새로고침 후 다시 시도해주세요.'
      };
    }
    if (getDeliveryCancelRequestFlag_(sheet.getRange(rowIndex, 22).getValue())) { // V
      return {
        success: false,
        message: '선택한 항목 중 취소 요청된 건이 있습니다. 목록을 새로고침 후 다시 시도해주세요.'
      };
    }
  }
  return { success: true };
}

function validateBulkDeliveryCompleteRows_(sheet, rowIndexes, empId, empName) {
  if (!rowIndexes || rowIndexes.length === 0) {
    return { success: false, message: '선택된 항목이 없습니다.' };
  }
  if (rowIndexes.length > 100) {
    return { success: false, message: '한 번에 처리할 수 있는 항목은 최대 100건입니다.' };
  }

  for (let i = 0; i < rowIndexes.length; i++) {
    const rowIndex = rowIndexes[i];
    const currentStatus = normalizeDeliveryStatus(sheet.getRange(rowIndex, 17).getValue()); // Q
    if (currentStatus !== '이동 중') {
      return {
        success: false,
        message: '선택한 항목 중 이동 중 상태가 아닌 건이 있습니다. 목록을 새로고침 후 다시 시도해주세요.'
      };
    }

    const pickupEmpName = String(sheet.getRange(rowIndex, 18).getValue() || '').trim(); // R
    if (pickupEmpName && pickupEmpName !== empName && pickupEmpName !== empId) {
      return {
        success: false,
        message: '선택한 항목 중 본인이 회수하지 않은 건이 있습니다. 목록을 새로고침 후 다시 시도해주세요.'
      };
    }
  }
  return { success: true };
}

/**
 * 기사 일괄 회수 처리
 * 배차승인 -> 이동 중
 */
function bulkMarkDeliveryInTransit(sessionToken, rowNos) {
  const lock = LockService.getScriptLock();
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message };
    if (!hasDriverPickupPermission_(auth.session.permissions)) return { success: false, message: '기사 회수 권한이 없습니다.' };

    const rowIndexes = normalizeDeliveryRowNos_(rowNos);
    const empId = String(auth.session.employeeId || '').trim();
    const empName = String(auth.session.userName || '').trim();
    if (!empName) return { success: false, message: '기사 계정 정보가 없습니다.' };

    const ss = SpreadsheetApp.openById(DELIVERY_SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];

    lock.waitLock(10000);
    ensureDeliveryCancelColumns_(sheet);
    const validation = validateBulkDeliveryPickupRows_(sheet, rowIndexes);
    if (!validation.success) return validation;

    const now = Utilities.formatDate(new Date(), 'GMT+9', 'yyyy-MM-dd HH:mm');
    rowIndexes.forEach(function(rowIndex) {
      sheet.getRange(rowIndex, 17).setValue('이동 중'); // Q
      sheet.getRange(rowIndex, 18).setValue(empId || empName); // R
      sheet.getRange(rowIndex, 19).setValue(now); // S
    });

    return { success: true, message: rowIndexes.length + '건이 회수 처리되었습니다.', count: rowIndexes.length };
  } catch (e) {
    return { success: false, message: e.toString() };
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {
      // Lock이 획득되지 않은 상태의 release 오류는 무시합니다.
    }
  }
}

/**
 * 기사 일괄 배송완료 처리
 * 이동 중 -> 배송완료
 */
function bulkMarkDeliveryCompleted(sessionToken, rowNos) {
  const lock = LockService.getScriptLock();
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message };
    if (!hasDriverDeliveryPermission_(auth.session.permissions)) return { success: false, message: '기사 배송 권한이 없습니다.' };

    const rowIndexes = normalizeDeliveryRowNos_(rowNos);
    const empId = String(auth.session.employeeId || '').trim();
    const empName = String(auth.session.userName || '').trim();
    if (!empName) return { success: false, message: '기사 계정 정보가 없습니다.' };

    const ss = SpreadsheetApp.openById(DELIVERY_SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];

    lock.waitLock(10000);
    const validation = validateBulkDeliveryCompleteRows_(sheet, rowIndexes, empId, empName);
    if (!validation.success) return validation;

    const now = Utilities.formatDate(new Date(), 'GMT+9', 'yyyy-MM-dd HH:mm');
    rowIndexes.forEach(function(rowIndex) {
      sheet.getRange(rowIndex, 17).setValue('배송완료'); // Q
      sheet.getRange(rowIndex, 20).setValue(now); // T
    });

    return { success: true, message: rowIndexes.length + '건이 배송완료 처리되었습니다.', count: rowIndexes.length };
  } catch (e) {
    return { success: false, message: e.toString() };
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {
      // Lock이 획득되지 않은 상태의 release 오류는 무시합니다.
    }
  }
}

/**
 * 배차 승인 처리
 */
function approveDeliveryRequest(sessionToken, rowNo) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message };
    if (!hasDeliveryManagePermission_(auth.session.permissions)) return { success: false, message: '배차 승인 권한이 없습니다.' };

    const rowIndex = Number(rowNo);
    if (!rowIndex || rowIndex < 2) return { success: false, message: '유효하지 않은 행 번호입니다.' };

    const ss = SpreadsheetApp.openById(DELIVERY_SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];
    const currentStatus = normalizeDeliveryStatus(sheet.getRange(rowIndex, 17).getValue()); // Q
    if (currentStatus !== '배차신청') {
      return { success: false, message: '배차신청 상태에서만 승인할 수 있습니다.' };
    }
    const today = Utilities.formatDate(new Date(), 'GMT+9', 'yyyy-MM-dd');

    sheet.getRange(rowIndex, 15).setValue(today); // O
    sheet.getRange(rowIndex, 17).setValue('배차승인'); // Q

    return { success: true, message: '배차 승인 처리되었습니다.', approvedDate: today };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function normalizeDeliveryRowNos_(rowNos) {
  const seen = {};
  const rows = [];
  (rowNos || []).forEach(function(rowNo) {
    const rowIndex = Number(rowNo);
    if (!rowIndex || rowIndex < 2) return;
    if (seen[rowIndex]) return;
    seen[rowIndex] = true;
    rows.push(rowIndex);
  });
  return rows;
}

function validateBulkDeliveryApplyRows_(sheet, rowIndexes) {
  if (!rowIndexes || rowIndexes.length === 0) {
    return { success: false, message: '선택된 항목이 없습니다.' };
  }
  if (rowIndexes.length > 100) {
    return { success: false, message: '한 번에 처리할 수 있는 항목은 최대 100건입니다.' };
  }

  for (let i = 0; i < rowIndexes.length; i++) {
    const rowIndex = rowIndexes[i];
    const currentStatus = normalizeDeliveryStatus(sheet.getRange(rowIndex, 17).getValue()); // Q
    if (currentStatus !== '배차신청') {
      return {
        success: false,
        message: '선택한 항목 중 배차신청 상태가 아닌 건이 있습니다. 목록을 새로고침 후 다시 시도해주세요.'
      };
    }
  }
  return { success: true };
}

/**
 * 배차 일괄 승인 처리
 */
function bulkApproveDeliveryRequests(sessionToken, rowNos) {
  const lock = LockService.getScriptLock();
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message };
    if (!hasDeliveryManagePermission_(auth.session.permissions)) return { success: false, message: '배차 승인 권한이 없습니다.' };

    const rowIndexes = normalizeDeliveryRowNos_(rowNos);
    const ss = SpreadsheetApp.openById(DELIVERY_SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];

    lock.waitLock(10000);
    const validation = validateBulkDeliveryApplyRows_(sheet, rowIndexes);
    if (!validation.success) return validation;

    const today = Utilities.formatDate(new Date(), 'GMT+9', 'yyyy-MM-dd');
    rowIndexes.forEach(function(rowIndex) {
      sheet.getRange(rowIndex, 15).setValue(today); // O
      sheet.getRange(rowIndex, 17).setValue('배차승인'); // Q
    });

    return { success: true, message: rowIndexes.length + '건이 배차 승인 처리되었습니다.', count: rowIndexes.length };
  } catch (e) {
    return { success: false, message: e.toString() };
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {
      // Lock이 획득되지 않은 상태의 release 오류는 무시합니다.
    }
  }
}

/**
 * 배차 일괄 취소 처리
 * 배차신청 -> 배차취소
 */
function bulkCancelDeliveryRequests(sessionToken, rowNos) {
  const lock = LockService.getScriptLock();
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message };
    if (!hasDeliveryManagePermission_(auth.session.permissions)) return { success: false, message: '배차 취소 권한이 없습니다.' };

    const rowIndexes = normalizeDeliveryRowNos_(rowNos);
    const empId = String(auth.session.employeeId || '').trim();
    const empName = String(auth.session.userName || '').trim();
    const ss = SpreadsheetApp.openById(DELIVERY_SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];

    lock.waitLock(10000);
    ensureDeliveryCancelColumns_(sheet);
    const validation = validateBulkDeliveryApplyRows_(sheet, rowIndexes);
    if (!validation.success) return validation;

    const now = Utilities.formatDate(new Date(), 'GMT+9', 'yyyy-MM-dd HH:mm');
    rowIndexes.forEach(function(rowIndex) {
      sheet.getRange(rowIndex, 17).setValue('배차취소'); // Q
      sheet.getRange(rowIndex, 26).setValue(now); // Z
      sheet.getRange(rowIndex, 27).setValue(empId); // AA
      sheet.getRange(rowIndex, 28).setValue(empName); // AB
    });

    return { success: true, message: rowIndexes.length + '건이 배차 취소 처리되었습니다.', count: rowIndexes.length };
  } catch (e) {
    return { success: false, message: e.toString() };
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {
      // Lock이 획득되지 않은 상태의 release 오류는 무시합니다.
    }
  }
}

/**
 * 배차 취소 처리
 * 배차신청 -> 배차취소
 */
function cancelDeliveryRequest(sessionToken, rowNo) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message };

    const rowIndex = Number(rowNo);
    const empId = String(auth.session.employeeId || '').trim();
    const empName = String(auth.session.userName || '').trim();
    if (!rowIndex || rowIndex < 2) return { success: false, message: '유효하지 않은 행 번호입니다.' };

    const ss = SpreadsheetApp.openById(DELIVERY_SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];
    ensureDeliveryCancelColumns_(sheet);
    const currentStatus = normalizeDeliveryStatus(sheet.getRange(rowIndex, 17).getValue()); // Q
    const requesterEmpId = String(sheet.getRange(rowIndex, 21).getValue() || '').trim(); // U
    const isManager = hasDeliveryManagePermission_(auth.session.permissions);
    const isRequester = isSameEmployeeId_(requesterEmpId, empId);

    if (currentStatus !== '배차신청' && currentStatus !== '배차승인') {
      return { success: false, message: '배차신청 또는 배차승인 상태에서만 취소할 수 있습니다.' };
    }
    if (!isManager && currentStatus !== '배차신청') {
      return { success: false, message: '배차승인 상태는 취소 요청만 가능합니다.' };
    }
    if (!isManager && !isRequester) {
      return { success: false, message: '신청자 본인만 취소할 수 있습니다.' };
    }

    const now = Utilities.formatDate(new Date(), 'GMT+9', 'yyyy-MM-dd HH:mm');
    sheet.getRange(rowIndex, 17).setValue('배차취소'); // Q
    if (isRequester) {
      sheet.getRange(rowIndex, 22).setValue('O'); // V
      sheet.getRange(rowIndex, 23).setValue(now); // W
      sheet.getRange(rowIndex, 24).setValue(empId); // X
      sheet.getRange(rowIndex, 25).setValue(empName); // Y
    }
    sheet.getRange(rowIndex, 26).setValue(now); // Z
    sheet.getRange(rowIndex, 27).setValue(empId); // AA
    sheet.getRange(rowIndex, 28).setValue(empName); // AB
    return { success: true, message: '배차 취소 처리되었습니다.', status: '배차취소' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * 배차 취소 요청
 * 배차승인 -> 배차승인(취소요청 플래그)
 */
function requestDeliveryCancel(sessionToken, rowNo) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message };
    if (!hasAnyDeliveryPermission_(auth.session.permissions)) return { success: false, message: '배차 취소 요청 권한이 없습니다.' };

    const rowIndex = Number(rowNo);
    const empId = String(auth.session.employeeId || '').trim();
    const empName = String(auth.session.userName || '').trim();
    if (!rowIndex || rowIndex < 2) return { success: false, message: '유효하지 않은 행 번호입니다.' };

    const ss = SpreadsheetApp.openById(DELIVERY_SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];
    ensureDeliveryCancelColumns_(sheet);
    const currentStatus = normalizeDeliveryStatus(sheet.getRange(rowIndex, 17).getValue()); // Q
    if (currentStatus !== '배차승인') {
      return { success: false, message: '배차승인 상태에서만 취소 요청할 수 있습니다.' };
    }

    const requesterEmpId = String(sheet.getRange(rowIndex, 21).getValue() || '').trim(); // U
    if (!isSameEmployeeId_(requesterEmpId, empId)) {
      return { success: false, message: '신청자 본인만 취소 요청할 수 있습니다.' };
    }
    if (getDeliveryCancelRequestFlag_(sheet.getRange(rowIndex, 22).getValue())) { // V
      return { success: false, message: '이미 취소 요청된 배차입니다.' };
    }

    const now = Utilities.formatDate(new Date(), 'GMT+9', 'yyyy-MM-dd HH:mm');
    sheet.getRange(rowIndex, 22).setValue('O'); // V
    sheet.getRange(rowIndex, 23).setValue(now); // W
    sheet.getRange(rowIndex, 24).setValue(empId); // X
    sheet.getRange(rowIndex, 25).setValue(empName); // Y

    return { success: true, message: '배차 취소 요청이 등록되었습니다.', cancelRequested: true, cancelRequestedAt: now };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * 배차 취소 요청 승인
 * 배차승인(취소요청 플래그) -> 배차취소
 */
function approveDeliveryCancelRequest(sessionToken, rowNo) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message };
    if (!hasDeliveryManagePermission_(auth.session.permissions)) return { success: false, message: '배차 취소 승인 권한이 없습니다.' };

    const rowIndex = Number(rowNo);
    const empId = String(auth.session.employeeId || '').trim();
    const empName = String(auth.session.userName || '').trim();
    if (!rowIndex || rowIndex < 2) return { success: false, message: '유효하지 않은 행 번호입니다.' };

    const ss = SpreadsheetApp.openById(DELIVERY_SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];
    ensureDeliveryCancelColumns_(sheet);
    const currentStatus = normalizeDeliveryStatus(sheet.getRange(rowIndex, 17).getValue()); // Q
    if (currentStatus !== '배차승인') {
      return { success: false, message: '배차승인 상태의 취소 요청만 승인할 수 있습니다.' };
    }
    if (!getDeliveryCancelRequestFlag_(sheet.getRange(rowIndex, 22).getValue())) { // V
      return { success: false, message: '취소 요청된 배차가 아닙니다.' };
    }

    const now = Utilities.formatDate(new Date(), 'GMT+9', 'yyyy-MM-dd HH:mm');
    sheet.getRange(rowIndex, 17).setValue('배차취소'); // Q
    sheet.getRange(rowIndex, 26).setValue(now); // Z
    sheet.getRange(rowIndex, 27).setValue(empId); // AA
    sheet.getRange(rowIndex, 28).setValue(empName); // AB

    return { success: true, message: '취소 요청이 승인되었습니다.', status: '배차취소', cancelApprovedAt: now };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * 배차 신청 저장
 */
function saveDeliveryApply(sessionToken, payload) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message };
    if (!hasAnyDeliveryPermission_(auth.session.permissions)) return { success: false, message: '배차 신청 권한이 없습니다.' };

    if (!payload) return { success: false, message: '데이터가 없습니다.' };

    const requesterName = String(payload.requesterName || '').trim();
    const requesterEmpId = String(auth.session.employeeId || '').trim();
    const category = String(payload.category || '').trim();
    const categoryCustom = String(payload.categoryCustom || '').trim();
    const originPart = String(payload.originPart || '').trim();
    const originBranch = String(payload.originBranch || '').trim();
    const originAddress = String(payload.originAddress || '').trim();
    const originManual = String(payload.originManual || '').trim();
    const contentsCart = String(payload.contentsCart || '').trim();
    const contentsMaterial = String(payload.contentsMaterial || '').trim();
    const destPart = String(payload.destPart || '').trim();
    const destBranch = String(payload.destBranch || '').trim();
    const destAddress = String(payload.destAddress || '').trim();
    const destManual = String(payload.destManual || '').trim();
    const preferredDate = String(payload.preferredDate || '').trim();
    const note = String(payload.note || '').trim();
    const maxContentsCount = 6;

    const cartItems = contentsCart
      ? contentsCart.split(',').map(function(item) { return String(item || '').trim(); }).filter(function(item) { return item !== ''; })
      : [];
    const materialItems = contentsMaterial
      ? contentsMaterial.split(',').map(function(item) { return String(item || '').trim(); }).filter(function(item) { return item !== ''; })
      : [];

    if (!requesterName || !category || !preferredDate) return { success: false, message: '필수 항목이 누락되었습니다.' };
    if (cartItems.length > maxContentsCount) return { success: false, message: '카트는 최대 6개까지 입력 가능합니다.' };
    if (materialItems.length > maxContentsCount) return { success: false, message: '자재는 최대 6개까지 입력 가능합니다.' };

    const ss = SpreadsheetApp.openById(DELIVERY_SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];
    ensureDeliveryCancelColumns_(sheet);

    const row = [
      requesterName, // A
      category, // B
      categoryCustom, // C
      originPart, // D
      originBranch, // E
      originAddress, // F
      originManual, // G
      contentsCart, // H
      contentsMaterial, // I
      destPart, // J
      destBranch, // K
      destAddress, // L
      destManual, // M
      preferredDate, // N
      '', // O
      note, // P
      '배차신청', // Q
      '', // R 담당기사명
      '', // S 회수일자
      '', // T 배송완료일자
      requesterEmpId, // U 신청자사번
      '', // V 취소요청여부
      '', // W 취소요청일시
      '', // X 취소요청자사번
      '', // Y 취소요청자명
      '', // Z 취소승인일시
      '', // AA 취소승인자사번
      '' // AB 취소승인자명
    ];

    sheet.appendRow(row);
    return { success: true, message: '배차 신청이 저장되었습니다.' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function lookupBarcode(sessionToken, barcode) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { found: false, error: auth.message };
    if (!hasBsPermission_(auth.session.permissions) && !hasInstallInfoPermission_(auth.session.permissions)) {
      return { found: false, error: '바코드 조회 권한이 없습니다.' };
    }

    const ss = SpreadsheetApp.openById(INSTALL_INFO_SPREADSHEET_ID);
    const sheet = ss.getSheetByName('카트 정보');
    if (!sheet) return { found: false, error: '카트 정보 시트를 찾을 수 없습니다.' };
    const data = sheet.getDataRange().getDisplayValues();
    const search = normalizeLooseText_(barcode);
    if (!search) return { found: false };

    for (let i = 1; i < data.length; i++) {
      const barcodeValue = normalizeLooseText_(data[i][0]); // A: 바코드
      if (barcodeValue && barcodeValue === search) {
        return { found: true, vin: String(data[i][1] || '').trim() }; // B: 차대번호
      }
    }
    return { found: false };
  } catch (e) {
    return { found: false, error: e.toString() };
  }
}

function normalizeLooseText_(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function toNumberOrZero_(value) {
  const n = Number(String(value || '').replace(/,/g, '').trim());
  return isNaN(n) ? 0 : n;
}

function formatDateSafe_(rawValue, displayValue) {
  if (rawValue instanceof Date) return Utilities.formatDate(rawValue, 'GMT+9', 'yyyy-MM-dd');
  const display = String(displayValue || '').trim();
  if (display) return display.substring(0, 10);
  const raw = String(rawValue || '').trim();
  return raw ? raw.substring(0, 10) : '';
}

function findCartInfoByVin_(cartValues, cartDisplayValues, vinKeyword) {
  const keyword = normalizeLooseText_(vinKeyword);
  if (!keyword) return null;

  function toCartInfo(index) {
    const values = cartValues[index] || [];
    const displays = cartDisplayValues[index] || [];
    const vin = String(displays[0] || values[0] || '').trim(); // B
    return {
      vin: vin,
      normalizedVin: normalizeLooseText_(vin),
      cartVersion: String(displays[1] || values[1] || '').trim(), // C
      manufactureDate: formatDateSafe_(values[7], displays[7]) // I
    };
  }

  for (let i = 0; i < cartValues.length; i++) {
    const vin = normalizeLooseText_((cartDisplayValues[i] || [])[0] || (cartValues[i] || [])[0]); // B
    if (vin === keyword) return toCartInfo(i);
  }

  for (let i = 0; i < cartValues.length; i++) {
    const vin = normalizeLooseText_((cartDisplayValues[i] || [])[0] || (cartValues[i] || [])[0]); // B
    if (!vin) continue;
    if (vin.indexOf(keyword) !== -1) return toCartInfo(i);
    if (keyword.indexOf(vin) !== -1) return toCartInfo(i);
  }
  return null;
}

function findCartRowByVin_(cartValues, vinKeyword) {
  const keyword = normalizeLooseText_(vinKeyword);
  if (!keyword) return -1;

  // 1) 정확 일치 우선
  for (let i = 1; i < cartValues.length; i++) {
    const vin = normalizeLooseText_(cartValues[i][1]); // B
    if (vin === keyword) return i;
  }

  // 2) 부분 일치
  for (let i = 1; i < cartValues.length; i++) {
    const vin = normalizeLooseText_(cartValues[i][1]); // B
    if (!vin) continue;
    if (vin.indexOf(keyword) !== -1) return i;
    if (keyword.indexOf(vin) !== -1) return i;
  }
  return -1;
}

function buildPartWarrantyMap_(warrantyValues, warrantyDisplayValues, normalizedVersion) {
  const partMap = {};
  for (let i = 1; i < warrantyValues.length; i++) {
    const versionCond = String(warrantyDisplayValues[i][0] || warrantyValues[i][0] || '').trim(); // A
    const partName = String(warrantyDisplayValues[i][2] || warrantyValues[i][2] || '').trim(); // C
    const warrantyDays = toNumberOrZero_(warrantyDisplayValues[i][3] || warrantyValues[i][3]); // D
    if (!partName) continue;
    if (!versionCond || !isCartVersionMatched_(versionCond, normalizedVersion)) continue;
    if (!partMap[partName] || warrantyDays > partMap[partName]) {
      partMap[partName] = warrantyDays;
    }
  }
  return partMap;
}

function isCartVersionMatched_(versionCond, normalizedVersion) {
  const tokens = String(versionCond || '').split(',').map(function(token) {
    return normalizeLooseText_(token);
  }).filter(function(token) { return !!token; });
  if (tokens.length === 0) return false;
  return tokens.indexOf(normalizedVersion) !== -1;
}

function buildBestInstallMapByVin_(installValues, installDisplayValues, vinKeyword) {
  const targetVin = normalizeLooseText_(vinKeyword);
  const byPart = {};
  if (!targetVin) return byPart;

  for (let i = 0; i < installValues.length; i++) {
    const values = installValues[i] || [];
    const displays = installDisplayValues[i] || [];
    const vin = normalizeLooseText_(displays[0] || values[0]); // G
    if (vin !== targetVin) continue;

    const partKey = normalizeLooseText_(displays[3] || values[3]); // J
    if (!partKey) continue;

    const rank = toNumberOrZero_(displays[5] || values[5]); // L
    if (!byPart[partKey] || rank > byPart[partKey].rank) {
      byPart[partKey] = {
        installedDate: formatDateSafe_(values[8], displays[8]), // O
        rank: rank
      };
    }
  }

  return byPart;
}

function buildBestInstallMapByVinFromSheet_(installSheet, vinKeyword) {
  const targetVin = normalizeLooseText_(vinKeyword);
  const byPart = {};
  if (!targetVin) return byPart;

  const lastRow = installSheet.getLastRow();
  if (lastRow < 2) return byPart;

  const vinRange = installSheet.getRange(2, 7, lastRow - 1, 1); // G
  const matches = vinRange.createTextFinder(targetVin)
    .matchCase(false)
    .findAll();
  if (!matches || matches.length === 0) return byPart;

  const rowNumbers = matches.map(function(range) {
    return range.getRow();
  }).sort(function(a, b) {
    return a - b;
  });
  const groups = buildContiguousRowGroups_(rowNumbers);

  groups.forEach(function(group) {
    const values = installSheet.getRange(group.start, 7, group.count, 9).getValues(); // G~O
    const displayValues = installSheet.getRange(group.start, 7, group.count, 9).getDisplayValues(); // G~O

    for (let i = 0; i < values.length; i++) {
      const rowValues = values[i] || [];
      const rowDisplays = displayValues[i] || [];
      const vin = normalizeLooseText_(rowDisplays[0] || rowValues[0]); // G
      if (vin !== targetVin) continue;

      const partKey = normalizeLooseText_(rowDisplays[3] || rowValues[3]); // J
      if (!partKey) continue;

      const rank = toNumberOrZero_(rowDisplays[5] || rowValues[5]); // L
      if (!byPart[partKey] || rank > byPart[partKey].rank) {
        byPart[partKey] = {
          installedDate: formatDateSafe_(rowValues[8], rowDisplays[8]), // O
          rank: rank
        };
      }
    }
  });

  return byPart;
}

function buildContiguousRowGroups_(rowNumbers) {
  const groups = [];
  let start = null;
  let prev = null;

  rowNumbers.forEach(function(row) {
    if (start === null) {
      start = row;
      prev = row;
      return;
    }
    if (row === prev + 1) {
      prev = row;
      return;
    }
    groups.push({ start: start, count: prev - start + 1 });
    start = row;
    prev = row;
  });

  if (start !== null) {
    groups.push({ start: start, count: prev - start + 1 });
  }
  return groups;
}

function findBestInstallRow_(installValues, installDisplayValues, vinKeyword, partName) {
  const targetVin = normalizeLooseText_(vinKeyword);
  const targetPart = normalizeLooseText_(partName);
  let bestRow = -1;
  let bestRank = -1;

  for (let i = 1; i < installValues.length; i++) {
    const vin = normalizeLooseText_(installDisplayValues[i][6] || installValues[i][6]); // G
    const partUnified = normalizeLooseText_(installDisplayValues[i][9] || installValues[i][9]); // J
    if (vin !== targetVin || partUnified !== targetPart) continue;

    const rank = toNumberOrZero_(installDisplayValues[i][11] || installValues[i][11]); // L
    if (rank > bestRank) {
      bestRank = rank;
      bestRow = i;
    }
  }
  return bestRow;
}

function calcDaysFromDateString_(dateText, baseDate) {
  const text = String(dateText || '').trim();
  if (!text) return -1;
  const parsed = new Date(text);
  if (isNaN(parsed.getTime())) return -1;
  const ms = baseDate.getTime() - parsed.getTime();
  return ms < 0 ? 0 : Math.floor(ms / (1000 * 60 * 60 * 24));
}

function decideWarrantyType_(usageDays, warrantyDays) {
  if (usageDays < 0 || warrantyDays <= 0) return '-';
  return usageDays < warrantyDays ? '무상' : '유상';
}

/**
 * AS 일일실적 조회
 * 데이터시트의 AS_DAILY_SUMMARY 결과값만 읽어 웹앱 화면에 전달합니다.
 */
function getAsDailyStats(sessionToken, targetDate, partFilter, repairTypeFilter) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message, summary: null, rows: [] };
    if (!hasStatsPermission_(auth.session.permissions)) {
      return { success: false, message: '실적 통계 조회 권한이 없습니다.', summary: null, rows: [] };
    }

    const ss = SpreadsheetApp.openById(AS_DAILY_STATS_SPREADSHEET_ID);
    const sheet = ss.getSheetByName(AS_DAILY_SUMMARY_SHEET_NAME);
    if (!sheet) {
      return { success: false, message: 'AS_DAILY_SUMMARY 시트를 찾을 수 없습니다.', summary: null, rows: [] };
    }

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) {
      return { success: false, message: '실적 데이터가 없습니다. 데이터시트에서 실적 업데이트를 먼저 실행해주세요.', summary: null, rows: [] };
    }

    const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const headerIndex = buildHeaderIndex_(headers);
    const selectedDate = normalizeAsDailyDateText_(targetDate) || inferLatestAsDailyReceiptDate_(ss);
    const selectedPart = String(partFilter || '전체').trim();
    const selectedRepairType = selectedPart === '서비스팩토리'
      ? '중수리'
      : String(repairTypeFilter || '경수리').trim();

    if (!selectedDate) {
      return { success: false, message: '조회 가능한 기준일이 없습니다.', summary: null, rows: [] };
    }

    const cacheKey = createAsDailyCacheKey_('stats', [selectedDate, selectedPart, selectedRepairType]);
    const cachedResponse = getAsDailyCache_(cacheKey);
    if (cachedResponse) return cachedResponse;

    const summaryValues = getAsDailySummaryRowsByDate_(sheet, headerIndex, selectedDate, lastCol);
    const rows = [];
    for (let i = 0; i < summaryValues.length; i++) {
      const row = summaryValues[i];
      if (getAsDailyCell_(row, headerIndex, '파트필터') !== selectedPart) continue;
      if (getAsDailyCell_(row, headerIndex, '수리구분필터') !== selectedRepairType) continue;
      if (!isAsDailyVisible_(getAsDailyCell_(row, headerIndex, '표시여부'))) continue;
      rows.push(mapAsDailySummaryRow_(row, headerIndex));
    }

    if (rows.length === 0) {
      return {
        success: false,
        message: '선택한 조건에 맞는 실적 데이터가 없습니다.',
        targetDate: selectedDate,
        partFilter: selectedPart,
        repairTypeFilter: selectedRepairType,
        summary: null,
        rows: []
      };
    }

    const summary = selectAsDailySummaryRow_(rows, selectedPart);
    const detailRows = rows.filter(function (row) {
      if (row === summary) return false;
      return row.rowType !== 'TOTAL';
    });

    const response = {
      success: true,
      targetDate: selectedDate,
      targetMonth: summary.targetMonth || '',
      partFilter: selectedPart,
      repairTypeFilter: selectedRepairType,
      summary: summary,
      rows: detailRows.length ? detailRows : rows
    };
    putAsDailyCache_(cacheKey, response, AS_DAILY_STATS_CACHE_SECONDS);
    return response;
  } catch (e) {
    return { success: false, message: e.toString(), summary: null, rows: [] };
  }
}

/**
 * AS 일일실적 화면 진입 시 사용할 최신 기준일만 가볍게 조회합니다.
 */
function getAsDailyLatestDate(sessionToken) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message, targetDate: '' };
    if (!hasStatsPermission_(auth.session.permissions)) {
      return { success: false, message: '실적 통계 조회 권한이 없습니다.', targetDate: '' };
    }

    const ss = SpreadsheetApp.openById(AS_DAILY_STATS_SPREADSHEET_ID);
    const latestDate = inferLatestAsDailyReceiptDate_(ss);
    if (!latestDate) {
      return { success: false, message: '조회 가능한 기준일이 없습니다.', targetDate: '' };
    }

    return { success: true, targetDate: latestDate };
  } catch (e) {
    return { success: false, message: e.toString(), targetDate: '' };
  }
}

/**
 * AS 일일실적 상세 조회
 * 요약 카드의 숫자를 검증할 수 있도록 AS_DAILY_WORK에서 간단 상세 목록만 반환합니다.
 */
function getAsDailyStatsDetail(sessionToken, targetDate, partFilter, repairTypeFilter, detailType, scope) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message, title: '', items: [] };
    if (!hasStatsPermission_(auth.session.permissions)) {
      return { success: false, message: '실적 통계 조회 권한이 없습니다.', title: '', items: [] };
    }

    const selectedDate = normalizeAsDailyDateText_(targetDate);
    if (!selectedDate) return { success: false, message: '기준일을 선택해주세요.', title: '', items: [] };

    const selectedPart = String(partFilter || '전체').trim();
    const selectedRepairType = selectedPart === '서비스팩토리'
      ? '중수리'
      : String(repairTypeFilter || '경수리').trim();
    const selectedDetailType = String(detailType || '').trim();
    const monthStart = selectedDate.substring(0, 7) + '-01';
    const targetDateObj = parseAsDailyDateOnly_(selectedDate);
    const scopeKey = scope ? JSON.stringify(scope) : '';
    const cacheKey = createAsDailyCacheKey_('detail', [selectedDate, selectedPart, selectedRepairType, selectedDetailType, scopeKey]);
    const cachedResponse = getAsDailyCache_(cacheKey);
    if (cachedResponse) return cachedResponse;

    const ss = SpreadsheetApp.openById(AS_DAILY_STATS_SPREADSHEET_ID);
    const sheet = ss.getSheetByName(AS_DAILY_WORK_SHEET_NAME);
    if (!sheet) {
      return { success: false, message: 'AS_DAILY_WORK 시트를 찾을 수 없습니다.', title: '', items: [] };
    }

    const values = sheet.getDataRange().getDisplayValues();
    if (values.length < 2) {
      return { success: false, message: '상세 조회할 작업 데이터가 없습니다.', title: '', items: [] };
    }

    const headerIndex = buildHeaderIndex_(values[0]);
    const detailRows = [];

    for (let i = 1; i < values.length; i++) {
      const item = mapAsDailyWorkRow_(values[i], headerIndex);
      if (!matchesAsDailyBaseFilter_(item, selectedPart, selectedRepairType)) continue;
      if (!matchesAsDailyScope_(item, scope)) continue;
      if (!matchesAsDailyDetailType_(item, selectedDetailType, selectedDate, monthStart, targetDateObj)) continue;
      detailRows.push(mapAsDailyDetailItem_(item, selectedDetailType, selectedDate, targetDateObj));
    }

    detailRows.sort(function (a, b) {
      const ad = a.sortDate || '';
      const bd = b.sortDate || '';
      if (ad === bd) return String(a.receiptNo || '').localeCompare(String(b.receiptNo || ''), 'ko');
      return ad < bd ? 1 : -1;
    });

    const limitedItems = detailRows.slice(0, AS_DAILY_DETAIL_MAX_ITEMS);
    const response = {
      success: true,
      title: getAsDailyDetailTitle_(selectedDetailType),
      targetDate: selectedDate,
      partFilter: selectedPart,
      repairTypeFilter: selectedRepairType,
      count: detailRows.length,
      limit: AS_DAILY_DETAIL_MAX_ITEMS,
      limited: detailRows.length > limitedItems.length,
      items: limitedItems
    };
    putAsDailyCache_(cacheKey, response, AS_DAILY_DETAIL_CACHE_SECONDS);
    return response;
  } catch (e) {
    return { success: false, message: e.toString(), title: '', items: [] };
  }
}

/**
 * AS 일일실적 엑셀 다운로드
 * 현재 조회 조건의 AS_DAILY_SUMMARY 값을 기존 보고용 엑셀 양식에 맞춰 생성합니다.
 */
function exportAsDailyStatsExcel(sessionToken, targetDate, partFilter, repairTypeFilter) {
  let tempSpreadsheetId = '';
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message };
    if (!hasStatsPermission_(auth.session.permissions)) {
      return { success: false, message: '실적 통계 다운로드 권한이 없습니다.' };
    }

    const ss = SpreadsheetApp.openById(AS_DAILY_STATS_SPREADSHEET_ID);
    const summarySheet = ss.getSheetByName(AS_DAILY_SUMMARY_SHEET_NAME);
    if (!summarySheet) return { success: false, message: 'AS_DAILY_SUMMARY 시트를 찾을 수 없습니다.' };

    const selectedDate = normalizeAsDailyDateText_(targetDate) || inferLatestAsDailyReceiptDate_(ss);
    if (!selectedDate) return { success: false, message: '다운로드할 기준일이 없습니다.' };

    const selectedPart = String(partFilter || '전체').trim();
    const selectedRepairType = selectedPart === '서비스팩토리'
      ? '중수리'
      : String(repairTypeFilter || '경수리').trim();

    const lastCol = summarySheet.getLastColumn();
    const headers = summarySheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const headerIndex = buildHeaderIndex_(headers);
    const summaryValues = getAsDailySummaryRowsByDate_(summarySheet, headerIndex, selectedDate, lastCol);
    const rows = summaryValues
      .filter(function(row) {
        if (!isAsDailyVisible_(getAsDailyCell_(row, headerIndex, '표시여부'))) return false;
        const rowPartFilter = getAsDailyCell_(row, headerIndex, '파트필터');
        const rowRepairType = getAsDailyCell_(row, headerIndex, '수리구분필터');
        if (selectedPart === '전체') {
          return rowPartFilter === '전체' && (rowRepairType === '경수리' || rowRepairType === '중수리');
        }
        return rowPartFilter === selectedPart && rowRepairType === selectedRepairType;
      })
      .map(function(row) { return mapAsDailySummaryRow_(row, headerIndex); })
      .sort(function(a, b) { return a.displayOrder - b.displayOrder; });

    if (rows.length === 0) {
      return { success: false, message: '선택한 조건에 맞는 다운로드 데이터가 없습니다.' };
    }

    const reportTitle = 'AS일일실적_' + selectedDate + '_' + selectedPart + '_' + selectedRepairType + '.xlsx';
    const temp = SpreadsheetApp.create('AS일일실적_다운로드_' + selectedDate + '_' + new Date().getTime());
    tempSpreadsheetId = temp.getId();
    const reportSheet = temp.getSheets()[0];
    reportSheet.setName('AS일일실적');
    buildAsDailyExcelSheet_(reportSheet, rows, selectedDate, selectedPart, selectedRepairType);
    SpreadsheetApp.flush();

    const url = 'https://docs.google.com/spreadsheets/d/' + tempSpreadsheetId + '/export?format=xlsx';
    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      return { success: false, message: '엑셀 파일 변환에 실패했습니다. (' + response.getResponseCode() + ')' };
    }

    const exportFolder = getAsDailyExportFolder_();
    cleanupAsDailyExportFiles_(exportFolder);
    const blob = response.getBlob().setName(reportTitle);
    const exportFile = exportFolder.createFile(blob);
    exportFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return {
      success: true,
      fileName: reportTitle,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileId: exportFile.getId(),
      fileUrl: exportFile.getUrl(),
      downloadUrl: 'https://drive.google.com/uc?export=download&id=' + exportFile.getId()
    };
  } catch (e) {
    return { success: false, message: e.toString() };
  } finally {
    if (tempSpreadsheetId) {
      try {
        DriveApp.getFileById(tempSpreadsheetId).setTrashed(true);
      } catch (ignore) {}
    }
  }
}

function buildAsDailyExcelSheet_(sheet, rows, selectedDate, selectedPart, selectedRepairType) {
  const monthLabel = selectedDate.substring(5, 7).replace(/^0/, '') + '월';
  const isFullDailyReport = selectedPart === '전체';
  const lightRows = rows.filter(function(row) { return row.repairTypeFilter === '경수리'; });
  const heavyRows = rows.filter(function(row) { return row.repairTypeFilter === '중수리'; });
  const targetRows = isFullDailyReport ? rows : rows.filter(function(row) {
    return row.repairTypeFilter === selectedRepairType;
  });

  sheet.clear();
  sheet.setHiddenGridlines(true);
  sheet.setFrozenRows(5);
  sheet.setColumnWidths(1, 2, 92);
  sheet.setColumnWidths(3, 6, 58);
  sheet.setColumnWidths(9, 3, 66);
  sheet.setColumnWidth(12, 88);
  sheet.setColumnWidths(13, 3, 68);

  sheet.getRange('A1:B1').merge();
  sheet.getRange('A1').setValue('■ AS일일실적(' + monthLabel + ')');
  sheet.getRange('O1').setValue(selectedDate);
  sheet.getRange('A1:O1')
    .setFontFamily('맑은 고딕')
    .setFontSize(10)
    .setFontWeight('bold')
    .setVerticalAlignment('middle');
  sheet.getRange('A1').setFontSize(13).setHorizontalAlignment('left');
  sheet.getRange('O1').setHorizontalAlignment('right');

  buildAsDailyExcelHeader_(sheet);

  let rowNo = 6;
  if (isFullDailyReport) {
    rowNo = appendAsDailyLightExcelRows_(sheet, lightRows, rowNo);
    rowNo = appendAsDailyHeavyExcelRows_(sheet, heavyRows, rowNo);
  } else {
    rowNo = appendAsDailyFilteredExcelRows_(sheet, targetRows, rowNo, selectedRepairType === '중수리');
  }

  if (rowNo <= 6) {
    sheet.getRange(6, 1, 1, 15).setValues([['데이터 없음', '', '', '', '', '', '', '', '', '', '', '', '', '', '']]);
    rowNo = 7;
  }

  sheet.getRange(1, 1, rowNo - 1, 15)
    .setFontFamily('맑은 고딕')
    .setFontSize(9)
    .setVerticalAlignment('middle');
  sheet.getRange(1, 1, rowNo - 1, 15).setWrap(true);
  sheet.getRange(3, 1, rowNo - 3, 15)
    .setBorder(true, true, true, true, true, true, '#000000', SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(3, 1, 3, 15).setHorizontalAlignment('center').setFontWeight('bold');
  sheet.getRange(6, 1, Math.max(rowNo - 6, 1), 15).setHorizontalAlignment('center');
  sheet.getRange(6, 3, Math.max(rowNo - 6, 1), 10).setNumberFormat('#,##0;-#,##0;-');
  sheet.getRange(6, 13, Math.max(rowNo - 6, 1), 1).setNumberFormat('0.0;-0.0;-');
  sheet.getRange(6, 14, Math.max(rowNo - 6, 1), 2).setNumberFormat('#,##0;-#,##0;-');

  for (let r = 3; r < rowNo; r++) sheet.setRowHeight(r, 22);
  sheet.setRowHeight(1, 24);
}

function getAsDailyExportFolder_() {
  const folderId = String(AS_DAILY_EXPORT_FOLDER_ID || '').trim();
  if (folderId) return DriveApp.getFolderById(folderId);

  const appFolder = getOrCreateDriveFolderByName_(APP_DRIVE_FOLDER_NAME, DriveApp.getRootFolder());
  return getOrCreateDriveFolderByName_(AS_DAILY_EXPORT_FOLDER_NAME, appFolder);
}

function getOrCreateDriveFolderByName_(folderName, parentFolder) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return parentFolder.createFolder(folderName);
}

function cleanupAsDailyExportFiles_(folder) {
  const cutoffTime = new Date().getTime() - (AS_DAILY_EXPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const files = folder.getFiles();

  while (files.hasNext()) {
    const file = files.next();
    const fileName = String(file.getName() || '');
    if (fileName.indexOf(AS_DAILY_EXPORT_FILE_PREFIX) !== 0) continue;
    if (file.getDateCreated().getTime() < cutoffTime) {
      file.setTrashed(true);
    }
  }
}

function buildAsDailyExcelHeader_(sheet) {
  const gray = '#d9d9d9';
  const yellow = '#f1c232';
  const merges = ['A3:B5', 'C3:D3', 'E3:H3', 'I3:L3', 'M3:M5', 'N3:O4', 'E4:F4', 'G4:H4', 'I4:I5', 'J4:J5', 'K4:K5', 'L4:L5'];
  merges.forEach(function(a1) { sheet.getRange(a1).merge(); });

  sheet.getRange('A3').setValue('구분');
  sheet.getRange('C3').setValue('AS접수');
  sheet.getRange('E3').setValue('AS완료');
  sheet.getRange('I3').setValue('미완료');
  sheet.getRange('M3').setValue('리드타임\n(누적평균)');
  sheet.getRange('N3').setValue('접수취소');
  sheet.getRange('E4').setValue('미출동');
  sheet.getRange('G4').setValue('출동');
  sheet.getRange('I4').setValue('계');
  sheet.getRange('J4').setValue('접수대기');
  sheet.getRange('K4').setValue('미완료');
  sheet.getRange('L4').setValue('미완료\n(4일이상)');

  const subHeaders = [['당일', '누적', '당일', '누적', '당일', '누적', '', '', '', '', '', '당일', '누적']];
  sheet.getRange(5, 3, 1, 13).setValues(subHeaders);
  sheet.getRange('A3:O5').setBackground(gray);
  sheet.getRangeList(['E4:F4', 'G4:H4', 'L4:L5', 'N3:O4']).setBackground(yellow);
}

function appendAsDailyLightExcelRows_(sheet, lightRows, rowNo) {
  const total = findAsDailyExcelRow_(lightRows, 'TOTAL');
  if (total) rowNo = writeAsDailyExcelMetricRow_(sheet, rowNo, total.displayName, '', total, false, 'total', true);

  const parts = lightRows.filter(function(row) { return row.rowType === 'PART'; });
  parts.forEach(function(partRow) {
    rowNo = writeAsDailyExcelMetricRow_(sheet, rowNo, partRow.displayName, '', partRow, false, 'part', true);
    const centers = lightRows.filter(function(row) {
      return row.rowType === 'CENTER' && row.part === partRow.part;
    });

    centers.forEach(function(centerRow) {
      const masters = lightRows.filter(function(row) {
        return row.rowType === 'MASTER' && row.part === centerRow.part && row.centerName === centerRow.centerName;
      });

      if (masters.length === 0) {
        rowNo = writeAsDailyExcelMetricRow_(sheet, rowNo, centerRow.displayName, '', centerRow, false, '', true);
        return;
      }

      const startRow = rowNo;
      masters.forEach(function(masterRow) {
        rowNo = writeAsDailyExcelMetricRow_(sheet, rowNo, '', masterRow.displayName, masterRow, false, '', false);
      });
      const endRow = rowNo - 1;
      sheet.getRange(startRow, 1, endRow - startRow + 1, 1).merge();
      sheet.getRange(startRow, 1)
        .setValue(centerRow.centerName)
        .setFontWeight('bold')
        .setBackground('#ededed')
        .setHorizontalAlignment('center')
        .setVerticalAlignment('middle');
    });
  });

  return rowNo;
}

function appendAsDailyHeavyExcelRows_(sheet, heavyRows, rowNo) {
  const total = findAsDailyExcelRow_(heavyRows, 'TOTAL');
  if (total) rowNo = writeAsDailyExcelMetricRow_(sheet, rowNo, total.displayName, '', total, true, 'total', true);

  heavyRows
    .filter(function(row) { return row.rowType === 'FACTORY' || row.rowType === 'CENTER'; })
    .forEach(function(row) {
      rowNo = writeAsDailyExcelMetricRow_(sheet, rowNo, row.displayName, '', row, true, 'part', true);
    });

  return rowNo;
}

function appendAsDailyFilteredExcelRows_(sheet, rows, rowNo, isHeavyRepair) {
  rows.forEach(function(row) {
    const style = row.rowType === 'TOTAL' ? 'total' : (row.rowType === 'PART' || row.rowType === 'CENTER' || row.rowType === 'FACTORY' ? 'part' : '');
    const mergeLabel = row.rowType !== 'MASTER';
    rowNo = writeAsDailyExcelMetricRow_(
      sheet,
      rowNo,
      row.rowType === 'MASTER' ? row.centerName : row.displayName,
      row.rowType === 'MASTER' ? row.displayName : '',
      row,
      isHeavyRepair,
      style,
      mergeLabel
    );
  });
  return rowNo;
}

function writeAsDailyExcelMetricRow_(sheet, rowNo, labelA, labelB, row, isHeavyRepair, style, mergeLabel) {
  const values = [['', '', row.receiptDaily, row.receiptMonthly]];
  if (isHeavyRepair) {
    values[0] = values[0].concat([0, 0, row.completeDaily, row.completeMonthly]);
  } else {
    values[0] = values[0].concat([row.noVisitDaily, row.noVisitMonthly, row.visitDaily, row.visitMonthly]);
  }
  values[0] = values[0].concat([
    row.incompleteTotal,
    row.waiting,
    row.incomplete,
    row.longIncomplete,
    row.leadAverage === '' ? 0 : row.leadAverage,
    row.cancelDaily,
    row.cancelMonthly
  ]);

  sheet.getRange(rowNo, 1, 1, 15).setValues(values);
  if (mergeLabel) {
    sheet.getRange(rowNo, 1, 1, 2).merge();
    sheet.getRange(rowNo, 1).setValue(labelA || '');
  } else {
    sheet.getRange(rowNo, 1).setValue(labelA || '');
    sheet.getRange(rowNo, 2).setValue(labelB || '');
  }

  if (style === 'total') {
    sheet.getRange(rowNo, 1, 1, 15).setFontWeight('bold');
    sheet.getRange(rowNo, 1, 1, 15).setBorder(true, true, true, true, true, true, '#000000', SpreadsheetApp.BorderStyle.SOLID);
    sheet.getRange(rowNo, 1, 1, 15).setBorder(true, null, true, null, null, null, '#ff0000', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  } else if (style === 'part') {
    sheet.getRange(rowNo, 1, 1, 15).setFontWeight('bold').setBackground('#ededed');
  }

  return rowNo + 1;
}

function findAsDailyExcelRow_(rows, rowType) {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].rowType === rowType) return rows[i];
  }
  return null;
}

function buildHeaderIndex_(headers) {
  const index = {};
  (headers || []).forEach(function (header, i) {
    const key = String(header || '').trim();
    if (key) index[key] = i;
  });
  return index;
}

function getAsDailyCell_(row, headerIndex, headerName) {
  const col = headerIndex[headerName];
  if (col === undefined || col < 0) return '';
  return String(row[col] || '').trim();
}

function createAsDailyCacheKey_(namespace, parts) {
  const seed = [namespace].concat(parts || []).map(function(part) {
    return String(part || '').trim();
  }).join('|');
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    seed,
    Utilities.Charset.UTF_8
  );
  return 'asDaily:' + namespace + ':' + toHex_(digest).substring(0, 40);
}

function getAsDailyCache_(cacheKey) {
  const key = String(cacheKey || '').trim();
  if (!key) return null;

  const raw = CacheService.getScriptCache().get(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function putAsDailyCache_(cacheKey, value, ttlSeconds) {
  const key = String(cacheKey || '').trim();
  if (!key || !value) return false;

  try {
    const raw = JSON.stringify(value);
    if (Utilities.newBlob(raw).getBytes().length > AS_DAILY_CACHE_MAX_BYTES) return false;
    CacheService.getScriptCache().put(key, raw, ttlSeconds || AS_DAILY_STATS_CACHE_SECONDS);
    return true;
  } catch (e) {
    return false;
  }
}

function inferLatestAsDailyReceiptDate_(ss) {
  return inferLatestAsDailyDateFromColumn_(ss, AS_DAILY_RAW_SHEET_NAME, '접수일자') ||
    inferLatestAsDailyDateFromColumn_(ss, AS_DAILY_WORK_SHEET_NAME, '접수일');
}

function inferLatestAsDailyDateFromColumn_(ss, sheetName, dateHeaderName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return '';

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return '';

  const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  const headerIndex = buildHeaderIndex_(headers);
  const dateCol = headerIndex[dateHeaderName];
  if (dateCol === undefined || dateCol < 0) return '';

  const values = sheet.getRange(2, dateCol + 1, lastRow - 1, 1).getDisplayValues();
  let latest = '';
  for (let i = 0; i < values.length; i++) {
    const dateText = normalizeAsDailyDateText_(values[i][0]);
    if (dateText && dateText > latest) latest = dateText;
  }
  return latest;
}

function getAsDailySummaryRowsByDate_(sheet, headerIndex, selectedDate, lastCol) {
  const dateCol = headerIndex['기준일'];
  if (dateCol === undefined || dateCol < 0 || !selectedDate) return [];

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const dateValues = sheet.getRange(2, dateCol + 1, lastRow - 1, 1).getDisplayValues();
  let firstRow = -1;
  let lastMatchedRow = -1;

  for (let i = 0; i < dateValues.length; i++) {
    const dateText = normalizeAsDailyDateText_(dateValues[i][0]);
    if (dateText !== selectedDate) continue;
    const rowNo = i + 2;
    if (firstRow < 0) firstRow = rowNo;
    lastMatchedRow = rowNo;
  }

  if (firstRow < 0 || lastMatchedRow < firstRow) return [];

  return sheet
    .getRange(firstRow, 1, lastMatchedRow - firstRow + 1, lastCol)
    .getDisplayValues()
    .filter(function(row) {
      return normalizeAsDailyDateText_(getAsDailyCell_(row, headerIndex, '기준일')) === selectedDate;
    });
}

function parseAsDailyNumber_(value) {
  const text = String(value || '').replace(/,/g, '').trim();
  if (!text || text === '-') return 0;
  const num = Number(text);
  return isNaN(num) ? 0 : num;
}

function isAsDailyVisible_(value) {
  const text = String(value || '').trim().toLowerCase();
  return !(text === 'false' || text === 'n' || text === 'no' || text === 'x' || text === '0');
}

function mapAsDailySummaryRow_(row, headerIndex) {
  return {
    targetDate: getAsDailyCell_(row, headerIndex, '기준일'),
    targetMonth: getAsDailyCell_(row, headerIndex, '기준월'),
    partFilter: getAsDailyCell_(row, headerIndex, '파트필터'),
    repairTypeFilter: getAsDailyCell_(row, headerIndex, '수리구분필터'),
    displayOrder: parseAsDailyNumber_(getAsDailyCell_(row, headerIndex, '표시순서')),
    rowType: getAsDailyCell_(row, headerIndex, 'rowType'),
    displayName: getAsDailyCell_(row, headerIndex, '표시명'),
    part: getAsDailyCell_(row, headerIndex, '파트'),
    centerName: getAsDailyCell_(row, headerIndex, '센터명'),
    masterCode: getAsDailyCell_(row, headerIndex, '담당마스터코드'),
    masterName: getAsDailyCell_(row, headerIndex, '담당마스터'),
    receiptDaily: parseAsDailyNumber_(getAsDailyCell_(row, headerIndex, '접수당일')),
    receiptMonthly: parseAsDailyNumber_(getAsDailyCell_(row, headerIndex, '접수누적')),
    completeDaily: parseAsDailyNumber_(getAsDailyCell_(row, headerIndex, '완료당일')),
    completeMonthly: parseAsDailyNumber_(getAsDailyCell_(row, headerIndex, '완료누적')),
    noVisitDaily: parseAsDailyNumber_(getAsDailyCell_(row, headerIndex, '미출동당일')),
    noVisitMonthly: parseAsDailyNumber_(getAsDailyCell_(row, headerIndex, '미출동누적')),
    visitDaily: parseAsDailyNumber_(getAsDailyCell_(row, headerIndex, '출동당일')),
    visitMonthly: parseAsDailyNumber_(getAsDailyCell_(row, headerIndex, '출동누적')),
    incompleteTotal: parseAsDailyNumber_(getAsDailyCell_(row, headerIndex, '미완료계')),
    waiting: parseAsDailyNumber_(getAsDailyCell_(row, headerIndex, '접수대기')),
    incomplete: parseAsDailyNumber_(getAsDailyCell_(row, headerIndex, '미완료')),
    longIncomplete: parseAsDailyNumber_(getAsDailyCell_(row, headerIndex, '미완료4일이상') || getAsDailyCell_(row, headerIndex, '장기미완료')),
    leadAverage: parseAsDailyOptionalNumber_(getAsDailyCell_(row, headerIndex, '리드타임평균')),
    cancelDaily: parseAsDailyNumber_(getAsDailyCell_(row, headerIndex, '접수취소당일')),
    cancelMonthly: parseAsDailyNumber_(getAsDailyCell_(row, headerIndex, '접수취소누적')),
    cancelDisplay: getAsDailyCell_(row, headerIndex, '취소표시'),
    validation: getAsDailyCell_(row, headerIndex, '데이터검증')
  };
}

function selectAsDailySummaryRow_(rows, selectedPart) {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].rowType === 'TOTAL') return rows[i];
  }

  for (let i = 0; i < rows.length; i++) {
    if (rows[i].displayName === selectedPart || rows[i].part === selectedPart) return rows[i];
  }

  for (let i = 0; i < rows.length; i++) {
    if (rows[i].rowType === 'PART' || rows[i].rowType === 'CENTER' || rows[i].rowType === 'FACTORY') return rows[i];
  }

  return rows[0];
}

function mapAsDailyWorkRow_(row, headerIndex) {
  return {
    receiptNo: getAsDailyCell_(row, headerIndex, '접수번호'),
    receiptStatus: getAsDailyCell_(row, headerIndex, '접수상태'),
    statusGroup: getAsDailyCell_(row, headerIndex, '상태구분'),
    receiptType: getAsDailyCell_(row, headerIndex, '접수구분'),
    receiptCategory: getAsDailyCell_(row, headerIndex, '접수분류'),
    vin: getAsDailyCell_(row, headerIndex, '차대번호'),
    salesPoint: getAsDailyCell_(row, headerIndex, '영업점'),
    originalPart: getAsDailyCell_(row, headerIndex, '원본파트'),
    masterCode: getAsDailyCell_(row, headerIndex, '담당마스터코드'),
    masterName: getAsDailyCell_(row, headerIndex, '담당마스터'),
    receiptDate: normalizeAsDailyDateText_(getAsDailyCell_(row, headerIndex, '접수일')),
    doneDate: normalizeAsDailyDateText_(getAsDailyCell_(row, headerIndex, '완료일')),
    cancelDate: normalizeAsDailyDateText_(getAsDailyCell_(row, headerIndex, '취소일')),
    centerDate: normalizeAsDailyDateText_(getAsDailyCell_(row, headerIndex, '센터수리일')),
    factoryDate: normalizeAsDailyDateText_(getAsDailyCell_(row, headerIndex, '공장완료일')),
    processStatus: getAsDailyCell_(row, headerIndex, '처리상태'),
    completeType: getAsDailyCell_(row, headerIndex, '완료유형'),
    repairType: getAsDailyCell_(row, headerIndex, '수리구분'),
    partGroup: getAsDailyCell_(row, headerIndex, '파트그룹'),
    centerName: getAsDailyCell_(row, headerIndex, '센터명'),
    rowType: getAsDailyCell_(row, headerIndex, 'rowType'),
    incomplete: getAsDailyCell_(row, headerIndex, '미완료여부') === '1',
    waiting: getAsDailyCell_(row, headerIndex, '접수대기여부') === '1',
    longIncomplete: getAsDailyCell_(row, headerIndex, '장기미완료여부') === '1',
    canceled: getAsDailyCell_(row, headerIndex, '취소여부') === '1',
    serviceFactory: getAsDailyCell_(row, headerIndex, '서비스팩토리대상여부') === '1',
    customerLeadDays: parseAsDailyOptionalNumber_(getAsDailyCell_(row, headerIndex, '리드타임고객일수')),
    centerLeadDays: parseAsDailyOptionalNumber_(getAsDailyCell_(row, headerIndex, '리드타임센터일수')),
    factoryLeadDays: parseAsDailyOptionalNumber_(getAsDailyCell_(row, headerIndex, '리드타임공장일수')),
    validationMemo: getAsDailyCell_(row, headerIndex, '검증메모')
  };
}

function matchesAsDailyBaseFilter_(item, selectedPart, selectedRepairType) {
  if (item.repairType !== selectedRepairType) return false;
  if (selectedPart !== '전체' && item.partGroup !== selectedPart) return false;
  return true;
}

function matchesAsDailyScope_(item, scope) {
  const s = scope || {};
  const rowType = String(s.rowType || '').trim();
  if (!rowType || rowType === 'TOTAL') return true;

  if (rowType === 'PART') {
    return item.partGroup === String(s.part || '').trim();
  }
  if (rowType === 'CENTER') {
    return item.partGroup === String(s.part || '').trim() &&
      item.centerName === String(s.centerName || '').trim();
  }
  if (rowType === 'FACTORY') {
    return item.partGroup === '서비스팩토리' &&
      (!s.centerName || item.centerName === String(s.centerName || '').trim());
  }
  if (rowType === 'MASTER') {
    const masterCode = String(s.masterCode || '').trim();
    const masterName = String(s.masterName || '').trim();
    if (masterCode && item.masterCode === masterCode) return true;
    return !!(masterName && item.masterName === masterName);
  }
  return true;
}

function matchesAsDailyDetailType_(item, detailType, targetDateText, monthStartText, targetDateObj) {
  const completeDate = getAsDailyCompleteDate_(item);

  if (detailType === 'cancelDaily') {
    return item.cancelDate === targetDateText;
  }
  if (detailType === 'cancelMonthly') {
    return isAsDailyDateInRange_(item.cancelDate, monthStartText, targetDateText);
  }
  if (detailType === 'receiptDaily') {
    return item.receiptDate === targetDateText;
  }
  if (detailType === 'completeDaily') {
    return item.processStatus === '완료' && completeDate === targetDateText;
  }
  if (detailType === 'visitDaily') {
    return item.processStatus === '완료' &&
      (item.completeType === '미출동' || item.completeType === '출동') &&
      completeDate === targetDateText;
  }
  if (detailType === 'waiting') {
    return isAsDailyIncompleteAsOfTarget_(item, targetDateText) && item.waiting;
  }
  if (detailType === 'longIncomplete') {
    return isAsDailyIncompleteAsOfTarget_(item, targetDateText) &&
      isAsDailyLongIncomplete_(item.receiptDate, targetDateObj);
  }
  if (detailType === 'incomplete') {
    return isAsDailyIncompleteAsOfTarget_(item, targetDateText) && !item.waiting;
  }
  return false;
}

function mapAsDailyDetailItem_(item, detailType, targetDateText, targetDateObj) {
  const completeDate = getAsDailyCompleteDate_(item);
  const leadDays = getAsDailyLeadDays_(item);
  const elapsedDays = calcAsDailyElapsedDays_(item.receiptDate, targetDateObj);
  const partCenter = [item.partGroup, item.centerName].filter(function (value) {
    return !!value;
  }).join(' / ');
  const statusText = item.cancelDate ? '접수취소' : (item.processStatus || item.receiptStatus || item.statusGroup || '-');
  const extra = getAsDailyDetailExtra_(item, detailType, completeDate, elapsedDays, leadDays);

  return {
    receiptNo: item.receiptNo || '-',
    masterName: item.masterName || '-',
    partName: item.partGroup || '-',
    centerName: item.centerName || '-',
    partCenter: partCenter || '-',
    salesPoint: item.salesPoint || '-',
    vin: item.vin || '-',
    receiptCategory: item.receiptCategory || '-',
    receiptDate: item.receiptDate || '-',
    elapsedDays: elapsedDays >= 0 ? elapsedDays : '',
    status: statusText,
    category: item.completeType || item.receiptStatus || item.statusGroup || '-',
    showTraceInfo: shouldShowAsDailyTraceInfo_(detailType),
    extraLabel: extra.label,
    extraValue: extra.value,
    sortDate: extra.sortDate || completeDate || item.cancelDate || item.receiptDate || targetDateText
  };
}

function shouldShowAsDailyTraceInfo_(detailType) {
  return detailType === 'receiptDaily' ||
    detailType === 'completeDaily' ||
    detailType === 'incomplete' ||
    detailType === 'waiting' ||
    detailType === 'cancelDaily' ||
    detailType === 'cancelMonthly' ||
    detailType === 'longIncomplete';
}

function getAsDailyDetailExtra_(item, detailType, completeDate, elapsedDays, leadDays) {
  if (detailType === 'receiptDaily') {
    return { label: '접수일', value: item.receiptDate || '-', sortDate: item.receiptDate };
  }
  if (detailType === 'completeDaily') {
    return { label: '완료일', value: completeDate || '-', sortDate: completeDate };
  }
  if (detailType === 'cancelDaily' || detailType === 'cancelMonthly') {
    return { label: '취소일', value: item.cancelDate || '-', sortDate: item.cancelDate };
  }
  if (detailType === 'visitDaily') {
    return {
      label: item.completeType === '미출동' ? '미출동일' : '완료일',
      value: completeDate || '-',
      sortDate: completeDate
    };
  }
  if (detailType === 'waiting') {
    return { label: '접수상태', value: item.receiptStatus || item.statusGroup || '-', sortDate: item.receiptDate };
  }
  if (detailType === 'longIncomplete') {
    return {
      label: '경과일',
      value: elapsedDays >= 0 ? elapsedDays + '일' : '-',
      sortDate: item.receiptDate
    };
  }
  return {
    label: '리드타임',
    value: leadDays === '' ? '-' : leadDays + '일',
    sortDate: completeDate || item.receiptDate
  };
}

function getAsDailyDetailTitle_(detailType) {
  if (detailType === 'receiptDaily') return '접수 상세';
  if (detailType === 'completeDaily') return '완료 상세';
  if (detailType === 'cancelDaily') return '접수취소 상세';
  if (detailType === 'cancelMonthly') return '취소 누적 상세';
  if (detailType === 'visitDaily') return '미출동/출동 상세';
  if (detailType === 'waiting') return '접수대기 상세';
  if (detailType === 'longIncomplete') return '30일 이상 상세';
  if (detailType === 'incomplete') return '미완료 상세';
  return '상세 목록';
}

function getAsDailyCompleteDate_(item) {
  if (item.completeType === '센터완료') return item.centerDate;
  if (item.completeType === '공장완료') return item.factoryDate;
  return item.doneDate;
}

function getAsDailyLeadDays_(item) {
  if (item.repairType === '중수리') {
    return item.serviceFactory ? item.factoryLeadDays : item.centerLeadDays;
  }
  return item.customerLeadDays;
}

function parseAsDailyOptionalNumber_(value) {
  const text = String(value || '').replace(/,/g, '').trim();
  if (!text || text === '-') return '';
  const num = Number(text);
  return isNaN(num) ? '' : num;
}

function normalizeAsDailyDateText_(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (!match) return '';
  return match[1] + '-' + ('0' + match[2]).slice(-2) + '-' + ('0' + match[3]).slice(-2);
}

function parseAsDailyDateOnly_(dateText) {
  const text = normalizeAsDailyDateText_(dateText);
  if (!text) return null;
  const parts = text.split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function isAsDailyDateInRange_(dateText, startDateText, endDateText) {
  const text = normalizeAsDailyDateText_(dateText);
  return !!(text && text >= startDateText && text <= endDateText);
}

function isAsDailyDateOnOrBefore_(dateText, targetDateText) {
  const text = normalizeAsDailyDateText_(dateText);
  return !!(text && text <= targetDateText);
}

function isAsDailyIncompleteAsOfTarget_(item, targetDateText) {
  if (!isAsDailyDateOnOrBefore_(item.receiptDate, targetDateText)) return false;
  if (isAsDailyDateOnOrBefore_(item.cancelDate, targetDateText)) return false;

  const completeDate = getAsDailyCompleteDate_(item);
  if (isAsDailyDateOnOrBefore_(completeDate, targetDateText)) return false;

  return true;
}

function isAsDailyLongIncomplete_(receiptDateText, targetDateObj) {
  return calcAsDailyElapsedDays_(receiptDateText, targetDateObj) >= 30;
}

function calcAsDailyElapsedDays_(receiptDateText, targetDateObj) {
  const receiptDate = parseAsDailyDateOnly_(receiptDateText);
  if (!receiptDate || !targetDateObj) return -1;
  return Math.floor((targetDateObj.getTime() - receiptDate.getTime()) / (1000 * 60 * 60 * 24));
}

