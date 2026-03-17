/**
 * Google Apps Script Web App - Server Side Logic
 * 
 * Target Spreadsheet: https://docs.google.com/spreadsheets/d/1LxiBdUywd5IMLckyRZvPyLRKkV_TQXO5PUh_xaPROvo/edit#gid=0
 * A열: 사원번호
 * B열: 비밀번호
 */

const SPREADSHEET_ID = '1LxiBdUywd5IMLckyRZvPyLRKkV_TQXO5PUh_xaPROvo';
const SHEET_NAME = '시트1';
const BS_SPREADSHEET_ID = '1uhkhWWBzvleJwKR_D-VAWXNWq7O3JwB4fib7vKZ52iY';
const BRANCH_DB_SS_ID = '10vY7bq8AXW3XkimW-ibyOGh4LaWRCLaR1Df69Iy9Lt0';

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
 * BS_SPREADSHEET_ID의 '로그인' 시트 사용
 */
function checkLogin(empId, password) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('로그인');
    if (!sheet) {
      return { success: false, message: "'로그인' 시트를 찾을 수 없습니다." };
    }
    
    const data = sheet.getDataRange().getValues();
    const inputId = String(empId).trim();
    const inputPw = String(password).trim();
    
    // 데이터는 2행부터 시작 (index 1)
    for (var i = 1; i < data.length; i++) {
      const rowId = String(data[i][1]).trim(); // B열: 사원번호
      const rowPw = String(data[i][2]).trim(); // C열: 비밀번호
      
      if (rowId === inputId && rowPw === inputPw) {
        return {
          success: true,
          userName: data[i][0], // A열: 이름
          permissions: {
            bs: [data[i][3], data[i][4], data[i][5], data[i][6]], // D~G: 서비스1~4
            address: data[i][7], // H: 영업점 주소록
            parts: data[i][8],   // I: 부품 탈거
            delivery: [data[i][9], data[i][10], data[i][11], data[i][12], data[i][13]], // J~N: 배차
            stats: data[i][14],  // O: 실적 및 통계
            guide: data[i][15]   // P: 업무 가이드
          }
        };
      }
    }
    return { success: false, message: '사원번호 또는 비밀번호가 일치하지 않습니다. (검사 행: ' + (data.length - 1) + ')' };
  } catch (e) {
    return { success: false, message: '서버 에러: ' + e.toString() };
  }
}

/**
 * 비밀번호 변경
 */
function updatePassword(empId, oldPw, newPw) {
  try {
    const ss = SpreadsheetApp.openById(BS_SPREADSHEET_ID);
    const sheet = ss.getSheetByName('로그인');
    if (!sheet) return { success: false, message: "'로그인' 시트를 찾을 수 없습니다." };
    const data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() === String(empId).trim() &&
          String(data[i][2]).trim() === String(oldPw).trim()) {
        sheet.getRange(i + 1, 3).setValue(newPw);
        return { success: true, message: '비밀번호가 변경되었습니다.' };
      }
    }
    return { success: false, message: '사원번호 또는 기존 비밀번호가 일치하지 않습니다.' };
  } catch (e) {
    return { success: false, message: '서버 에러: ' + e.toString() };
  }
}

/**
 * 영업점별 통계 계산 헬퍼
 */
function calculateBranchStats(targetBranchName, allData, part) {
  let total = 0, completed = 0;
  let regularTotal = 0, regularCompleted = 0;
  let reworkTotal = 0, reworkCompleted = 0;
  
  const lowerPart = part ? part.toLowerCase().trim() : '';

  for (let i = 4; i < allData.length; i++) {
    const row = allData[i];
    const rowBranch = String(row[4] || '').trim(); // E열: 영업점
    const rowPart = String(row[10] || '').toLowerCase(); // K열: 부품
    
    if (rowBranch === targetBranchName && (!lowerPart || rowPart.includes(lowerPart))) {
      const isCompleted = String(row[12] || '').trim() !== ''; // M열: 완료
      const type = String(row[9] || ''); // J열: BS점검대상
      
      total++;
      if (isCompleted) completed++;
      
      if (type.includes('리워크')) {
        reworkTotal++;
        if (isCompleted) reworkCompleted++;
      } else if (type === 'O') {
        regularTotal++;
        if (isCompleted) regularCompleted++;
      }
    }
  }
  
  return {
    name: targetBranchName,
    total, completed,
    rate: total ? Math.round((completed / total) * 100) : 0,
    regularTotal, regularCompleted,
    regularRate: regularTotal ? Math.round((regularCompleted / regularTotal) * 100) : 0,
    reworkTotal, reworkCompleted,
    reworkRate: reworkTotal ? Math.round((reworkCompleted / reworkTotal) * 100) : 0
  };
}

/**
 * BS 및 리워크 검색
 */
function searchBS(keyword, part) {
  try {
    const ss = SpreadsheetApp.openById(BS_SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const results = [];
    
    if (!keyword) return [];

    const searchStr = String(keyword).trim().toUpperCase();
    const lowerPart = part ? part.toLowerCase().trim() : '';

    for (let i = 4; i < data.length; i++) {
      const row = data[i];
      const vin = String(row[1] || '').trim().toUpperCase();
      const barcodeVin = String(row[21] || '').trim().toUpperCase();
      const rowPart = String(row[10] || '').toLowerCase();

      if (vin.includes(searchStr) || barcodeVin.includes(searchStr)) {
        if (!lowerPart || rowPart.includes(lowerPart)) {
          const vehicle = mapRowToVehicleData(row, i + 1);
          // 단일 검색 결과일 경우 해당 영업점 통계 추가 (UI 요약용)
          vehicle.branchSummary = calculateBranchStats(vehicle.salesPoint, data, part);
          results.push(vehicle);
        }
      }
    }
    
    return results.slice(0, 30);
  } catch (e) {
    console.error('searchBS error: ' + e.toString());
    return { error: e.toString() };
  }
}

/**
 * 마스터 통계 조회
 */
function getMasterStats(masterName, part) {
  try {
    const ss = SpreadsheetApp.openById(BS_SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    let total = 0, completed = 0;
    let regularTotal = 0, regularCompleted = 0;
    let reworkTotal = 0, reworkCompleted = 0;
    const branchStatsMap = {};

    const targetMaster = String(masterName).trim().toLowerCase();
    const lowerPart = part ? part.toLowerCase().trim() : '';

    for (let i = 4; i < data.length; i++) {
      const row = data[i];
      const rowMaster = String(row[11] || '').trim().toLowerCase();
      const rowPart = String(row[10] || '').toLowerCase();
      
      if (rowMaster === targetMaster && (!lowerPart || rowPart.includes(lowerPart))) {
        const isCompleted = String(row[12] || '').trim() !== '';
        const type = String(row[9] || '');
        const branchName = String(row[4] || '기타');

        total++;
        if (isCompleted) completed++;

        if (type.includes('리워크')) {
          reworkTotal++;
          if (isCompleted) reworkCompleted++;
        } else if (type === 'O') {
          regularTotal++;
          if (isCompleted) regularCompleted++;
        }

        if (!branchStatsMap[branchName]) {
          branchStatsMap[branchName] = { 
            name: branchName, total: 0, completed: 0, 
            regularTotal: 0, regularCompleted: 0, 
            reworkTotal: 0, reworkCompleted: 0 
          };
        }
        const b = branchStatsMap[branchName];
        b.total++;
        if (isCompleted) b.completed++;
        if (type.includes('리워크')) {
          b.reworkTotal++;
          if (isCompleted) b.reworkCompleted++;
        } else if (type === 'O') {
          b.regularTotal++;
          if (isCompleted) b.regularCompleted++;
        }
      }
    }

    const branchStats = Object.values(branchStatsMap).map(b => ({
      ...b,
      rate: b.total ? Math.round((b.completed / b.total) * 100) : 0,
      regularRate: b.regularTotal ? Math.round((b.regularCompleted / b.regularTotal) * 100) : 0,
      reworkRate: b.reworkTotal ? Math.round((b.reworkCompleted / b.reworkTotal) * 100) : 0
    })).sort((a, b) => b.rate - a.rate);

    return {
      total, completed,
      completionRate: total ? Math.round((completed / total) * 100) : 0,
      regularTotal, regularCompleted,
      regularCompletionRate: regularTotal ? Math.round((regularCompleted / regularTotal) * 100) : 0,
      reworkTotal, reworkCompleted,
      reworkCompletionRate: reworkTotal ? Math.round((reworkCompleted / reworkTotal) * 100) : 0,
      branchStats
    };
  } catch (e) {
    return { error: e.toString() };
  }
}

/**
 * 메모 저장
 */
function saveMemo(vin, memo) {
  try {
    const ss = SpreadsheetApp.openById(BS_SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    const targetVin = String(vin).trim();

    for (let i = 4; i < data.length; i++) {
      if (String(data[i][1]).trim() === targetVin) { // B열 차대번호
        sheet.getRange(i + 1, 15).setValue(memo); // O열(15) 비고/메모
        return { success: true, message: '비고가 저장되었습니다.' };
      }
    }
    return { success: false, message: '해당 차대번호를 찾을 수 없습니다.' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * 점검 완료 처리
 */
function markAsComplete(vin, memo, processTypes) {
  try {
    const ss = SpreadsheetApp.openById(BS_SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const today = Utilities.formatDate(new Date(), "GMT+9", "yyyy-MM-dd");
    
    const targetVin = String(vin).trim();

    for (let i = 4; i < data.length; i++) {
      if (String(data[i][1]).trim() === targetVin) {
        const rowIdx = i + 1;
        sheet.getRange(rowIdx, 13).setValue('완료');      // M열(13): 완료
        sheet.getRange(rowIdx, 14).setValue(today);      // N열(14): 완료일
        sheet.getRange(rowIdx, 15).setValue(memo);       // O열(15): 비고
        
        // 처리 구분 (R~U열)
        if (processTypes) {
          sheet.getRange(rowIdx, 18).setValue(processTypes.inspection ? 'O' : ''); // R
          sheet.getRange(rowIdx, 19).setValue(processTypes.replace ? 'O' : '');    // S
          sheet.getRange(rowIdx, 20).setValue(processTypes.transfer ? 'O' : '');   // T
          sheet.getRange(rowIdx, 21).setValue(processTypes.disposal ? 'O' : '');   // U
        }
        
        return { success: true, message: '점검 완료 처리되었습니다.' };
      }
    }
    return { success: false, message: '해당 차대번호를 찾을 수 없습니다.' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * 행 데이터를 객체로 변환 (5행 이후 기준 컬럼 매핑)
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

/**
 * 바코드를 통해 차대번호 조회 (사용자 요청 명칭 통합)
 */
function lookupBarcode(barcode) {
  try {
    const ss = SpreadsheetApp.openById(BS_SPREADSHEET_ID);
    const sheet = ss.getSheetByName('차대정보');
    if (!sheet) return { success: false, message: "'차대정보' 시트를 찾을 수 없습니다." };
    
    const data = sheet.getDataRange().getValues();
    const searchBarcode = String(barcode).trim();
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === searchBarcode) {
        return { found: true, vin: String(data[i][1]).trim() };
      }
    }
    return { found: false, error: "매칭되는 차대번호가 없습니다." };
  } catch (e) {
    return { found: false, error: e.toString() };
  }
}


function getSalesPointInfo(keyword, part) {
  try {
    const ss = SpreadsheetApp.openById(BRANCH_DB_SS_ID);
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const results = [];
    
    if (!keyword) return { error: '검색어를 입력해주세요.' };

    const searchStr = String(keyword).trim().toLowerCase();
    const filterPart = part && part !== '전체' ? part.trim() : '';

    // 헤더(1행) 제외하고 2행(index 1)부터 검색
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const category = String(row[0] || '').trim(); // A열: 분류
      const name = String(row[1] || '').trim();     // B열: 영업점
      const address = String(row[2] || '').trim();  // C열: 주소
      const phone = String(row[3] || '').trim();    // D열: 영업점번호
      const managerPhone = String(row[4] || '').trim(); // E열: 점장번호

      // 1. 파트 필터링 (분류 매칭)
      if (filterPart && category !== filterPart) continue;

      // 2. 키워드 검색 (영업점명 매칭)
      if (name.toLowerCase().includes(searchStr)) {
        results.push({
          category: category,
          name: name,
          address: address,
          phone: phone,
          managerPhone: managerPhone
        });
      }
    }

    if (results.length === 0) return { error: '검색 결과가 없습니다.' };
    return results; // 배열 반환
  } catch (e) {
    return { error: 'DB 조회 중 에러: ' + e.toString() };
  }
}

/**
 * 영업점별 작업 현황 상세 조회
 * @param {string} salesPointName - 영업점명
 * @param {string} part - 서비스 파트 필터
 */
function getBranchWorkCount(salesPointName, part) {
  if (!salesPointName) return null;
  
  try {
    const ss = SpreadsheetApp.openById(BS_SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    const targetName = String(salesPointName).trim();
    const lowerPart = part ? part.toLowerCase().trim() : '';

    let regularTotal = 0, regularCompleted = 0;
    let reworkTotal = 0, reworkCompleted = 0;
    
    const regularVehicles = [];
    const reworkVehicles = [];
    
    // 5행부터 데이터 시작
    for (let i = 4; i < data.length; i++) {
      const row = data[i];
      const rowBranch = String(row[4] || '').trim(); // E열: 영업점
      const rowPart = String(row[10] || '').toLowerCase(); // K열: 부품
      
      if (rowBranch === targetName && (!lowerPart || rowPart.includes(lowerPart))) {
        const isCompleted = String(row[12] || '').trim() !== ''; // M열: 완료 여부
        const bsTarget = String(row[9] || ''); // J열: BS 점검대상
        
        const vehicleInfo = {
          vin: String(row[1]).trim(),
          cartVersion: row[0],
          status: isCompleted ? '완료' : '미완료'
        };

        if (bsTarget.includes('리워크')) {
          reworkTotal++;
          if (isCompleted) reworkCompleted++;
          reworkVehicles.push(vehicleInfo);
        } else if (bsTarget === 'O') {
          regularTotal++;
          if (isCompleted) regularCompleted++;
          regularVehicles.push(vehicleInfo);
        }
      }
    }
    
    const total = regularTotal + reworkTotal;
    const completed = regularCompleted + reworkCompleted;
    
    return {
      total: total,
      completed: completed,
      remaining: total - completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      
      regularTotal: regularTotal,
      regularCompleted: regularCompleted,
      regularRate: regularTotal > 0 ? Math.round((regularCompleted / regularTotal) * 100) : 0,
      regularVehicles: regularVehicles,
      
      reworkTotal: reworkTotal,
      reworkCompleted: reworkCompleted,
      reworkRate: reworkTotal > 0 ? Math.round((reworkCompleted / reworkTotal) * 100) : 0,
      reworkVehicles: reworkVehicles
    };
  } catch (e) {
    return { error: e.toString() };
  }
}

