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
      if (String(data[i][0]) === String(employeeId) && String(data[i][1]) === String(password)) {
        const userName = data[i][2] || '사용자'; // C열: 이름
        
        // D~N열: 모든 메뉴 권한 정보
        const fullPermissions = {
          bs: [data[i][3], data[i][4], data[i][5], data[i][6]], // D~G (서비스1~4)
          address: data[i][7], // H
          parts: data[i][8],   // I
          delivery: [data[i][9], data[i][10], data[i][11]], // J~L
          stats: data[i][12],  // M
          guide: data[i][13]   // N
        };
        
        return { 
          success: true, 
          message: '로그인 성공', 
          userName: userName, 
          permissions: fullPermissions 
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
/**
 * 비밀번호 변경용 스프레드시트 (위 SPREADSHEET_ID와 동일하게 사용 중)
 */
const BS_SPREADSHEET_ID = '1uhkhWWBzvleJwKR_D-VAWXNWq7O3JwB4fib7vKZ52iY';
const BRANCH_ADDRESS_SPREADSHEET_ID = '10vY7bq8AXW3XkimW-ibyOGh4LaWRCLaR1Df69Iy9Lt0';


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

    // 데이터는 5행(index 4)부터 시작
    for (let i = 4; i < data.length; i++) {
      const row = data[i];
      const vin = String(row[1] || '').trim().toUpperCase();    // B열(1): 차대번호
      const barcodeVin = String(row[21] || '').trim().toUpperCase(); // V열(21): 바코드 차대번호
      const rowPart = String(row[10] || '').toLowerCase();      // K열(10): 부품/파트

      // 차대번호 또는 바코드 차대번호 매칭
      if (vin.includes(searchStr) || barcodeVin.includes(searchStr)) {
        if (!lowerPart || rowPart.includes(lowerPart)) {
          results.push(mapRowToVehicleData(row, i + 1));
        }
      }
      // 최대 30건 초과 시 루프 종료 (성능 최적화)
      if (results.length >= 30) break;
    }
    
    return results;
  } catch (e) {
    console.error('searchBS error: ' + e.toString());
    return { error: e.toString() };
  }
}

/**
 * 영업점 주소록 검색 및 연관된 BS 데이터 집계
 */
function searchBranchAddress(keyword, part) {
  try {
    const addressSs = SpreadsheetApp.openById(BRANCH_ADDRESS_SPREADSHEET_ID);
    const addressSheet = addressSs.getSheets()[0];
    const addressData = addressSheet.getDataRange().getValues();
    
    // 차대정보가 있는 BS 시트 접근
    const bsSs = SpreadsheetApp.openById(BS_SPREADSHEET_ID);
    const bsSheet = bsSs.getSheets()[0];
    const bsData = bsSheet.getDataRange().getValues();

    const results = [];
    const searchKeyword = String(keyword || '').trim().toLowerCase().replace(/\s+/g, ''); // 검색어 공백 제거
    const searchPart = String(part || '').trim().toLowerCase();

    // 데이터는 2행(index 1)부터 시작한다고 가정
    for (let i = 1; i < addressData.length; i++) {
        // 주소록 시트 구조 (A:분류, B:영업점, C:주소지, D:영업점 번호, E:점장번호)
        const rowPart = String(addressData[i][0] || '').trim().toLowerCase(); 
        const rowBranch = String(addressData[i][1] || '').trim().toLowerCase().replace(/\s+/g, ''); // 영업점명 공백 제거
        
        // 검색어 매칭 (영업점명 부분 일치)
        if (rowBranch.includes(searchKeyword)) { // 검색어에서도 공백 제거
          // 권한별 파트 매칭 ('전체'일 경우 searchPart가 빈 문자열이므로 통과됨)
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
                  bsList: [],     // 미완료된 일반 BS
                  bsDoneList: [], // 완료된 일반 BS
                  reworkList: [], // 미완료된 리워크
                  reworkDoneList: []// 완료된 리워크
              }
            };

            // 검색된 영업점의 BS/리워크 현황 매칭
            // BS 시트는 5행(index 4)부터 데이터 시작
            for (let j = 4; j < bsData.length; j++) {
              const bsRowBranch = String(bsData[j][4] || '').trim().toLowerCase(); // E열: 영업점
              
              // 영업점 이름이 일치하는 경우
              if (bsRowBranch === branchInfo.name.toLowerCase()) {
                const vin = String(bsData[j][1] || '').trim(); // B열: 차대번호
                const type = String(bsData[j][9] || ''); // J열: BS점검대상
                const isCompleted = String(bsData[j][12] || '').trim() !== ''; // M열: 완료 여부
                const bsRowPart = String(bsData[j][10] || '').toLowerCase(); // K열: 부품/파트

                // 1. 현재 사용자의 권한 필터(searchPart) 공백 제거 검증
                // 2. 해당 주소록 카드의 분류(branchInfo.part)와 공백 제거 교차 검증
                const cleanCardPart = branchInfo.part.toLowerCase().replace(/\s+/g, '');
                const cleanBsRowPart = bsRowPart.replace(/\s+/g, '');
                const cleanSearchPart = searchPart.replace(/\s+/g, '');

                const isGlobalMatched = !cleanSearchPart || cleanBsRowPart.includes(cleanSearchPart);
                const isCardMatched = !cleanCardPart || !cleanBsRowPart || cleanBsRowPart.includes(cleanCardPart) || cleanCardPart.includes(cleanBsRowPart);

                if (isGlobalMatched && isCardMatched) {
                    // 목록 표시에 필요한 데이터: 차대번호와 차종(필요시 추가)
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
            }

            // 명시적으로 BS와 리워크의 합을 전체 모수로 설정
            branchInfo.stats.totalTarget = branchInfo.stats.bsTotal + branchInfo.stats.reworkTotal;
            branchInfo.stats.completedTarget = branchInfo.stats.bsCompleted + branchInfo.stats.reworkCompleted;
            
            // 계산된 진행률 추가
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
 * 영업점별 통계 계산 헬퍼
 */
function calculateBranchStats(targetBranchName, allData, part) {
  let total = 0, completed = 0;
  let regularTotal = 0, regularCompleted = 0;
  let reworkTotal = 0, reworkCompleted = 0;
  
  const lowerPart = part ? part.toLowerCase().trim().replace(/\s+/g, '') : '';
  const cleanTargetBranch = targetBranchName ? targetBranchName.toLowerCase().replace(/\s+/g, '') : '';

  for (let i = 4; i < allData.length; i++) {
    const row = allData[i];
    const rowBranch = String(row[4] || '').toLowerCase().trim().replace(/\s+/g, ''); // E열: 영업점
    const rowPart = String(row[10] || '').toLowerCase().replace(/\s+/g, ''); // K열: 부품
    
    if (rowBranch === cleanTargetBranch && (!lowerPart || rowPart.includes(lowerPart))) {
      const isCompleted = String(row[12] || '').trim() !== ''; // M열: 완료
      const type = String(row[9] || ''); // J열: BS점검대상
      
      if (type.includes('리워크')) {
        reworkTotal++;
        if (isCompleted) reworkCompleted++;
      } else if (type === 'O') {
        regularTotal++;
        if (isCompleted) regularCompleted++;
      }
    }
  }
  
  total = regularTotal + reworkTotal;
  completed = regularCompleted + reworkCompleted;
  
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
    const lowerPart = part ? part.toLowerCase().trim().replace(/\s+/g, '') : ''; // Added .replace(/\s+/g, '')

    for (let i = 4; i < data.length; i++) {
      const row = data[i];
      const vin = String(row[1] || '').trim().toUpperCase();
      const barcodeVin = String(row[21] || '').trim().toUpperCase();
      const rowPart = String(row[10] || '').toLowerCase().replace(/\s+/g, ''); // Added .replace(/\s+/g, '')

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
    const lowerPart = part ? part.toLowerCase().trim().replace(/\s+/g, '') : ''; // Added .replace(/\s+/g, '')

    for (let i = 4; i < data.length; i++) {
      const row = data[i];
      const rowMaster = String(row[11] || '').trim().toLowerCase(); // L열: 마스터
      const rowPart = String(row[10] || '').toLowerCase().replace(/\s+/g, ''); // K열: 부품
      
      if (rowMaster === targetMaster && (!lowerPart || rowPart.includes(lowerPart))) {
        const isCompleted = String(row[12] || '').trim() !== '';
        const type = String(row[9] || '');
        const dispBranchName = String(row[4] || '기타');
        const cleanBranchName = String(row[4] || '기타').toLowerCase().replace(/\s+/g, '');

        if (type.includes('리워크')) {
          reworkTotal++;
          if (isCompleted) reworkCompleted++;
        } else if (type === 'O') {
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
        } else if (type === 'O') {
          b.regularTotal++;
          if (isCompleted) b.regularCompleted++;
        }
      }
    }
    
    total = regularTotal + reworkTotal;
    completed = regularCompleted + reworkCompleted;

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
