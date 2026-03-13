/**
 * 부품 탈거 관리 - Google Apps Script 웹앱
 * 
 * 스프레드시트 ID: 1esBI7e8vqyHwcPYXmMvPxbg9DB3qsxaNK3yRoR5gXyc
 * 
 * 시트 구조:
 *   - 2. 부품명: 분류(B), 부품명(C), 기본수량(D), 최대수량(E)
 *   - 3. 사용자 정보: 사원번호(A), 성명(B)
 *   - 4. 차대정보: 바코드(A), 차대번호(B)
 *   - 1. 데이터(탈거): 차대번호(C), 등록자(D), 등록날짜(E), 부품수량(F~AE)
 */

var SPREADSHEET_ID = '1esBI7e8vqyHwcPYXmMvPxbg9DB3qsxaNK3yRoR5gXyc';

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet(name) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(name);
  
  // 정확한 이름으로 못 찾으면, 부분 매칭 시도
  if (!sheet) {
    var allSheets = ss.getSheets();
    for (var i = 0; i < allSheets.length; i++) {
      var sheetName = allSheets[i].getName();
      if (sheetName.indexOf(name) !== -1 || name.indexOf(sheetName) !== -1) {
        return allSheets[i];
      }
    }
    // 그래도 못 찾으면 에러 + 시트 목록 표시
    var names = allSheets.map(function(s) { return '"' + s.getName() + '"'; }).join(', ');
    throw new Error('시트 "' + name + '"을(를) 찾을 수 없습니다. 사용 가능한 시트: ' + names);
  }
  
  return sheet;
}

// ============================================================
// 웹앱 진입점
// ============================================================

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('부품 탈거 관리')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================================
// 사원번호 로그인 검증
// ============================================================

function login(empNo) {
  if (!empNo) return { valid: false, error: '사원번호를 입력해주세요.' };

  var sheet = getSheet('3. 사용자 정보');
  var data = sheet.getDataRange().getValues();
  var searchNo = String(empNo).trim();

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
// 부품 목록 조회
// ============================================================

function getPartsList() {
  var sheet = getSheet('2. 부품명');
  var data = sheet.getDataRange().getValues();
  var parts = [];
  // 헤더 키워드 필터링 (분류, 부품명 등 헤더행 제외)
  var headerKeywords = ['카트버전', '분류', '부품명', '탈거수량'];

  for (var i = 1; i < data.length; i++) {
    var cartVersion = String(data[i][0]).trim(); // A열: 카트버전
    var category = String(data[i][1]).trim();     // B열: 분류
    var name = String(data[i][2]).trim();          // C열: 부품명
    var defaultQty = Number(data[i][3]) || 0;     // D열: 기본수량
    var maxQty = Number(data[i][4]) || 1;         // E열: 최대수량
    var newPrice = Number(String(data[i][5]).replace(/,/g, '')) || 0;     // F열: 신품 AS단가
    var reusedPrice = Number(String(data[i][6]).replace(/,/g, '')) || 0;  // G열: 재활용품 AS단가

    // 빈 이름이거나 헤더 키워드와 일치하면 건너뛰기
    if (!name) continue;
    var isHeader = false;
    for (var h = 0; h < headerKeywords.length; h++) {
      if (name === headerKeywords[h] || category === headerKeywords[h]) {
        isHeader = true;
        break;
      }
    }
    if (isHeader) continue;

    parts.push({
      index: i - 1,
      cartVersion: cartVersion,
      category: category,
      name: name,
      defaultQty: defaultQty,
      maxQty: maxQty,
      newPrice: newPrice,
      reusedPrice: reusedPrice
    });
  }

  return parts;
}

// ============================================================
// 바코드 → 차대번호 조회
// ============================================================

function lookupBarcode(barcode) {
  if (!barcode) return { found: false, error: '바코드 값이 없습니다.' };

  var sheet = getSheet('4. 차대정보');
  var data = sheet.getDataRange().getValues();
  var searchBarcode = String(barcode).trim();

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
// 중복 차대번호 검사
// ============================================================

function checkDuplicateVin(vin) {
  if (!vin) return { exists: false };

  var sheet = getSheet('1. 데이터(탈거)');
  var lastCol = sheet.getLastColumn();
  var lastRow = sheet.getLastRow();
  var headerRow = sheet.getRange(3, 1, 1, lastCol).getValues()[0];

  // C열 3행부터 실제 데이터 범위만 읽기
  if (lastRow < 4) return { exists: false }; // 데이터 없음
  var cColData = sheet.getRange(4, 3, lastRow - 3, 1).getValues();
  var searchVin = String(vin).trim();

  for (var r = 0; r < cColData.length; r++) {
    if (String(cColData[r][0]).trim() === searchVin) {
      var rowNum = r + 4; // 실제 행 번호 (4행부터 시작)
      var rowData = sheet.getRange(rowNum, 1, 1, lastCol).getValues()[0];

      // 부품명 → 기존 수량 매핑
      var existingParts = {};
      for (var h = 0; h < headerRow.length; h++) {
        var headerName = String(headerRow[h]).trim();
        var val = Number(rowData[h]) || 0;
        if (headerName && val > 0) {
          existingParts[headerName] = val;
        }
      }

      return {
        exists: true,
        row: rowNum,
        employee: String(rowData[3]).trim(),
        date: String(rowData[4]).trim(),
        existingParts: existingParts
      };
    }
  }

  return { exists: false };
}

// ============================================================
// 기존 행 수정 (업데이트)
// ============================================================

function updateRecord(row, vin, empNo, parts) {
  if (!row) return { success: false, error: '수정할 행 정보가 없습니다.' };
  if (!vin) return { success: false, error: '차대번호가 없습니다.' };
  if (!empNo) return { success: false, error: '사원번호가 없습니다.' };

  var loginResult = login(empNo);
  if (!loginResult.valid) {
    return { success: false, error: loginResult.error };
  }
  var employeeName = loginResult.name;

  var sheet = getSheet('1. 데이터(탈거)');
  var now = new Date();
  var dateStr = Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd');

  var lastCol = sheet.getLastColumn();
  var headerRow = sheet.getRange(3, 1, 1, lastCol).getValues()[0];
  var partColumnMap = {};
  for (var h = 0; h < headerRow.length; h++) {
    var headerName = String(headerRow[h]).trim();
    if (headerName) {
      partColumnMap[headerName] = h;
    }
  }

  // 기존 행 데이터 읽기 (A, B열 보존)
  var existingRow = sheet.getRange(row, 1, 1, lastCol).getValues()[0];
  var rowData = [];
  for (var col = 0; col < lastCol; col++) {
    rowData[col] = existingRow[col]; // 기존 값 유지
  }

  rowData[2] = String(vin);
  rowData[3] = employeeName;
  rowData[4] = dateStr;

  // 부품 열 초기화 후 새 값 세팅
  for (var p in partColumnMap) {
    var ci = partColumnMap[p];
    if (ci >= 5) rowData[ci] = ''; // F열부터 부품 열만 빈칸으로 초기화
  }

  if (parts && parts.length > 0) {
    for (var j = 0; j < parts.length; j++) {
      var partName = String(parts[j].name || '').trim();
      var qty = Number(parts[j].qty) || 0;
      if (partColumnMap[partName] !== undefined) {
        rowData[partColumnMap[partName]] = qty;
      }
    }
  }

  sheet.getRange(row, 1, 1, lastCol).setValues([rowData]);

  return {
    success: true,
    row: row,
    date: dateStr,
    employee: employeeName,
    message: '기록이 수정되었습니다.'
  };
}

// ============================================================
// 탈거 기록 저장 (신규)
// ============================================================

function submitRecord(vin, empNo, parts) {
  if (!vin) return { success: false, error: '차대번호가 없습니다.' };
  if (!empNo) return { success: false, error: '사원번호가 없습니다.' };

  var loginResult = login(empNo);
  if (!loginResult.valid) {
    return { success: false, error: loginResult.error };
  }
  var employeeName = loginResult.name;

  var sheet = getSheet('1. 데이터(탈거)');
  var now = new Date();
  var dateStr = Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd');

  // 3행(인덱스 2)의 헤더를 읽어서 부품명 → 열 인덱스 매핑
  var headerRow = sheet.getRange(3, 1, 1, sheet.getLastColumn()).getValues()[0];
  var partColumnMap = {};  // { 부품명: 열인덱스 }
  for (var h = 0; h < headerRow.length; h++) {
    var headerName = String(headerRow[h]).trim();
    if (headerName) {
      partColumnMap[headerName] = h;
    }
  }

  // 행 데이터 초기화 (헤더 열 수만큼)
  var totalCols = headerRow.length;
  var rowData = [];
  for (var col = 0; col < totalCols; col++) {
    rowData[col] = '';
  }
  rowData[2] = String(vin);       // C열: 차대번호
  rowData[3] = employeeName;      // D열: 등록자
  rowData[4] = dateStr;           // E열: 등록일자

  // 부품 수량 매핑 (부품명으로 열 찾기)
  if (parts && parts.length > 0) {
    for (var j = 0; j < parts.length; j++) {
      var partName = String(parts[j].name || '').trim();
      var qty = Number(parts[j].qty) || 0;
      // 부품명으로 열 찾기
      if (partColumnMap[partName] !== undefined) {
        rowData[partColumnMap[partName]] = qty;
      }
    }
  }

  // C열(3열) 기준으로 마지막 데이터 행 찾기 (A~B열 데이터 무시)
  var lastRow = sheet.getLastRow();
  var nextRow = 4; // 최소 4행부터 (1~3행은 헤더)
  if (lastRow >= 4) {
    var cColData = sheet.getRange(4, 3, lastRow - 3, 1).getValues();
    for (var r = cColData.length - 1; r >= 0; r--) {
      if (String(cColData[r][0]).trim() !== '') {
        nextRow = r + 5; // 마지막 데이터 행(r+4) + 1
        break;
      }
    }
  }

  // 해당 행에 직접 기록
  sheet.getRange(nextRow, 1, 1, totalCols).setValues([rowData]);

  return {
    success: true,
    row: nextRow,
    date: dateStr,
    employee: employeeName,
    message: '탈거 기록이 저장되었습니다.'
  };
}

// ============================================================
// 재사용품 이관 기록
// ============================================================

function submitTransfer(dateStr, transferType, parts) {
  if (!dateStr) return { success: false, error: '등록일자를 선택해주세요.' };
  if (!transferType) return { success: false, error: '이관구분을 선택해주세요.' };
  if (!parts || parts.length === 0) return { success: false, error: '부품을 선택해주세요.' };

  var sheet = getSheet('5. 재사용품 이관');
  var lastRow = sheet.getLastRow();
  var nextRow = Math.max(lastRow + 1, 3); // 최소 3행부터

  // 출고지점 매핑
  var locationMap = {
    'QC 검수 완료': '',
    'SCM 이관': '부곡창고',
    '화산자원 이관': '화산자원'
  };
  var location = locationMap[transferType] !== undefined ? locationMap[transferType] : '';

  var rowsAdded = 0;

  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    var qty = Number(p.qty) || 0;
    if (qty <= 0) continue;

    var rowNum = nextRow + rowsAdded;
    var rowData = [];
    rowData[0] = dateStr;              // A: 등록일자
    rowData[1] = transferType;         // B: 이관구분
    rowData[2] = p.category || '';     // C: 분류
    rowData[3] = p.name || '';         // D: 부품명
    rowData[4] = qty;                  // E: 수량
    rowData[5] = p.newPrice || 0;      // F: 신품 AS단가
    rowData[6] = qty * (p.newPrice || 0);       // G: 신품 부품금액 (E*F)
    rowData[7] = p.reusedPrice || 0;   // H: 재사용품 AS단가
    rowData[8] = qty * (p.reusedPrice || 0);    // I: 재사용 부품금액 (E*H)
    rowData[9] = rowData[6] - rowData[8];       // J: 절감금액 (G-I)
    rowData[10] = location;            // K: 출고지점
    rowData[11] = '';                  // L: 출고날짜
    rowData[12] = '';                  // M: 특이사항 (빈칸 or 14번째 열)
    rowData[13] = '';                  // N: (여유)

    sheet.getRange(rowNum, 1, 1, 14).setValues([rowData]);
    rowsAdded++;
  }

  return {
    success: true,
    rowsAdded: rowsAdded,
    startRow: nextRow,
    message: rowsAdded + '건의 이관 기록이 저장되었습니다.'
  };
}

// ============================================================
// 사진 업로드 (Google Drive)
// ============================================================

function uploadPhoto(base64Data, filename, vin) {
  if (!base64Data) return { success: false, error: '사진 데이터가 없습니다.' };

  try {
    var folderName = '부품탈거_사진';
    var folders = DriveApp.getFoldersByName(folderName);
    var folder;

    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }

    if (vin) {
      var vinFolderName = String(vin);
      var vinFolders = folder.getFoldersByName(vinFolderName);
      if (vinFolders.hasNext()) {
        folder = vinFolders.next();
      } else {
        folder = folder.createFolder(vinFolderName);
      }
    }

    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, 'image/jpeg', filename || 'photo.jpg');
    var file = folder.createFile(blob);

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success: true,
      url: file.getUrl(),
      fileId: file.getId(),
      message: '사진이 업로드되었습니다.'
    };
  } catch (err) {
    return { success: false, error: '사진 업로드 실패: ' + err.message };
  }
}

// ============================================================
// 월 목표 등록
// ============================================================

function submitGoal(year, month, cartVersion, parts) {
  if (!year || !month) return { success: false, error: '년/월이 지정되지 않았습니다.' };
  if (!parts || parts.length === 0) return { success: false, error: '선택된 부품이 없습니다.' };

  var sheet = getSheet('6. 월 목표');
  var lastRow = sheet.getLastRow();
  var nextRow = Math.max(lastRow + 1, 3); // 최소 3행부터 (1,2행은 헤더 가정)

  var rowsAdded = 0;

  // 카트구분 매핑 (ex: HY2.0/2.5 -> H2.0/H2.5)
  var mapping = {
    'HY2.0/2.5': 'H2.0/H2.5',
    'HY3.0/3.5': 'H3.0/H3.5'
  };
  var mappedCartVersion = mapping[cartVersion] || cartVersion;

  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    var qty = Number(p.qty) || 0;
    if (qty <= 0) continue;

    var rowNum = nextRow + rowsAdded;
    
    // A~F열 데이터 세팅
    var record = [
      year,                   // A열: 년도
      month,                  // B열: 월
      mappedCartVersion,      // C열: 카트구분
      String(p.name || ''),           // D열: 부품명
      qty,                    // E열: 목표수량
    ];
    
    // F열 신품 단가는 '2. 부품명' 시트 값 사용. 클라이언트에서 안가져왔으므로 서버에서 직접 조회
    var partsList = getPartsList();
    var matchPart = partsList.find(function(item) { return item.name === String(p.name); });
    var newPrice = matchPart ? (matchPart.newPrice || 0) : 0;
    record.push(newPrice);    // F열: 신품 AS단가

    // A~F열 범위 세팅
    sheet.getRange(rowNum, 1, 1, 6).setValues([record]);

    // G열에 수식 세팅: =E열 * F열
    var formula = '=E' + rowNum + '*F' + rowNum;
    sheet.getRange(rowNum, 7).setFormula(formula);

    rowsAdded++;
  }

  return {
    success: true,
    rowsAdded: rowsAdded,
    message: rowsAdded + '건의 월 목표가 저장되었습니다.'
  };
}
