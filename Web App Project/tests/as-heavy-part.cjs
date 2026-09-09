const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const dataSource = fs.readFileSync(path.join(root, 'plan/AS_DAILY_STATS_DATA_SHEET_Code.gs'), 'utf8');
const webSource = fs.readFileSync(path.join(root, 'src/Code.gs'), 'utf8');
const clientSource = fs.readFileSync(path.join(root, 'src/JavaScript.html'), 'utf8').replace(/^<script>/, '').replace(/<\/script>\s*$/, '');
new vm.Script(clientSource);
class Sheet {
  constructor(rows) { this.rows = rows; }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return this.rows[0].length; }
  getDataRange() { return this.getRange(1, 1, this.getLastRow(), this.getLastColumn()); }
  getRange(row, col, height, width) {
    return {
      getDisplayValues: () => Array.from({length: height}, (_, r) => Array.from({length: width}, (_, c) => String(this.rows[row - 1 + r]?.[col - 1 + c] ?? ''))),
      setValues: values => values.forEach((cells, r) => { this.rows[row - 1 + r] ||= []; cells.forEach((value, c) => { this.rows[row - 1 + r][col - 1 + c] = value; }); }),
      clearContent: () => { this.rows.splice(row - 1); }
    };
  }
}
const sheets = {};
const spreadsheet = { getSheetByName: name => sheets[name] };
const context = {
  SpreadsheetApp: { getActiveSpreadsheet: () => spreadsheet, openById: () => spreadsheet },
  Utilities: { formatDate: date => new Date(date.getTime() + 9 * 3600000).toISOString().slice(0, 10) }
};
const data = vm.createContext({...context});
vm.runInContext(dataSource, data);
const headers = vm.runInContext('AS_HEADERS', data);
const oldMap = [
  ['전체', '', 'TOTAL', '전체(중수리)'], ['서비스팩토리', '팩토리(본사)', 'FACTORY', '팩토리(본사)'],
  ['서비스1', '하남센터', 'CENTER', '서비스1(하남)'], ['서비스2', '계양센터', 'CENTER', '서비스2(계양)'],
  ['서비스3', '부산센터', 'CENTER', '서비스3(부산)'], ['서비스4', '호남센터', 'CENTER', '서비스4(호남)']
].map(([part, center, type, name], i) => [100 + i, 'O', '중수리', part, center, '', '', type, name, '']);
oldMap.push([1, 'O', '경수리', '서비스4', '', '', '', 'PART', '서비스4', '']);
sheets.AS_MASTER_MAP = new Sheet([headers.MAP, ...oldMap]);
let serial = 0;
const work = [];
function add(part, center, options = {}) {
  const entry = { '접수번호': 'TEST-' + ++serial, '수리구분': '중수리', '파트그룹': part, '센터명': center, '접수일': '2026-09-01', '처리상태': '미완료', 'rowType': 'CENTER', ...options };
  work.push(headers.WORK.map(name => entry[name] ?? ''));
}
for (const [center, count] of [['호남센터', 2], ['충청센터', 3], ['제주센터', 2]]) for (let i = 0; i < count; i++) add('서비스4', center);
for (const [center, lead, receipt] of [['호남센터', 1, '2026-09-01'], ['충청센터', 3, '2026-09-01'], ['제주센터', 8, '2026-08-30'], ['제주센터', 8, '2026-08-30']]) {
  add('서비스4', center, {'처리상태':'완료','완료유형':'센터완료','센터수리일':'2026-09-08','접수일':receipt,'리드타임센터일수':lead});
}
add('서비스3','대구센터',{'접수일':'2026-08-01'});
add('서비스3','부산센터');
add('서비스3','경남센터',{'접수대기여부':'1'});
add('서비스3','');
add('서비스3','추가센터');
add('서비스1','하남센터');
add('서비스2','계양센터');
add('서비스팩토리','팩토리(본사)',{'서비스팩토리대상여부':'1','rowType':'FACTORY'});
add('서비스4','호남센터',{'수리구분':'경수리','접수대기여부':'1'});
add('서비스4','호남센터',{'취소일':'2026-09-07'});
add('서비스4','제주센터',{'접수일':'2026-09-10'});
sheets.AS_DAILY_WORK = new Sheet([headers.WORK, ...work]);
sheets.AS_DAILY_SUMMARY = new Sheet([headers.SUMMARY]);
assert(data.refreshAsDailySummary_('2026-09-08').success);
const count = sheets.AS_DAILY_SUMMARY.getLastRow();
assert(data.refreshAsDailySummary_('2026-09-08').success);
assert.equal(sheets.AS_DAILY_SUMMARY.getLastRow(), count);
const web = vm.createContext({...context});
vm.runInContext(webSource, web);
web.requireSession_ = () => ({success:true, session:{permissions:[]}});
web.hasStatsPermission_ = () => true;
web.createAsDailyCacheKey_ = () => 'test';
web.getAsDailyCache_ = () => null;
web.putAsDailyCache_ = () => {};
const responses = {};
const popupResponses = {};
for (const part of ['전체','서비스1','서비스2','서비스3','서비스4','서비스팩토리']) {
  const response = web.getAsDailyStats('test','2026-09-08',part,'중수리');
  assert(response.success, response.message);
  responses[part] = response;
  popupResponses[part] = {};
  for (const [type, field] of [['receiptDaily','receiptDaily'],['completeDaily','completeDaily'],['incomplete','incompleteTotal'],['longIncomplete','longIncomplete'],['receiptMonthly','receiptMonthly'],['completeMonthly','completeMonthly'],['carryoverMonthly','carryoverMonthly']]) {
    const detail = web.getAsDailyStatsDetail('test','2026-09-08',part,'중수리',type,null);
    assert(detail.success, detail.message);
    assert.equal(detail.count, response.summary[field], part + ':' + type);
    popupResponses[part][type] = detail;
  }
  const children = response.rows.filter(r => r.rowType === 'CENTER');
  if (part !== '전체' && children.length) {
    for (const field of ['receiptDaily','receiptMonthly','completeDaily','completeMonthly','incompleteTotal','longIncomplete','carryoverMonthly']) assert.equal(children.reduce((n,r)=>n+r[field],0), response.summary[field], part+':'+field);
  }
}
assert.equal(responses['서비스4'].summary.displayName,'서비스4');
assert.equal(responses['서비스4'].summary.incompleteTotal,7);
assert.equal(responses['서비스4'].summary.leadAverage,5);
assert.equal(responses['서비스4'].summary.carryoverMonthly,2);
assert.equal(responses['서비스4'].rows.filter(r=>r.rowType==='PART').length,1);
assert.equal(responses['서비스3'].rows.find(r=>r.centerName===''&&r.rowType==='CENTER').displayName,'센터 미지정');
const exported=[];
web.writeAsDailyExcelMetricRow_ = (sheet,rowNo,a,b,row) => {exported.push(row);return rowNo+1;};
web.appendAsDailyHeavyExcelRows_({},responses['전체'].rows.concat(responses['전체'].summary),6);
assert.equal(exported.length,6);
assert(!exported.some(r=>r.rowType==='CENTER'));
exported.length=0;
web.appendAsDailyFilteredExcelRows_({},responses['서비스4'].rows,6,true);
assert.equal(exported.length,1);
assert.equal(exported[0].incompleteTotal,7);
assert.throws(()=>web.assertAsDailyHeavyPartRows_([{repairTypeFilter:'중수리',rowType:'CENTER',part:'서비스4'}]),/갱신/);
assert.equal(headers.MAP.length,10);
assert.equal(headers.WORK.length,37);
assert.equal(headers.SUMMARY.length,30);
assert.equal(headers.SUMMARY[29],'전월이월');
const items = work.map(row=>data.mapWorkRowToObject_(row,data.buildHeaderIndex_(headers.WORK)));
const light = data.calculateSummaryMetrics_(items.filter(x=>x.repairType==='경수리'),'2026-09-08','2026-09-01',data.parseDateOnly_('2026-09-08'));
assert.equal(light.receiptMonthly,1);
assert.equal(light.incompleteTotal,1);
assert.equal(light.waiting,1);
assert.equal(light.incomplete,0);
assert(data.refreshAsDailySummary_('2026-08-31').success);
const historical=web.getAsDailyStats('test','2026-08-31','서비스4','중수리');
assert(historical.success,historical.message);
assert.equal(historical.summary.incompleteTotal,2);
assert.equal(historical.summary.completeMonthly,0);
assert.equal(web.getAsDailyStatsDetail('test','2026-08-31','서비스4','중수리','incomplete',null).count,2);
assert(data.refreshAsDailySummary_().success);
assert.equal(web.getAsDailyStats('test','2026-09-08','서비스4','중수리').summary.incompleteTotal,7);
const output = path.join(root,'outputs/heavy-part-review');
fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'responses.json'),JSON.stringify(responses,null,2));
fs.writeFileSync(path.join(output,'popup-responses.json'),JSON.stringify(popupResponses,null,2));
work.length=0;
for(const kind of ['light','center','factory']) {
  const isFactory=kind==='factory';
  const part=isFactory?'서비스팩토리':'서비스4';
  const center=isFactory?'팩토리(본사)':'호남센터';
  for(const [receipt,done,status] of [
    ['2026-07-15','2026-09-01','완료'],['2026-08-31','2026-09-08','완료'],
    ['2026-09-01','2026-09-08','완료'],['2026-09-08','2026-09-09','완료'],
    ['2026-09-09','','미완료'],['','2026-09-08','완료'],
    ['2026-09-02','','취소'],['2026-09-03','2026-09-03','미완료']
  ]) add(part,center,{'수리구분':kind==='light'?'경수리':'중수리','접수일':receipt,'처리상태':status,
    '완료유형':kind==='light'?'출동':isFactory?'공장완료':'센터완료',
    '완료일':kind==='light'?done:'2025-01-01','센터수리일':kind==='center'?done:'',
    '공장완료일':isFactory?done:'','취소일':status==='취소'?'2026-09-03':'',
    '서비스팩토리대상여부':isFactory?'1':'0'});
}
sheets.AS_DAILY_WORK=new Sheet([headers.WORK,...work]);
assert(data.refreshAsDailySummary_('2026-09-08').success);
for(const [part,repair] of [['서비스4','경수리'],['서비스4','중수리'],['서비스팩토리','중수리']]) {
  const result=web.getAsDailyStats('test','2026-09-08',part,repair);
  assert(result.success,result.message);
  for(const [type,expected] of [['receiptMonthly',4],['completeMonthly',4],['carryoverMonthly',2]]) {
    const detail=web.getAsDailyStatsDetail('test','2026-09-08',part,repair,type,null);
    assert.equal(result.summary[type],expected,part+repair+type);
    assert.equal(detail.count,expected);
    assert.equal(detail.items.length,expected);
    assert(detail.items.every(x=>x.showTraceInfo));
    if(type==='carryoverMonthly')assert(detail.items.every(x=>x.receiptDate<'2026-09-01'&&x.extraLabel==='완료일'));
  }
}
for(let i=0;i<505;i++)add('서비스팩토리','팩토리(본사)',{'서비스팩토리대상여부':'1'});
sheets.AS_DAILY_WORK=new Sheet([headers.WORK,...work]);
assert(data.refreshAsDailySummary_('2026-09-08').success);
const large=web.getAsDailyStatsDetail('test','2026-09-08','서비스팩토리','중수리','receiptMonthly',null);
assert.equal(large.count,509);
assert.equal(large.count,web.getAsDailyStats('test','2026-09-08','서비스팩토리','중수리').summary.receiptMonthly);
assert.equal(large.items.length,500);
assert.equal(large.limited,true);
fs.writeFileSync(path.join(output,'large-popup.json'),JSON.stringify(large,null,2));
console.log('PASS: 6 filters x 7 counts, light/center/factory monthly boundaries, carryover, missing date, cancellation, historical refresh, Excel part-only, 509 total / 500 displayed');
