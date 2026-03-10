/**
 * 부품 탈거 관리 - Google Apps Script API
 * 
 * 스프레드시트 ID: 1esBI7e8vqyHwcPYXmMvPxbg9DB3qsxaNK3yRoR5gXyc
 * 
 * 시트 구조:
 *   - 부품명: 분류(B), 부품명(C), 기본수량(D), 최대수량(E)
 *   - 사용자 정보: 사원번호(A), 성명(B)
 *   - 차대정보: 바코드(A), 차대번호(B)
 *   - 데이터(탈거): 차대번호(C), 등록자(D), 등록날짜(E), 부품수량(F~AE)
 */

// ============================================================
// 스프레드시트 설정
// ============================================================

var SPREADSHEET_ID = '1esBI7e8vqyHwcPYXmMvPxbg9DB3qsxaNK3yRoR5gXyc';

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet(name) {
  return getSpreadsheet().getSheetByName(name);
}

// ============================================================
// 진입점: JSON API
// ============================================================

function doGet(e) {
  if (e && e.parameter && e.parameter.mode === 'api') {
    return handleApiRequest(e);
  }
  
  return ContentService
    .createTextOutput(JSON.stringify({ message: '부품 탈거 관리 API' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action || '';
    var result;

    switch (action) {
      case 'uploadPhoto':
        result = uploadPhoto(body.base64, body.filename, body.vin);
        break;
      case 'submitRecord':
        result = submitRecord(body.vin, body.empNo, body.parts);
        break;
      default:
        result = { error: 'Unknown POST action: ' + action };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GET API 요청 핸들러
 * 호출 예시: ?mode=api&action=login&empNo=190302
 */
function handleApiRequest(e) {
  var action = e.parameter.action || '';
  var result;

  try {
    switch (action) {
      case 'login':
        result = login(e.parameter.empNo || '');
        break;
      case 'getPartsList':
        result = getPartsList();
        break;
      case 'lookupBarcode':
        result = lookupBarcode(e.parameter.barcode || '');
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

// ============================================================
// API 1: 사원번호 로그인 검증
// 시트: 사용자 정보 (A열: 사원번호, B열: 성명)
// ============================================================

function login(empNo) {
  if (!empNo) return { valid: false, error: '사원번호를 입력해주세요.' };

  var sheet = getSheet('사용자 정보');
  var data = sheet.getDataRange().getValues();
  var searchNo = String(empNo).trim();

  // 1행은 헤더, 2행부터 데이터
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === searchNo) {
      return {
        valid: true,
        empNo: searchNo,
        name: String(data[i][1]).trim()
      };
    }
  }

  return { valid: false, error: '등록되지 않은 사원번호입니다.' };
}

// ============================================================
// API 2: 부품 목록 조회
// 시트: 부품명 (B열: 분류, C열: 부품명, D열: 기본수량, E열: 최대수량)
// ============================================================

function getPartsList() {
  var sheet = getSheet('부품명');
  var data = sheet.getDataRange().getValues();
  var parts = [];

  // 1행은 헤더, 2행부터 데이터
  for (var i = 1; i < data.length; i++) {
    var category = String(data[i][1]).trim();  // B열: 분류
    var name = String(data[i][2]).trim();       // C열: 부품명
    var defaultQty = Number(data[i][3]) || 0;   // D열: 기본수량
    var maxQty = Number(data[i][4]) || 1;       // E열: 최대수량

    if (name) {
      parts.push({
        index: i - 1,        // 0부터 시작하는 인덱스
        category: category,
        name: name,
        defaultQty: defaultQty,
        maxQty: maxQty
      });
    }
  }

  return { parts: parts };
}

// ============================================================
// API 3: 바코드 → 차대번호 조회
// 시트: 차대정보 (A열: 바코드, B열: 차대번호)
// ============================================================

function lookupBarcode(barcode) {
  if (!barcode) return { found: false, error: '바코드 값이 없습니다.' };

  var sheet = getSheet('차대정보');
  var data = sheet.getDataRange().getValues();
  var searchBarcode = String(barcode).trim();

  // 1행은 헤더, 2행부터 데이터
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === searchBarcode) {
      return {
        found: true,
        barcode: searchBarcode,
        vin: String(data[i][1]).trim()
      };
    }
  }

  return { found: false, error: '등록되지 않은 바코드입니다.' };
}

// ============================================================
// API 4: 탈거 기록 저장
// 시트: 데이터(탈거)
//   C열: 차대번호, D열: 등록자, E열: 등록날짜
//   F~AE열: 부품별 탈거수량 (26개 부품)
// ============================================================

function submitRecord(vin, empNo, parts) {
  if (!vin) return { success: false, error: '차대번호가 없습니다.' };
  if (!empNo) return { success: false, error: '사원번호가 없습니다.' };

  // 사원번호 → 성명 조회
  var loginResult = login(empNo);
  if (!loginResult.valid) {
    return { success: false, error: loginResult.error };
  }
  var employeeName = loginResult.name;

  var sheet = getSheet('데이터(탈거)');
  var now = new Date();
  var dateStr = Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd HH:mm');

  // 새 행 데이터 구성 (A, B열은 비움 → C열부터)
  var rowData = [];
  rowData[0] = '';              // A열 (비움)
  rowData[1] = '';              // B열 (비움)
  rowData[2] = String(vin);     // C열: 차대번호
  rowData[3] = employeeName;    // D열: 등록자 (성명)
  rowData[4] = dateStr;         // E열: 등록날짜

  // F~AE열: 부품별 수량 (인덱스 5~30, 총 26개)
  // parts 배열은 [{index: 0, qty: 1}, {index: 1, qty: 0}, ...] 형태
  for (var col = 5; col <= 30; col++) {
    rowData[col] = 0; // 기본값 0
  }

  if (parts && parts.length > 0) {
    for (var j = 0; j < parts.length; j++) {
      var partIndex = parts[j].index;  // 부품 인덱스 (0~25)
      var qty = Number(parts[j].qty) || 0;
      rowData[5 + partIndex] = qty;    // F열(인덱스5)부터 매핑
    }
  }

  // 시트에 행 추가
  sheet.appendRow(rowData);
  var lastRow = sheet.getLastRow();

  return {
    success: true,
    row: lastRow,
    date: dateStr,
    employee: employeeName,
    message: '탈거 기록이 저장되었습니다.'
  };
}

// ============================================================
// API 5: 사진 업로드 (Google Drive)
// ============================================================

function uploadPhoto(base64Data, filename, vin) {
  if (!base64Data) return { success: false, error: '사진 데이터가 없습니다.' };

  try {
    // '부품탈거_사진' 폴더 생성 또는 기존 폴더 사용
    var folderName = '부품탈거_사진';
    var folders = DriveApp.getFoldersByName(folderName);
    var folder;

    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }

    // 차대번호별 하위 폴더
    if (vin) {
      var vinFolderName = String(vin);
      var vinFolders = folder.getFoldersByName(vinFolderName);
      if (vinFolders.hasNext()) {
        folder = vinFolders.next();
      } else {
        folder = folder.createFolder(vinFolderName);
      }
    }

    // Base64 디코딩 → Blob → 파일 생성
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, 'image/jpeg', filename || 'photo.jpg');
    var file = folder.createFile(blob);

    // 공유 링크 생성
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var fileUrl = file.getUrl();

    return {
      success: true,
      url: fileUrl,
      fileId: file.getId(),
      message: '사진이 업로드되었습니다.'
    };
  } catch (err) {
    return { success: false, error: '사진 업로드 실패: ' + err.message };
  }
}

// ============================================================
// 테스트 함수 (GAS 편집기에서 실행)
// ============================================================

function testLogin() {
  var result = login('190302');
  Logger.log(JSON.stringify(result, null, 2));
  // 예상: { valid: true, empNo: "190302", name: "신경민" }
}

function testGetPartsList() {
  var result = getPartsList();
  Logger.log('부품 수: ' + result.parts.length);
  Logger.log(JSON.stringify(result.parts.slice(0, 3), null, 2));
}

function testLookupBarcode() {
  var result = lookupBarcode('TEST_BARCODE');
  Logger.log(JSON.stringify(result, null, 2));
}

function testSubmitRecord() {
  var parts = [
    { index: 0, qty: 1 },   // SK배터리 1개
    { index: 6, qty: 2 }    // 냉장고 키락커 2개
  ];
  var result = submitRecord('TEST_VIN_001', '200314', parts);
  Logger.log(JSON.stringify(result, null, 2));
}

function testPing() {
  Logger.log('API OK - ' + new Date().toISOString());
}
