/**
 * CocoCSManager - 앱 전용 GAS API
 * 기존 HY Mobility BS 점검 웹앱 기반, 앱 전용으로 재구성
 * 
 * 변경점:
 * - doGet()에 JSON API 모드 추가 (앱에서 fetch로 호출)
 * - 영업점 검색 기능 제거 (앱에서 별도 관리)
 * - 기존 HTML 웹앱도 그대로 유지 (브라우저 접속 시)
 * 
 * 데이터 구조 (5행부터 시작):
 * A: 차종 | B: 차대번호 | C: 지사 | D: 영업소 | E: 영업점
 * F: 지역 | G: 지사영업점지역 | H: 생산일 | I: 생산년도 | J: BS점검대상
 * K: 부품 | L: 마스터 | M: 완료 | N: 완료일 | O: 비고
 * P: 제외사유 | Q: 폐차대상 | R: 점검 | S: 교체 | T: 이관 | U: 폐차
 * V: 차대번호(바코드)
 */

// ============================================================
// 캐싱 & 데이터 버전 관리
// ============================================================

function getDataVersion() {
  var props = PropertiesService.getScriptProperties();
  var version = props.getProperty('DATA_VERSION');
  if (!version) {
    version = new Date().getTime().toString();
    props.setProperty('DATA_VERSION', version);
  }
  return version;
}

function updateDataVersion() {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('DATA_VERSION', new Date().getTime().toString());
}

function getCachedData(key, fetchFunction) {
  var cache = CacheService.getScriptCache();
  var version = getDataVersion();
  var versionedKey = key + "_" + version;

  var cached = cache.get(versionedKey);
  if (cached) {
    return JSON.parse(cached);
  }

  var data = fetchFunction();
  if (data) {
    cache.put(versionedKey, JSON.stringify(data), 180); // 3분 캐싱
  }
  return data;
}

// ============================================================
// 진입점: HTML 웹앱 + JSON API 분기
// ============================================================

function doGet(e) {
  // JSON API 모드 (앱에서 호출 시)
  if (e && e.parameter && e.parameter.mode === 'api') {
    return handleApiRequest(e);
  }

  // HTML 웹앱 모드 (브라우저 접속 시)
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('HY Mobility BS 점검')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * JSON API 요청 핸들러
 * 호출 예시: ?mode=api&action=search&keyword=HYM
 */
function handleApiRequest(e) {
  var action = e.parameter.action || '';
  var result;

  try {
    switch (action) {
      case 'search':
        result = searchVehicleData(e.parameter.keyword || '', e.parameter.part || '');
        break;
      case 'masterStats':
        result = getMasterStats(e.parameter.master || '', e.parameter.part || '');
        break;
      case 'complete':
        var processTypes = {
          inspection: e.parameter.inspection === 'true',
          replace: e.parameter.replace === 'true',
          transfer: e.parameter.transfer === 'true',
          disposal: e.parameter.disposal === 'true'
        };
        result = markAsComplete(
          e.parameter.vin || '',
          e.parameter.memo || '',
          processTypes
        );
        break;
      case 'saveMemo':
        result = saveMemo(e.parameter.vin || '', e.parameter.memo || '');
        break;
      case 'ping':
        result = { status: 'ok', timestamp: new Date().toISOString() };
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * HTML 파일 포함 헬퍼
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
    .getContent();
}

// ============================================================
// 차대번호 검색 (정확 일치 > 뒤 4자리 > 포함 검색)
// ============================================================

function searchVehicleData(query, partFilter) {
  if (!query) return [];

  var searchStr = String(query).trim().toUpperCase();
  if (searchStr.length < 2) return [];

  var cache = CacheService.getScriptCache();
  var cachedData = cache.get('vehicleData');
  var data;

  if (cachedData) {
    try {
      data = JSON.parse(cachedData);
    } catch (e) {
      data = null;
    }
  }

  if (!data) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    data = sheet.getDataRange().getValues();

    try {
      var lightData = [];
      for (var j = 4; j < data.length; j++) {
        lightData.push([
          data[j][0],  // 0: 차종
          data[j][1],  // 1: 차대번호
          data[j][2],  // 2: 지사
          data[j][3],  // 3: 영업소
          data[j][4],  // 4: 영업점
          data[j][5],  // 5: 지역
          data[j][6],  // 6: 지사영업점지역
          data[j][7],  // 7: 생산일
          data[j][8],  // 8: 생산년도
          data[j][9],  // 9: BS점검대상
          data[j][10], // 10: 부품
          data[j][11], // 11: 마스터
          data[j][12], // 12: 완료
          data[j][13], // 13: 완료일
          data[j][14], // 14: 비고
          data[j][15], // 15: 제외사유
          data[j][16], // 16: 폐차대상
          data[j][17], // 17: 점검
          data[j][18], // 18: 교체
          data[j][19], // 19: 이관
          data[j][20], // 20: 폐차
          data[j][21]  // 21: 차대번호(바코드)
        ]);
      }
      cache.put('vehicleData', JSON.stringify(lightData), 300); // 5분
      data = lightData;
    } catch (e) {
      data = data.slice(4);
    }
  }

  var exactMatches = [];
  var endsWithMatches = [];
  var partialMatches = [];

  for (var i = 0; i < data.length; i++) {
    var vinRaw = String(data[i][1]).trim();
    var vinUpper = vinRaw.toUpperCase();
    var barcodeVin = String(data[i][21] || '').trim();
    var barcodeUpper = barcodeVin.toUpperCase();
    // K열(index 10) 파트 필터링
    if (partFilter && String(data[i][10]).trim() !== String(partFilter).trim()) continue;

    var item = formatVehicleData(data[i], i + 5);

    // B열(차대번호) 또는 V열(바코드 차대번호) 매칭
    if (vinUpper === searchStr || barcodeUpper === searchStr) {
      exactMatches.push(item);
    } else if (searchStr.length >= 4 && (vinUpper.endsWith(searchStr) || barcodeUpper.endsWith(searchStr))) {
      endsWithMatches.push(item);
    } else if (vinUpper.includes(searchStr) || barcodeUpper.includes(searchStr)) {
      partialMatches.push(item);
    }
  }

  var results = exactMatches.concat(endsWithMatches).concat(partialMatches);
  return results.slice(0, 20);
}

// ============================================================
// 데이터 포맷팅 헬퍼
// ============================================================

function formatVehicleData(row, rowIndex) {
  return {
    row: rowIndex,
    cartVersion: row[0],
    vin: String(row[1]).trim(),
    branch: row[2],
    salesOffice: row[3],
    salesPoint: row[4],
    district: row[5],
    branchPointDistrict: row[6],
    manufactureDate: formatDate(row[7]),
    productionYear: row[8],
    bsTarget: row[9],
    part: row[10],
    master: row[11],
    completed: row[12],
    completedDate: formatDate(row[13]),
    memo: row[14] || '',
    exclusionReason: row[15] || '',
    disposalTarget: row[16] || '',
    processInspection: row[17] || '',
    processReplace: row[18] || '',
    processTransfer: row[19] || '',
    processDisposal: row[20] || '',
    barcodeVin: row[21] ? String(row[21]).trim() : ''
  };
}

function formatDate(dateValue) {
  if (!dateValue) return '';
  if (dateValue instanceof Date) {
    return Utilities.formatDate(dateValue, 'Asia/Seoul', 'yyyy-MM-dd');
  }
  return String(dateValue).substring(0, 10);
}

// ============================================================
// 비고(메모) 저장
// ============================================================

function saveMemo(vin, memoText) {
  if (!vin) return { success: false, error: '차대번호가 없습니다.' };

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 4; i < data.length; i++) {
    if (String(data[i][1]).trim() === String(vin).trim()) {
      var row = i + 1;
      sheet.getRange(row, 15).setValue(memoText); // O열
      return { success: true, row: row, message: '비고가 저장되었습니다.' };
    }
  }

  return { success: false, error: '해당 차대번호를 찾을 수 없습니다.' };
}

// ============================================================
// 마스터별 통계 조회 (점검대상 / 리워크 분리)
// ============================================================

function getMasterStats(masterName, partFilter) {
  var cacheKey = "master_" + masterName + (partFilter ? "_" + partFilter : "");
  return getCachedData(cacheKey, function () {
    if (!masterName) return {
      total: 0, completed: 0, remaining: 0, completionRate: 0,
      regularTotal: 0, regularCompleted: 0, regularRemaining: 0, regularCompletionRate: 0,
      reworkTotal: 0, reworkCompleted: 0, reworkRemaining: 0, reworkCompletionRate: 0
    };

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();

    var regularTotal = 0, regularCompleted = 0;
    var reworkTotal = 0, reworkCompleted = 0;
    var branchMap = {};

    for (var i = 4; i < data.length; i++) {
      var bsTarget = String(data[i][9]);
      var masterCell = String(data[i][11]);
      var isCompleted = data[i][12] && String(data[i][12]).trim() !== '';

      if (masterCell === String(masterName)) {
        // K열(index 10) 파트 필터링
        if (partFilter && String(data[i][10]).trim() !== String(partFilter).trim()) continue;

        var salesPoint = String(data[i][4]).trim();

        if (salesPoint) {
          if (!branchMap[salesPoint]) {
            branchMap[salesPoint] = {
              total: 0, completed: 0,
              regularTotal: 0, regularCompleted: 0,
              reworkTotal: 0, reworkCompleted: 0
            };
          }

          branchMap[salesPoint].total++;
          if (isCompleted) branchMap[salesPoint].completed++;

          if (bsTarget.indexOf('리워크') !== -1) {
            branchMap[salesPoint].reworkTotal++;
            if (isCompleted) branchMap[salesPoint].reworkCompleted++;
          } else if (bsTarget === 'O') {
            branchMap[salesPoint].regularTotal++;
            if (isCompleted) branchMap[salesPoint].regularCompleted++;
          }
        }

        if (bsTarget.indexOf('리워크') !== -1) {
          reworkTotal++;
          if (isCompleted) reworkCompleted++;
        } else if (bsTarget === 'O') {
          regularTotal++;
          if (isCompleted) regularCompleted++;
        }
      }
    }

    var total = regularTotal + reworkTotal;
    var completed = regularCompleted + reworkCompleted;

    var branchStats = [];
    for (var sp in branchMap) {
      var item = branchMap[sp];
      branchStats.push({
        name: sp,
        total: item.total,
        completed: item.completed,
        rate: item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0,
        regularTotal: item.regularTotal,
        regularCompleted: item.regularCompleted,
        regularRate: item.regularTotal > 0 ? Math.round((item.regularCompleted / item.regularTotal) * 100) : 0,
        reworkTotal: item.reworkTotal,
        reworkCompleted: item.reworkCompleted,
        reworkRate: item.reworkTotal > 0 ? Math.round((item.reworkCompleted / item.reworkTotal) * 100) : 0
      });
    }

    branchStats.sort(function (a, b) {
      if (b.rate !== a.rate) return b.rate - a.rate;
      return a.name.localeCompare(b.name);
    });

    return {
      total: total,
      completed: completed,
      remaining: total - completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      regularTotal: regularTotal,
      regularCompleted: regularCompleted,
      regularRemaining: regularTotal - regularCompleted,
      regularCompletionRate: regularTotal > 0 ? Math.round((regularCompleted / regularTotal) * 100) : 0,
      reworkTotal: reworkTotal,
      reworkCompleted: reworkCompleted,
      reworkRemaining: reworkTotal - reworkCompleted,
      reworkCompletionRate: reworkTotal > 0 ? Math.round((reworkCompleted / reworkTotal) * 100) : 0,
      branchStats: branchStats
    };
  });
}

// ============================================================
// 완료 처리 (M열, N열 날짜, O열 메모, R/S/T/U열 처리구분)
// ============================================================

function markAsComplete(vin, memoText, processTypes) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 4; i < data.length; i++) {
    if (String(data[i][1]).trim() === String(vin).trim()) {
      var row = i + 1;
      var now = new Date();
      var dateStr = Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd');

      sheet.getRange(row, 13).setValue('완료');    // M열: 완료
      sheet.getRange(row, 14).setValue(dateStr);   // N열: 완료일

      if (memoText !== undefined && memoText !== null) {
        sheet.getRange(row, 15).setValue(memoText); // O열: 비고
      }

      if (processTypes) {
        sheet.getRange(row, 18).setValue(processTypes.inspection ? 'O' : ''); // R열
        sheet.getRange(row, 19).setValue(processTypes.replace ? 'O' : '');    // S열
        sheet.getRange(row, 20).setValue(processTypes.transfer ? 'O' : '');   // T열
        sheet.getRange(row, 21).setValue(processTypes.disposal ? 'O' : '');   // U열
      }

      updateDataVersion(); // 캐시 무효화

      return {
        success: true,
        row: row,
        date: dateStr,
        message: '점검이 완료 처리되었습니다.'
      };
    }
  }

  return { success: false, error: '해당 차대번호를 찾을 수 없습니다.' };
}

// ============================================================
// 테스트 함수 (GAS 편집기에서 실행)
// ============================================================

function testSearch() {
  var result = searchVehicleData('HYM');
  Logger.log('검색 결과: ' + result.length + '건');
  Logger.log(JSON.stringify(result.slice(0, 2), null, 2));
}

function testMasterStats() {
  var result = getMasterStats('');
  Logger.log(JSON.stringify(result, null, 2));
}

function testPing() {
  Logger.log('API OK - ' + new Date().toISOString());
}
