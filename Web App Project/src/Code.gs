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
function updatePassword(employeeId, oldPassword, newPassword) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    // 헤더가 있을 수 있으므로 그대로 순회하며 찾습니다.
    for (let i = 0; i < data.length; i++) {
      // A열: 사원번호 (index 0), B열: 비밀번호 (index 1)
      if (String(data[i][0]) === String(employeeId)) {
        if (String(data[i][1]) === String(oldPassword)) {
          // 기존 비밀번호 일치: 새 비밀번호로 업데이트 (i는 0-index이므로 실제 행은 i+1, B열은 2번 열)
          sheet.getRange(i + 1, 2).setValue(newPassword);
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
const BS_SERVICE_SHEETS = ['서비스1', '서비스2', '서비스3', '서비스4'];

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
function searchBranchAddress(keyword, part) {
  try {
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
function searchBS(keyword, part) {
  try {
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
 * 마스터 통계 조회 (시트명 기반)
 */
function getMasterStats(masterName, part) {
  try {
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
function saveMemo(vin, memo) {
  try {
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
function markAsComplete(vin, memo, processTypes) {
  try {
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
function getDeliveryBranchOptionsByPart(part) {
  try {
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

function normalizeDeliveryStatus(rawStatus) {
  const status = normalizeText(rawStatus);
  if (status === 'approved' || status === '승인' || status === '배차승인') {
    return '배차승인';
  }
  return '배차신청';
}

/**
 * 배차 목록 조회
 */
function getDeliveryList(filters) {
  try {
    const filter = filters || {};
    const ss = SpreadsheetApp.openById(DELIVERY_SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const items = [];

    const selectedDate = String(filter.date || '').trim();
    const searchKey = String(filter.searchKey || 'part').trim();
    const searchValue = normalizeText(filter.searchValue || '');
    const statusFilter = String(filter.status || 'ALL').trim();

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
        status: '' // Q (배차상태)
      };

      item.status = normalizeDeliveryStatus(row[16]);
      item.searchDate = item.approvedDate || item.applyDate;

      if (!item.requesterName && !item.category) continue;
      if (selectedDate && item.searchDate !== selectedDate) continue;
      if (statusFilter === 'APPLY' && item.status !== '배차신청') continue;
      if (statusFilter === 'APPROVED' && item.status !== '배차승인') continue;

      if (searchValue) {
        let target = '';
        if (searchKey === 'part') {
          target = [item.originPart, item.destPart].join(' ');
        } else if (searchKey === 'origin') {
          target = [item.originBranch, item.originAddress, item.originManual].join(' ');
        } else if (searchKey === 'dest') {
          target = [item.destBranch, item.destAddress, item.destManual].join(' ');
        } else if (searchKey === 'requester') {
          target = item.requesterName;
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
function getDeliveryApprovalList(filters) {
  try {
    const filter = filters || {};
    const dateFrom = String(filter.dateFrom || '').trim();
    const dateTo = String(filter.dateTo || '').trim();
    const query = normalizeText(filter.query || '');
    const statusFilter = String(filter.status || 'ALL').trim();

    const res = getDeliveryList({ status: 'ALL' });
    if (!res || !res.success) {
      return { success: false, message: '목록 조회 실패', items: [] };
    }

    const items = (res.items || []).filter(function (item) {
      const searchDate = String(item.searchDate || '').trim();
      if (dateFrom && (!searchDate || searchDate < dateFrom)) return false;
      if (dateTo && (!searchDate || searchDate > dateTo)) return false;
      if (statusFilter === 'APPLY' && item.status !== '배차신청') return false;
      if (statusFilter === 'APPROVED' && item.status !== '배차승인') return false;

      if (query) {
        const target = normalizeText([
          item.destBranch, item.destAddress, item.destManual, item.requesterName
        ].join(' '));
        if (!target.includes(query)) return false;
      }
      return true;
    });

    return { success: true, items: items };
  } catch (e) {
    return { success: false, message: e.toString(), items: [] };
  }
}

/**
 * 배차 승인 처리
 */
function approveDeliveryRequest(rowNo) {
  try {
    const rowIndex = Number(rowNo);
    if (!rowIndex || rowIndex < 2) return { success: false, message: '유효하지 않은 행 번호입니다.' };

    const ss = SpreadsheetApp.openById(DELIVERY_SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];
    const today = Utilities.formatDate(new Date(), 'GMT+9', 'yyyy-MM-dd');

    sheet.getRange(rowIndex, 15).setValue(today); // O
    sheet.getRange(rowIndex, 17).setValue('배차승인'); // Q

    return { success: true, message: '배차 승인 처리되었습니다.', approvedDate: today };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * 배차 신청 저장
 */
function saveDeliveryApply(payload) {
  try {
    if (!payload) return { success: false, message: '데이터가 없습니다.' };

    const requesterName = String(payload.requesterName || '').trim();
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

    if (!requesterName || !category || !preferredDate) return { success: false, message: '필수 항목이 누락되었습니다.' };

    const ss = SpreadsheetApp.openById(DELIVERY_SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];

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
      '배차신청' // Q
    ];

    sheet.appendRow(row);
    return { success: true, message: '배차 신청이 저장되었습니다.' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function lookupBarcode(barcode) {
  try {
    const ss = SpreadsheetApp.openById(BS_SPREADSHEET_ID);
    const sheet = ss.getSheetByName('차대정보');
    if (!sheet) return { success: false };
    const data = sheet.getDataRange().getValues();
    const search = String(barcode).trim();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === search) return { found: true, vin: String(data[i][1]).trim() };
    }
    return { found: false };
  } catch (e) {
    return { found: false };
  }
}
