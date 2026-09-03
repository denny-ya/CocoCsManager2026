/**
 * AS 일일실적 데이터시트 세팅/검증/가공 스크립트
 *
 * 실행 대상 Google Sheet:
 * - AS_RAW_UNIFIED
 * - AS_MASTER_MAP
 * - AS_DAILY_WORK
 * - AS_DAILY_SUMMARY
 *
 * 주의:
 * - AS_RAW_UNIFIED는 무가공 원본으로 유지하며 수정하지 않습니다.
 * - setupAsDailyStatsSheets()는 AS_MASTER_MAP/AS_DAILY_WORK/AS_DAILY_SUMMARY의 1행 헤더만 갱신합니다.
 * - refreshAsDailyWork()는 AS_DAILY_WORK의 2행 이하를 다시 생성합니다.
 */

const AS_SHEET_NAMES = {
  RAW: 'AS_RAW_UNIFIED',
  MAP: 'AS_MASTER_MAP',
  WORK: 'AS_DAILY_WORK',
  SUMMARY: 'AS_DAILY_SUMMARY'
};

const AS_HEADERS = {
  MAP: [
    '표시순서',
    '사용여부',
    '수리구분',
    '파트',
    '센터명',
    '담당마스터코드',
    '담당마스터',
    'rowType',
    '표시명',
    '비고'
  ],
  WORK: [
    '접수번호',
    '완료구분',
    '접수상태',
    '상태구분',
    '접수구분',
    '접수분류',
    '차대번호',
    '영업점',
    '원본파트',
    '담당마스터코드',
    '담당마스터',
    '접수일',
    '접수월',
    '완료일',
    '완료월',
    '취소일',
    '취소월',
    '센터수리일',
    '공장완료일',
    '처리상태',
    '완료유형',
    '수리구분',
    '파트그룹',
    '센터명',
    'rowType',
    '미완료여부',
    '접수대기여부',
    '장기미완료여부',
    '취소여부',
    '경수리대상여부',
    '중수리대상여부',
    '서비스팩토리대상여부',
    '리드타임고객일수',
    '리드타임센터일수',
    '리드타임공장일수',
    '집계대상여부',
    '검증메모'
  ],
  SUMMARY: [
    '기준일',
    '기준월',
    '파트필터',
    '수리구분필터',
    '표시순서',
    'rowType',
    '표시명',
    '파트',
    '센터명',
    '담당마스터코드',
    '담당마스터',
    '접수당일',
    '접수누적',
    '완료당일',
    '완료누적',
    '미출동당일',
    '미출동누적',
    '출동당일',
    '출동누적',
    '미완료계',
    '접수대기',
    '미완료',
    '장기미완료',
    '리드타임평균',
    '접수취소당일',
    '접수취소누적',
    '취소표시',
    '표시여부',
    '데이터검증',
    '전월이월'
  ]
};

const AS_RAW_REQUIRED_HEADERS = [
  '완료구분',
  '접수상태',
  '상태구분',
  '접수번호',
  '접수구분',
  '접수분류',
  '차대번호',
  '파트',
  '담당마스터코드',
  '담당마스터',
  '접수일자',
  '접수시간',
  '이관일자',
  '이관시간',
  '센터수리일자',
  '센터수리시간',
  '공장수리완료일자',
  '공장수리완료시간',
  '완료일자',
  '완료시간',
  '접수취소일자',
  '접수취소시간',
  '영업점'
];

const AS_LIGHT_DONE_STATUSES = {
  '카트이동': true,
  '카트폐기': true,
  'AS완료': true,
  '부품교체': true,
  '점검수리': true,
  '전화상담(미출동)': true
};

const AS_LIGHT_PENDING_STATUSES = {
  '접수확정': true,
  '방문약속': true
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('AS 실적 관리')
    .addItem('실적 업데이트', 'updateAsDailyStats')
    .addSeparator()
    .addItem('헤더 세팅', 'setupAsDailyStatsSheets')
    .addItem('원본 검증', 'validateAsRawUnifiedData')
    .addItem('작업데이터 갱신', 'refreshAsDailyWork')
    .addItem('요약데이터 갱신', 'refreshAsDailySummary')
    .addToUi();
}

function updateAsDailyStats() {
  setupAsDailyStatsSheets();
  const workResult = refreshAsDailyWork_();
  if (!workResult.success) {
    SpreadsheetApp.getUi().alert(workResult.message);
    return;
  }

  const summaryResult = refreshAsDailySummary_();
  if (!summaryResult.success) {
    SpreadsheetApp.getUi().alert(summaryResult.message);
    return;
  }

  SpreadsheetApp.getUi().alert(
    '실적 업데이트가 완료되었습니다.\n\n' +
    '기준일: ' + summaryResult.dateRangeText + '\n' +
    '작업데이터: ' + workResult.rowCount + '행\n' +
    '요약데이터: ' + summaryResult.rowCount + '행'
  );
}

function setupAsDailyStatsSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  setupHeaderRow_(ss, AS_SHEET_NAMES.MAP, AS_HEADERS.MAP);
  setupHeaderRow_(ss, AS_SHEET_NAMES.WORK, AS_HEADERS.WORK);
  setupHeaderRow_(ss, AS_SHEET_NAMES.SUMMARY, AS_HEADERS.SUMMARY);

  SpreadsheetApp.getUi().alert('AS 일일실적 시트 헤더 세팅이 완료되었습니다.');
}

function validateAsRawUnifiedData() {
  const result = validateAsRawUnifiedData_();
  SpreadsheetApp.getUi().alert(result.message);
}

function refreshAsDailyWork(targetDateText) {
  const result = refreshAsDailyWork_(targetDateText);
  SpreadsheetApp.getUi().alert(result.message);
}

function refreshAsDailySummary(targetDateText) {
  const result = refreshAsDailySummary_(targetDateText);
  SpreadsheetApp.getUi().alert(result.message);
}

function refreshAsDailyWork_(targetDateText) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const validation = validateAsRawUnifiedData_();
  if (!validation.success) {
    return validation;
  }

  const rawSheet = ss.getSheetByName(AS_SHEET_NAMES.RAW);
  const workSheet = ss.getSheetByName(AS_SHEET_NAMES.WORK);
  if (!workSheet) {
    return {
      success: false,
      message: 'AS_DAILY_WORK 시트를 찾을 수 없습니다. setupAsDailyStatsSheets를 먼저 실행해주세요.'
    };
  }

  const rawValues = rawSheet.getDataRange().getDisplayValues();
  const rawHeaders = rawValues[0].map(trimText_);
  const rawIndex = buildHeaderIndex_(rawHeaders);
  const targetDate = parseDateOnly_(targetDateText) || inferTargetDateFromRaw_(rawValues, rawIndex) || todayKstDate_();
  const targetDateValue = formatDateText_(targetDate);
  const masterLookup = buildAsMasterLookup_(ss);
  const output = [];

  for (let i = 1; i < rawValues.length; i++) {
    const row = rawValues[i];
    const item = buildAsDailyWorkRow_(row, rawIndex, masterLookup, targetDate);
    if (item) output.push(item);
  }

  clearSheetBody_(workSheet, AS_HEADERS.WORK.length);
  if (output.length > 0) {
    workSheet.getRange(2, 1, output.length, AS_HEADERS.WORK.length).setValues(output);
  }

  return {
    success: true,
    message: 'AS_DAILY_WORK 생성이 완료되었습니다.\n기준일: ' + targetDateValue + '\n생성 행 수: ' + output.length,
    rowCount: output.length,
    targetDateText: targetDateValue
  };
}

function refreshAsDailySummary_(targetDateText) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const workSheet = ss.getSheetByName(AS_SHEET_NAMES.WORK);
  const summarySheet = ss.getSheetByName(AS_SHEET_NAMES.SUMMARY);

  if (!workSheet) {
    return { success: false, message: 'AS_DAILY_WORK 시트를 찾을 수 없습니다.' };
  }
  if (!summarySheet) {
    return { success: false, message: 'AS_DAILY_SUMMARY 시트를 찾을 수 없습니다.' };
  }

  const workValues = workSheet.getDataRange().getDisplayValues();
  if (workValues.length < 2) {
    return { success: false, message: 'AS_DAILY_WORK 데이터가 없습니다. 작업데이터 갱신을 먼저 실행해주세요.' };
  }

  const workHeaders = workValues[0].map(trimText_);
  const workIndex = buildHeaderIndex_(workHeaders);
  const requestedTargetDate = parseDateOnly_(targetDateText);
  const targetDates = requestedTargetDate
    ? [requestedTargetDate]
    : inferTargetDatesFromWork_(workValues, workIndex);
  if (targetDates.length === 0) {
    targetDates.push(inferTargetDateFromWork_(workValues, workIndex) || todayKstDate_());
  }

  const mapRows = getAsActiveMapRows_(ss);
  const filterPairs = buildAsSummaryFilterPairs_(mapRows);
  const workItems = [];

  for (let i = 1; i < workValues.length; i++) {
    const item = mapWorkRowToObject_(workValues[i], workIndex);
    if (item.receiptNo) workItems.push(item);
  }

  const output = [];
  targetDates.forEach(function(targetDate) {
    const targetDateValue = formatDateText_(targetDate);
    const targetMonth = targetDateValue.substring(0, 7);
    const monthStart = targetMonth + '-01';

    filterPairs.forEach(function(pair) {
      mapRows.forEach(function(mapRow) {
        if (!shouldIncludeMapRowForFilter_(mapRow, pair)) return;

        const matchedItems = workItems.filter(function(item) {
          return matchesSummaryRow_(item, mapRow, pair);
        });
        const metrics = calculateSummaryMetrics_(matchedItems, targetDateValue, monthStart, targetDate);

        output.push([
          targetDateValue,
          targetMonth,
          pair.part,
          pair.repairType,
          mapRow.displayOrder,
          mapRow.rowType,
          mapRow.displayName,
          mapRow.part,
          mapRow.centerName,
          mapRow.masterCode,
          mapRow.masterName,
          metrics.receiptDaily,
          metrics.receiptMonthly,
          metrics.completeDaily,
          metrics.completeMonthly,
          metrics.noVisitDaily,
          metrics.noVisitMonthly,
          metrics.visitDaily,
          metrics.visitMonthly,
          metrics.incompleteTotal,
          metrics.waiting,
          metrics.incomplete,
          metrics.longIncomplete,
          metrics.leadAverage,
          metrics.cancelDaily,
          metrics.cancelMonthly,
          metrics.cancelDisplay,
          1,
          metrics.validationText,
          metrics.carryoverMonthly
        ]);
      });
    });
  });

  clearSheetBody_(summarySheet, AS_HEADERS.SUMMARY.length);
  if (output.length > 0) {
    summarySheet.getRange(2, 1, output.length, AS_HEADERS.SUMMARY.length).setValues(output);
  }

  const dateRangeText = targetDates.length > 1
    ? formatDateText_(targetDates[0]) + ' ~ ' + formatDateText_(targetDates[targetDates.length - 1])
    : formatDateText_(targetDates[0]);

  return {
    success: true,
    message: 'AS_DAILY_SUMMARY 생성이 완료되었습니다.\n기준일: ' + dateRangeText + '\n생성 행 수: ' + output.length,
    rowCount: output.length,
    targetDateText: formatDateText_(targetDates[targetDates.length - 1]),
    dateRangeText: dateRangeText
  };
}

function setupAndRefreshAsDailyWork() {
  setupAsDailyStatsSheets();
  const workResult = refreshAsDailyWork_();
  if (!workResult.success) {
    SpreadsheetApp.getUi().alert(workResult.message);
    return;
  }
  SpreadsheetApp.getUi().alert(workResult.message);
}

function setupHeaderRow_(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);

  const missingColumnCount = headers.length - sheet.getMaxColumns();
  if (missingColumnCount > 0) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), missingColumnCount);
  }

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  sheet.setFrozenRows(1);
  headerRange
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setBackground('#1f4e79')
    .setFontColor('#ffffff');
  sheet.autoResizeColumns(1, headers.length);
}

function validateAsRawUnifiedData_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(AS_SHEET_NAMES.RAW);
  if (!sheet) {
    return { success: false, message: 'AS_RAW_UNIFIED 시트를 찾을 수 없습니다.' };
  }

  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) {
    return { success: false, message: 'AS_RAW_UNIFIED에 데이터가 없습니다.' };
  }

  const headers = values[0].map(trimText_);
  const missingHeaders = AS_RAW_REQUIRED_HEADERS.filter(function(header) {
    return headers.indexOf(header) === -1;
  });

  if (missingHeaders.length > 0) {
    return {
      success: false,
      message: '필수 헤더가 누락되었습니다.\n\n' + missingHeaders.join('\n')
    };
  }

  const receiptNoIndex = headers.indexOf('접수번호');
  const seen = {};
  const duplicates = [];

  for (let i = 1; i < values.length; i++) {
    const receiptNo = trimText_(values[i][receiptNoIndex]);
    if (!receiptNo) continue;
    if (seen[receiptNo]) {
      duplicates.push(receiptNo);
    } else {
      seen[receiptNo] = true;
    }
  }

  if (duplicates.length > 0) {
    const uniqueDuplicates = Array.from(new Set(duplicates));
    return {
      success: false,
      message: '접수번호 중복이 발견되었습니다. 집계 전 확인이 필요합니다.\n\n' +
        uniqueDuplicates.slice(0, 30).join('\n')
    };
  }

  return { success: true, message: 'AS_RAW_UNIFIED 검증이 완료되었습니다. 중복 접수번호는 없습니다.' };
}

function buildAsDailyWorkRow_(row, index, masterLookup, targetDate) {
  const receiptNo = getCell_(row, index, '접수번호');
  if (!receiptNo) return null;

  const completeFlag = getCell_(row, index, '완료구분');
  const receiptStatus = getCell_(row, index, '접수상태');
  const status = getCell_(row, index, '상태구분');
  const applyType = getCell_(row, index, '접수구분');
  const category = getCell_(row, index, '접수분류');
  const vin = getCell_(row, index, '차대번호');
  const salesPoint = getCell_(row, index, '영업점');
  const rawPart = getCell_(row, index, '파트');
  const rawMasterCode = getCell_(row, index, '담당마스터코드');
  const rawMasterName = getCell_(row, index, '담당마스터');
  const rawReceiptDate = normalizeDateText_(getCell_(row, index, '접수일자'));
  const transferDate = normalizeDateText_(getCell_(row, index, '이관일자'));
  const doneDate = normalizeDateText_(getCell_(row, index, '완료일자'));
  const cancelDate = normalizeDateText_(getCell_(row, index, '접수취소일자'));
  const centerDate = normalizeDateText_(getCell_(row, index, '센터수리일자'));
  const factoryDate = normalizeDateText_(getCell_(row, index, '공장수리완료일자'));

  const notes = [];
  const normalizedMaster = normalizeMaster_(rawMasterCode, rawMasterName, masterLookup);
  let masterCode = normalizedMaster.code;
  let masterName = normalizedMaster.name;
  let mapped = null;

  if (masterCode && masterLookup.byCode[masterCode]) {
    mapped = masterLookup.byCode[masterCode];
  } else if (masterName && masterLookup.byName[masterName]) {
    mapped = masterLookup.byName[masterName];
    masterCode = mapped.code || masterCode;
  }

  const classification = classifyAsRow_(row, index);
  const receiptDate = getAsDailyWorkReceiptDate_(classification, rawReceiptDate, transferDate, notes);
  let partGroup = rawPart;
  let centerName = mapped ? mapped.centerName : '';
  let rowType = mapped ? 'MASTER' : '';

  if (classification.repairType === '중수리' && classification.serviceFactory) {
    partGroup = '서비스팩토리';
    centerName = '팩토리(본사)';
    rowType = 'FACTORY';
  } else if (classification.repairType === '중수리') {
    rowType = 'CENTER';
  }

  if (!rawPart && !classification.serviceFactory) notes.push('파트 누락');
  if (!masterName && !classification.serviceFactory) notes.push('담당자 누락');
  if ((masterName || masterCode) && !mapped && !classification.serviceFactory) notes.push('담당자 매핑 누락');

  const customerLeadDays = calcCustomerLeadDays_(row, index, classification, notes);
  const centerLeadDays = calcCenterLeadDays_(row, index, classification, notes);
  const factoryLeadDays = calcFactoryLeadDays_(row, index, notes);
  const isIncomplete = classification.processStatus === '미완료';
  const isCancel = classification.processStatus === '취소';
  const isWaiting = isIncomplete && receiptStatus === '접수대기';
  const isLongIncomplete = isIncomplete && isLongIncomplete_(receiptDate, targetDate);

  return [
    receiptNo,
    completeFlag,
    receiptStatus,
    status,
    applyType,
    category,
    vin,
    salesPoint,
    rawPart,
    masterCode,
    masterName,
    receiptDate,
    monthText_(receiptDate),
    doneDate,
    monthText_(doneDate),
    cancelDate,
    monthText_(cancelDate),
    centerDate,
    factoryDate,
    classification.processStatus,
    classification.completeType,
    classification.repairType,
    partGroup,
    centerName,
    rowType,
    boolFlag_(isIncomplete),
    boolFlag_(isWaiting),
    boolFlag_(isLongIncomplete),
    boolFlag_(isCancel),
    boolFlag_(classification.repairType === '경수리'),
    boolFlag_(classification.repairType === '중수리'),
    boolFlag_(classification.serviceFactory),
    numberOrBlank_(customerLeadDays),
    numberOrBlank_(centerLeadDays),
    numberOrBlank_(factoryLeadDays),
    boolFlag_(!isCancel),
    notes.join(', ')
  ];
}

function classifyAsRow_(row, index) {
  const completeFlag = getCell_(row, index, '완료구분');
  const receiptStatus = getCell_(row, index, '접수상태');
  const status = getCell_(row, index, '상태구분');
  const cancelDate = getCell_(row, index, '접수취소일자');
  const completeDate = getCell_(row, index, '완료일자');
  const factoryDate = getCell_(row, index, '공장수리완료일자');
  const factoryTime = getCell_(row, index, '공장수리완료시간');

  if (receiptStatus === '접수취소' || status === '접수취소' || cancelDate) {
    return {
      processStatus: '취소',
      completeType: '취소',
      repairType: '경수리',
      serviceFactory: false
    };
  }

  if (status === '공장수리완료(인수)') {
    return {
      processStatus: '완료',
      completeType: '공장완료',
      repairType: '중수리',
      serviceFactory: true
    };
  }

  if (status === '공장입고수리') {
    const done = !!(factoryDate || factoryTime);
    return {
      processStatus: done ? '완료' : '미완료',
      completeType: done ? '공장완료' : '공장입고',
      repairType: '중수리',
      serviceFactory: true
    };
  }

  if (status === '센터수리완료') {
    return {
      processStatus: '완료',
      completeType: '센터완료',
      repairType: '중수리',
      serviceFactory: false
    };
  }

  if (status === '센터입고수리') {
    return {
      processStatus: '미완료',
      completeType: '센터입고',
      repairType: '중수리',
      serviceFactory: false
    };
  }

  if (AS_LIGHT_DONE_STATUSES[status] && (completeDate || status === '카트이동' || status === '카트폐기' || status === 'AS완료')) {
    return {
      processStatus: '완료',
      completeType: status === '전화상담(미출동)' ? '미출동' : '출동',
      repairType: '경수리',
      serviceFactory: false
    };
  }

  if (AS_LIGHT_PENDING_STATUSES[status] || completeFlag === '미완료') {
    return {
      processStatus: '미완료',
      completeType: '미완료',
      repairType: '경수리',
      serviceFactory: false
    };
  }

  return {
    processStatus: completeDate ? '완료' : '미완료',
    completeType: completeDate ? '출동' : '미완료',
    repairType: '경수리',
    serviceFactory: false
  };
}

function getAsDailyWorkReceiptDate_(classification, rawReceiptDate, transferDate, notes) {
  if (classification && classification.repairType === '중수리' && classification.serviceFactory) {
    if (!transferDate) {
      notes.push('팩토리 이관일 누락');
      return '';
    }
    return transferDate;
  }
  return rawReceiptDate;
}

function buildAsMasterLookup_(ss) {
  const sheet = ss.getSheetByName(AS_SHEET_NAMES.MAP);
  if (!sheet) {
    throw new Error('AS_MASTER_MAP 시트를 찾을 수 없습니다.');
  }

  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) {
    throw new Error('AS_MASTER_MAP 데이터가 없습니다.');
  }

  const headers = values[0].map(trimText_);
  const index = buildHeaderIndex_(headers);
  const byCode = {};
  const byName = {};

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const useYn = getCell_(row, index, '사용여부');
    const rowType = getCell_(row, index, 'rowType');
    const code = getCell_(row, index, '담당마스터코드');
    const name = getCell_(row, index, '담당마스터');
    if (!isUseFlag_(useYn) || rowType !== 'MASTER') continue;

    const item = {
      code: code,
      name: name,
      part: getCell_(row, index, '파트'),
      centerName: getCell_(row, index, '센터명'),
      rowType: rowType
    };

    if (code) byCode[code] = item;
    if (name) byName[name] = item;
  }

  return { byCode: byCode, byName: byName };
}

function getAsActiveMapRows_(ss) {
  const sheet = ss.getSheetByName(AS_SHEET_NAMES.MAP);
  if (!sheet) {
    throw new Error('AS_MASTER_MAP 시트를 찾을 수 없습니다.');
  }

  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];

  const headers = values[0].map(trimText_);
  const index = buildHeaderIndex_(headers);
  const rows = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!isUseFlag_(getCell_(row, index, '사용여부'))) continue;

    rows.push({
      displayOrder: toNumberOrBlank_(getCell_(row, index, '표시순서')),
      repairType: getCell_(row, index, '수리구분'),
      part: getCell_(row, index, '파트'),
      centerName: getCell_(row, index, '센터명'),
      masterCode: getCell_(row, index, '담당마스터코드'),
      masterName: getCell_(row, index, '담당마스터'),
      rowType: getCell_(row, index, 'rowType'),
      displayName: getCell_(row, index, '표시명')
    });
  }

  rows.sort(function(a, b) {
    return Number(a.displayOrder || 0) - Number(b.displayOrder || 0);
  });
  return rows;
}

function buildAsSummaryFilterPairs_(mapRows) {
  const byRepair = {};
  mapRows.forEach(function(row) {
    if (!row.repairType) return;
    if (!byRepair[row.repairType]) byRepair[row.repairType] = {};
    if (row.part && row.part !== '전체') byRepair[row.repairType][row.part] = true;
  });

  const pairs = [];
  Object.keys(byRepair).sort().forEach(function(repairType) {
    pairs.push({ repairType: repairType, part: '전체' });
    Object.keys(byRepair[repairType]).sort(function(a, b) {
      if (a === '서비스팩토리') return 1;
      if (b === '서비스팩토리') return -1;
      return a.localeCompare(b, 'ko');
    }).forEach(function(part) {
      pairs.push({ repairType: repairType, part: part });
    });
  });
  return pairs;
}

function shouldIncludeMapRowForFilter_(mapRow, pair) {
  if (mapRow.repairType !== pair.repairType) return false;
  if (pair.part === '전체') return true;
  if (mapRow.rowType === 'TOTAL') return false;
  return mapRow.part === pair.part;
}

function mapWorkRowToObject_(row, index) {
  return {
    receiptNo: getCell_(row, index, '접수번호'),
    receiptDate: getCell_(row, index, '접수일'),
    doneDate: getCell_(row, index, '완료일'),
    cancelDate: getCell_(row, index, '취소일'),
    centerDate: getCell_(row, index, '센터수리일'),
    factoryDate: getCell_(row, index, '공장완료일'),
    processStatus: getCell_(row, index, '처리상태'),
    completeType: getCell_(row, index, '완료유형'),
    repairType: getCell_(row, index, '수리구분'),
    partGroup: getCell_(row, index, '파트그룹'),
    centerName: getCell_(row, index, '센터명'),
    rowType: getCell_(row, index, 'rowType'),
    masterCode: getCell_(row, index, '담당마스터코드'),
    masterName: getCell_(row, index, '담당마스터'),
    incomplete: getCell_(row, index, '미완료여부') === '1',
    waiting: getCell_(row, index, '접수대기여부') === '1',
    longIncomplete: getCell_(row, index, '장기미완료여부') === '1',
    canceled: getCell_(row, index, '취소여부') === '1',
    serviceFactory: getCell_(row, index, '서비스팩토리대상여부') === '1',
    customerLeadDays: toNumberOrBlank_(getCell_(row, index, '리드타임고객일수')),
    centerLeadDays: toNumberOrBlank_(getCell_(row, index, '리드타임센터일수')),
    factoryLeadDays: toNumberOrBlank_(getCell_(row, index, '리드타임공장일수')),
    validationMemo: getCell_(row, index, '검증메모')
  };
}

function matchesSummaryRow_(item, mapRow, pair) {
  if (item.repairType !== pair.repairType) return false;
  if (pair.part !== '전체' && item.partGroup !== pair.part) return false;

  if (mapRow.rowType === 'TOTAL') {
    return true;
  }
  if (mapRow.rowType === 'PART') {
    return item.partGroup === mapRow.part;
  }
  if (mapRow.rowType === 'CENTER') {
    return item.partGroup === mapRow.part && item.centerName === mapRow.centerName;
  }
  if (mapRow.rowType === 'FACTORY') {
    return item.partGroup === '서비스팩토리' && item.centerName === mapRow.centerName;
  }
  if (mapRow.rowType === 'MASTER') {
    if (mapRow.masterCode && item.masterCode === mapRow.masterCode) return true;
    return !!(mapRow.masterName && item.masterName === mapRow.masterName);
  }
  return false;
}

function calculateSummaryMetrics_(items, targetDateText, monthStartText, targetDate) {
  let receiptDaily = 0;
  let receiptMonthly = 0;
  let completeDaily = 0;
  let completeMonthly = 0;
  let noVisitDaily = 0;
  let noVisitMonthly = 0;
  let visitDaily = 0;
  let visitMonthly = 0;
  let incompleteTotal = 0;
  let waiting = 0;
  let longIncomplete = 0;
  let cancelDaily = 0;
  let cancelMonthly = 0;
  let carryoverMonthly = 0;
  const leadValues = [];
  let validationCount = 0;

  items.forEach(function(item) {
    if (isSameDate_(item.receiptDate, targetDateText)) receiptDaily++;
    if (isDateInRange_(item.receiptDate, monthStartText, targetDateText)) receiptMonthly++;

    const completeDate = getCompleteDateForSummary_(item);
    if (item.processStatus === '완료') {
      if (isSameDate_(completeDate, targetDateText)) completeDaily++;
      if (isDateInRange_(completeDate, monthStartText, targetDateText)) {
        completeMonthly++;
        if (isDateBefore_(item.receiptDate, monthStartText)) carryoverMonthly++;
        const lead = getLeadDaysForSummary_(item);
        if (lead !== '') leadValues.push(Number(lead));
      }

      if (item.completeType === '미출동') {
        if (isSameDate_(completeDate, targetDateText)) noVisitDaily++;
        if (isDateInRange_(completeDate, monthStartText, targetDateText)) noVisitMonthly++;
      } else if (item.completeType === '출동') {
        if (isSameDate_(completeDate, targetDateText)) visitDaily++;
        if (isDateInRange_(completeDate, monthStartText, targetDateText)) visitMonthly++;
      }
    }

    if (isIncompleteAsOfTarget_(item, targetDateText)) {
      incompleteTotal++;
      if (item.waiting) waiting++;
      if (isLongIncompleteByTarget_(item.receiptDate, targetDate)) longIncomplete++;
    }

    if (isSameDate_(item.cancelDate, targetDateText)) cancelDaily++;
    if (isDateInRange_(item.cancelDate, monthStartText, targetDateText)) cancelMonthly++;
    if (item.validationMemo) validationCount++;
  });

  const incomplete = Math.max(incompleteTotal - waiting, 0);
  const leadAverage = leadValues.length > 0 ? roundNumber_(average_(leadValues), 1) : '';

  return {
    receiptDaily: receiptDaily,
    receiptMonthly: receiptMonthly,
    completeDaily: completeDaily,
    completeMonthly: completeMonthly,
    noVisitDaily: noVisitDaily,
    noVisitMonthly: noVisitMonthly,
    visitDaily: visitDaily,
    visitMonthly: visitMonthly,
    incompleteTotal: incompleteTotal,
    waiting: waiting,
    incomplete: incomplete,
    longIncomplete: longIncomplete,
    leadAverage: leadAverage,
    cancelDaily: cancelDaily,
    cancelMonthly: cancelMonthly,
    cancelDisplay: cancelDaily || cancelMonthly ? cancelDaily + '/' + cancelMonthly : '-',
    validationText: validationCount ? '검증 ' + validationCount + '건' : '',
    carryoverMonthly: carryoverMonthly
  };
}

function getCompleteDateForSummary_(item) {
  if (item.completeType === '센터완료') return item.centerDate;
  if (item.completeType === '공장완료') return item.factoryDate;
  return item.doneDate;
}

function getLeadDaysForSummary_(item) {
  if (item.repairType === '중수리') {
    return item.serviceFactory ? item.factoryLeadDays : item.centerLeadDays;
  }
  return item.customerLeadDays;
}

function normalizeMaster_(code, name, masterLookup) {
  const rawName = trimText_(name);
  const rawCode = trimText_(code);
  if (rawName === '김성휘') {
    const kimMinGyu = masterLookup.byName['김민규'];
    return {
      code: kimMinGyu ? kimMinGyu.code : rawCode,
      name: '김민규'
    };
  }
  return { code: rawCode, name: rawName };
}

function calcCustomerLeadDays_(row, index, classification, notes) {
  if (!classification || classification.repairType !== '경수리') return '';
  if (classification.processStatus !== '완료') return '';

  const receiptAt = parseDateTime_(getCell_(row, index, '접수일자'), getCell_(row, index, '접수시간'));
  const doneAt = parseDateTime_(getCell_(row, index, '완료일자'), getCell_(row, index, '완료시간'));
  if (!receiptAt || !doneAt) {
    notes.push('경수리 리드타임 계산 제외');
    return '';
  }

  const diff = (doneAt.getTime() - receiptAt.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 ? diff : '';
}

function calcCenterLeadDays_(row, index, classification, notes) {
  if (!classification || classification.repairType !== '중수리' || classification.serviceFactory) return '';
  if (classification.completeType !== '센터완료') return '';

  const receiptAt = parseDateTime_(getCell_(row, index, '접수일자'), getCell_(row, index, '접수시간'));
  const centerDoneAt = parseDateTime_(getCell_(row, index, '센터수리일자'), getCell_(row, index, '센터수리시간'));
  if (!receiptAt || !centerDoneAt) {
    notes.push('센터 리드타임 계산 제외');
    return '';
  }

  const diff = (centerDoneAt.getTime() - receiptAt.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 ? diff : '';
}

function calcFactoryLeadDays_(row, index, notes) {
  const transferAt = parseDateTime_(getCell_(row, index, '이관일자'), getCell_(row, index, '이관시간'));
  const factoryDoneAt = parseDateTime_(getCell_(row, index, '공장수리완료일자'), getCell_(row, index, '공장수리완료시간'));
  const status = getCell_(row, index, '상태구분');

  if (status !== '공장입고수리' && status !== '공장수리완료(인수)') return '';
  if (!transferAt || !factoryDoneAt) {
    notes.push('공장 리드타임 계산 제외');
    return '';
  }

  const diff = (factoryDoneAt.getTime() - transferAt.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 ? diff : '';
}

function parseDateTime_(dateText, timeText) {
  const date = normalizeDateText_(dateText);
  if (!date) return null;

  const time = normalizeTimeText_(timeText) || '00:00:00';
  const parsed = new Date(date + 'T' + time + '+09:00');
  return isNaN(parsed.getTime()) ? null : parsed;
}

function parseDateOnly_(dateText) {
  const date = normalizeDateText_(dateText);
  if (!date) return null;
  const parsed = new Date(date + 'T00:00:00+09:00');
  return isNaN(parsed.getTime()) ? null : parsed;
}

function todayKstDate_() {
  return parseDateOnly_(Utilities.formatDate(new Date(), 'GMT+9', 'yyyy-MM-dd'));
}

function inferTargetDateFromRaw_(rawValues, rawIndex) {
  let latest = null;

  for (let i = 1; i < rawValues.length; i++) {
    const row = rawValues[i];
    const status = getCell_(row, rawIndex, '상태구분');
    const dateText = (status === '공장입고수리' || status === '공장수리완료(인수)')
      ? getCell_(row, rawIndex, '이관일자')
      : getCell_(row, rawIndex, '접수일자');
    const date = parseDateOnly_(dateText);
    if (date && (!latest || date.getTime() > latest.getTime())) latest = date;
  }
  return latest;
}

function inferTargetDateFromWork_(workValues, workIndex) {
  let latest = null;

  for (let i = 1; i < workValues.length; i++) {
    const date = parseDateOnly_(getCell_(workValues[i], workIndex, '접수일'));
    if (date && (!latest || date.getTime() > latest.getTime())) latest = date;
  }
  return latest;
}

function inferTargetDatesFromWork_(workValues, workIndex) {
  const dateMap = {};
  const dateHeaders = ['접수일', '완료일', '취소일', '센터수리일', '공장완료일'];

  for (let i = 1; i < workValues.length; i++) {
    dateHeaders.forEach(function(headerName) {
      const text = normalizeDateText_(getCell_(workValues[i], workIndex, headerName));
      if (text) dateMap[text] = true;
    });
  }

  return Object.keys(dateMap).sort().map(function(dateText) {
    return parseDateOnly_(dateText);
  }).filter(function(date) {
    return !!date;
  });
}

function formatDateText_(date) {
  return Utilities.formatDate(date, 'GMT+9', 'yyyy-MM-dd');
}

function normalizeDateText_(value) {
  const text = trimText_(value);
  if (!text) return '';
  const match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (!match) return '';
  return match[1] + '-' + pad2_(match[2]) + '-' + pad2_(match[3]);
}

function normalizeTimeText_(value) {
  const text = trimText_(value);
  if (!text) return '';
  const match = text.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  if (!match) return '';
  return pad2_(match[1]) + ':' + pad2_(match[2]) + ':' + pad2_(match[3] || '0');
}

function isLongIncomplete_(receiptDateText, targetDate) {
  const receiptDate = parseDateOnly_(receiptDateText);
  if (!receiptDate || !targetDate) return false;
  const diff = Math.floor((targetDate.getTime() - receiptDate.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 30;
}

function monthText_(dateText) {
  const text = normalizeDateText_(dateText);
  return text ? text.substring(0, 7) : '';
}

function isSameDate_(dateText, targetDateText) {
  return normalizeDateText_(dateText) === targetDateText;
}

function isDateInRange_(dateText, startDateText, endDateText) {
  const text = normalizeDateText_(dateText);
  return !!(text && text >= startDateText && text <= endDateText);
}

function isDateBefore_(dateText, boundaryDateText) {
  const text = normalizeDateText_(dateText);
  return !!(text && text < boundaryDateText);
}

function isDateOnOrBefore_(dateText, targetDateText) {
  const text = normalizeDateText_(dateText);
  return !!(text && text <= targetDateText);
}

function isIncompleteAsOfTarget_(item, targetDateText) {
  if (!isDateOnOrBefore_(item.receiptDate, targetDateText)) return false;
  if (isDateOnOrBefore_(item.cancelDate, targetDateText)) return false;

  const completeDate = getCompleteDateForSummary_(item);
  if (isDateOnOrBefore_(completeDate, targetDateText)) return false;

  return true;
}

function isLongIncompleteByTarget_(receiptDateText, targetDate) {
  const receiptDate = parseDateOnly_(receiptDateText);
  if (!receiptDate || !targetDate) return false;
  const diff = Math.floor((targetDate.getTime() - receiptDate.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 30;
}

function average_(values) {
  if (!values || values.length === 0) return '';
  const sum = values.reduce(function(total, value) {
    return total + Number(value || 0);
  }, 0);
  return sum / values.length;
}

function roundNumber_(value, digits) {
  const factor = Math.pow(10, digits || 0);
  return Math.round(Number(value || 0) * factor) / factor;
}

function clearSheetBody_(sheet, colCount) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  sheet.getRange(2, 1, lastRow - 1, colCount).clearContent();
}

function buildHeaderIndex_(headers) {
  const index = {};
  headers.forEach(function(header, i) {
    index[trimText_(header)] = i;
  });
  return index;
}

function getCell_(row, index, header) {
  const col = index[header];
  if (col === undefined) return '';
  return trimText_(row[col]);
}

function isUseFlag_(value) {
  const text = trimText_(value).toUpperCase();
  return text === 'O' || text === 'Y' || text === 'TRUE' || text === '사용';
}

function boolFlag_(value) {
  return value ? 1 : 0;
}

function toNumberOrBlank_(value) {
  const text = trimText_(value);
  if (!text) return '';
  const number = Number(text);
  return isNaN(number) ? '' : number;
}

function numberOrBlank_(value) {
  return value === '' || value === null || value === undefined || isNaN(Number(value)) ? '' : Number(value);
}

function trimText_(value) {
  return String(value || '').trim();
}

function pad2_(value) {
  return ('0' + String(value || '0')).slice(-2);
}
