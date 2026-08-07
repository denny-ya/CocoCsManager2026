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
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
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
const AS_DAILY_SUMMARY_SHEET_NAME = 'AS_DAILY_SUMMARY';
const BS_SERVICE_SHEETS = ['서비스1', '서비스2', '서비스3', '서비스4'];
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8시간
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
  if (!permissions || !permissions.bs || !Array.isArray(permissions.bs)) return false;
  return permissions.bs.some(function (p) { return isAllowedFlag_(p); });
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
    createdAt: new Date().toISOString()
  };
  CacheService.getScriptCache().put('session:' + token, JSON.stringify(payload), SESSION_TTL_SECONDS);
  return token;
}

function clearSessionToken_(sessionToken) {
  const token = String(sessionToken || '').trim();
  if (!token) return;
  CacheService.getScriptCache().remove('session:' + token);
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
  const raw = CacheService.getScriptCache().get('session:' + token);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function requireSession_(sessionToken) {
  const token = String(sessionToken || '').trim();
  const session = getSessionData_(sessionToken);
  if (!session) return { success: false, message: '로그인 세션이 만료되었습니다. 다시 로그인해주세요.' };
  // 호출 시점마다 TTL을 연장해 사용 중 세션 만료로 인한 오동작을 줄입니다.
  CacheService.getScriptCache().put('session:' + token, JSON.stringify(session), SESSION_TTL_SECONDS);
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
function getBsSheetData(part) {
  const ss = SpreadsheetApp.openById(BS_SPREADSHEET_ID);
  const targetSheets = [];

  if (part && BS_SERVICE_SHEETS.indexOf(part) !== -1) {
    targetSheets.push(part);
  } else {
    // 전체: 서비스1~4 모두
    BS_SERVICE_SHEETS.forEach(function(name) { targetSheets.push(name); });
  }

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
    const bsSheets = getBsSheetData(part);

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
 * allDataSets: getBsSheetData()의 반환값 [{ sheetName, data }, ...]
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

    if (!keyword) return [];

    const bsSheets = getBsSheetData(part);
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

    const bsSheets = getBsSheetData(part);
    
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
 * 메모 저장 (시트명 기반 - 전체 시트 검색)
 */
function saveMemo(sessionToken, vin, memo) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return { success: false, message: auth.message };
    if (!hasBsPermission_(auth.session.permissions)) return { success: false, message: '메모 저장 권한이 없습니다.' };

    const ss = SpreadsheetApp.openById(BS_SPREADSHEET_ID);
    const targetVin = String(vin).trim();

    for (let s = 0; s < BS_SERVICE_SHEETS.length; s++) {
      const sheet = ss.getSheetByName(BS_SERVICE_SHEETS[s]);
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

    for (let s = 0; s < BS_SERVICE_SHEETS.length; s++) {
      const sheet = ss.getSheetByName(BS_SERVICE_SHEETS[s]);
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

function getBranchContactLookup() {
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

function getLoginUserLookup() {
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
    if (!hasAnyDeliveryPermission_(auth.session.permissions)) return { success: false, message: '배차 목록 조회 권한이 없습니다.', items: [] };

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

    const loginLookup = getLoginUserLookup();
    const branchContactLookup = getBranchContactLookup();

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

    return { success: true, items: items };
  } catch (e) {
    return { success: false, message: e.toString(), items: [] };
  }
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

    const res = getDeliveryList(sessionToken, {
      dateFrom: dateFrom,
      dateTo: dateTo,
      searchKey: searchKey,
      searchValue: searchValue,
      status: 'ALL'
    });
    if (!res || !res.success) return res;

    const items = (res.items || []).filter(function(item) {
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
    const allowedPickupViewStatuses = ['배차신청', '배차승인'];
    const res = getDeliveryList(sessionToken, { status: 'ALL' });
    if (!res || !res.success) return { success: false, message: '회수 목록 조회 실패', items: [] };

    const items = (res.items || []).filter(function (item) {
      if (allowedPickupViewStatuses.indexOf(item.status) === -1) return false;
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

    const res = getDeliveryList(sessionToken, { status: 'MOVING' });
    if (!res || !res.success) return { success: false, message: '배송 목록 조회 실패', items: [] };

    const items = (res.items || []).filter(function (item) {
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
    const maxContentsCount = 10;

    const cartItems = contentsCart
      ? contentsCart.split(',').map(function(item) { return String(item || '').trim(); }).filter(function(item) { return item !== ''; })
      : [];
    const materialItems = contentsMaterial
      ? contentsMaterial.split(',').map(function(item) { return String(item || '').trim(); }).filter(function(item) { return item !== ''; })
      : [];

    if (!requesterName || !category || !preferredDate) return { success: false, message: '필수 항목이 누락되었습니다.' };
    if (cartItems.length > maxContentsCount) return { success: false, message: '카트는 최대 10개까지 입력 가능합니다.' };
    if (materialItems.length > maxContentsCount) return { success: false, message: '자재는 최대 10개까지 입력 가능합니다.' };

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

    const values = sheet.getDataRange().getDisplayValues();
    if (values.length < 2) {
      return { success: false, message: '실적 데이터가 없습니다. 데이터시트에서 실적 업데이트를 먼저 실행해주세요.', summary: null, rows: [] };
    }

    const headerIndex = buildHeaderIndex_(values[0]);
    const selectedDate = String(targetDate || '').trim() || inferLatestAsDailyDate_(values, headerIndex);
    const selectedPart = String(partFilter || '전체').trim();
    const selectedRepairType = selectedPart === '서비스팩토리'
      ? '중수리'
      : String(repairTypeFilter || '경수리').trim();

    if (!selectedDate) {
      return { success: false, message: '조회 가능한 기준일이 없습니다.', summary: null, rows: [] };
    }

    const rows = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (getAsDailyCell_(row, headerIndex, '기준일') !== selectedDate) continue;
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

    return {
      success: true,
      targetDate: selectedDate,
      targetMonth: summary.targetMonth || '',
      partFilter: selectedPart,
      repairTypeFilter: selectedRepairType,
      summary: summary,
      rows: detailRows.length ? detailRows : rows
    };
  } catch (e) {
    return { success: false, message: e.toString(), summary: null, rows: [] };
  }
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

function parseAsDailyNumber_(value) {
  const text = String(value || '').replace(/,/g, '').trim();
  if (!text || text === '-') return 0;
  const num = Number(text);
  return isNaN(num) ? 0 : num;
}

function inferLatestAsDailyDate_(values, headerIndex) {
  let latest = '';
  for (let i = 1; i < values.length; i++) {
    const dateText = getAsDailyCell_(values[i], headerIndex, '기준일');
    if (dateText && dateText > latest) latest = dateText;
  }
  return latest;
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
    leadAverage: parseAsDailyNumber_(getAsDailyCell_(row, headerIndex, '리드타임평균')),
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

