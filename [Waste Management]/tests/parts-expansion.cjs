const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
// 단가는 운영값 대신 가상값을 사용합니다.
const fixture = require('./parts-fixture.json');
const added = ['모터엔코더', 'HY파이프브라켓', 'HYDC리어허브-28π', 'SWITCH ASSY LH'];
const canonical = n => ({
  '메인PCB(진우/캐리어)': '메인 PCB(진우/캐리어)',
  '디스플레이PCB(진우/캐리어)': '디스플레이 PCB(진우/캐리어)'
}[n] || n);

class Sheet {
  constructor(rows) { this.rows = structuredClone(rows); this.writes = 0; }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return Math.max(1, ...this.rows.map(r => r.length)); }
  getDataRange() { return this.getRange(1, 1, this.getLastRow(), this.getLastColumn()); }
  getRange(row, col, height = 1, width = 1) {
    const read = formulas => Array.from({ length: height }, (_, i) =>
      Array.from({ length: width }, (_, j) => {
        const v = this.rows[row - 1 + i]?.[col - 1 + j] ?? '';
        const isFormula = typeof v === 'string' && v.startsWith('=');
        return formulas ? (isFormula ? v : '') : (isFormula ? 123 : v);
      }));
    const write = values => {
      this.writes++;
      values.forEach((r, i) => r.forEach((v, j) => {
        this.rows[row - 1 + i] ||= [];
        this.rows[row - 1 + i][col - 1 + j] = v;
      }));
    };
    return {
      getValues: () => read(false), getFormulas: () => read(true),
      setValues: write, setValue: v => write([[v]]), setFormula: v => write([[v]])
    };
  }
}

function setup(headers = fixture.headers.map(canonical).concat(added)) {
  const sheets = {
    '2. 부품명': new Sheet(fixture.master),
    '3. 사용자 정보': new Sheet([['사원번호', '성명'], ['TEST', '검증용 사용자']]),
    '1. 데이터(탈거)': new Sheet([[], [], headers]),
    '5. 재사용품 이관': new Sheet([[], []]),
    '6. 월 목표': new Sheet([[], []])
  };
  const ctx = vm.createContext({
    SpreadsheetApp: { openById: () => ({ getSheetByName: n => sheets[n] }) },
    Utilities: { formatDate: () => '2026-11-20' }
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'code.gs'), 'utf8'), ctx);
  return { ctx, sheets, raw: sheets['1. 데이터(탈거)'] };
}

const { ctx, sheets, raw } = setup();
const parts = ctx.getPartsList();
assert.equal(parts.length, 63);
assert.equal(new Set(parts.map(p => p.name)).size, 63);
const columns = ctx.getWastePartColumnMap_(raw.rows[2]);
assert.equal(Object.keys(columns).length, 63);
assert(parts.every(p => columns[p.name] !== undefined));
added.forEach((name, i) => assert.equal(columns[name], 64 + i));

const payload = added.map(name => ({ name, qty: 1 }));
payload.push({ name: '메인PCB(진우/캐리어)', qty: 2 });
assert.equal(ctx.submitRecord('TEST-VIN', 'TEST', payload).success, true);
const saved = raw.rows[3];
assert.equal(saved[2], 'TEST-VIN');
assert.equal(saved[12], 2);
added.forEach((_, i) => assert.equal(saved[64 + i], 1));
const existing = ctx.checkDuplicateVin('TEST-VIN');
assert.equal(existing.existingParts['모터엔코더'], 1);
assert.equal(existing.existingParts['메인 PCB(진우/캐리어)'], 2);

raw.rows[3][0] = '=VLOOKUP(C4,lookup,2,0)';
raw.rows[3][1] = '=VLOOKUP(C4,lookup,8,0)';
assert.equal(ctx.updateRecord(4, 'TEST-VIN', 'TEST', [{ name: added[0], qty: 0 }, { name: 'SK배터리', qty: 1 }]).success, true);
assert.equal(raw.rows[3][0], '=VLOOKUP(C4,lookup,2,0)');
assert.equal(raw.rows[3][1], '=VLOOKUP(C4,lookup,8,0)');
assert.equal(raw.rows[3][5], 1);
assert.equal(raw.rows[3][64], 0);
assert.equal(raw.rows[3][65], '');
const snapshot = JSON.stringify(raw.rows);
assert.throws(() => ctx.updateRecord(4, 'TEST-VIN', 'TEST', [{ name: '열 없는 부품', qty: 1 }]), /저장 열/);
assert.equal(JSON.stringify(raw.rows), snapshot);
assert.throws(() => ctx.submitRecord('BAD', 'TEST', [{ name: added[0], qty: -1 }]), /정수/);
assert.throws(() => ctx.submitRecord('BAD', 'TEST', [payload[0], payload[0]]), /중복/);
assert.equal(JSON.stringify(raw.rows), snapshot);

const old = setup(fixture.headers);
assert.throws(() => old.ctx.submitRecord('BAD', 'TEST', payload), /저장 열/);
assert.equal(old.raw.writes, 0);
assert.throws(() => ctx.getWastePartColumnMap_(fixture.headers.concat(['메인 PCB(진우/캐리어)'])), /중복/);

const common = parts.filter(p => added.includes(p.name)).map(p => ({ ...p, qty: 1 }));
assert.equal(ctx.submitTransfer('2026-11-20', 'QC 검수 완료', common).success, true);
assert.equal(sheets['5. 재사용품 이관'].rows.length, 6);
ctx.submitGoal('2026', '11', null, common);
assert.equal(ctx.getGoalData('2026', '11').length, 4);
assert.equal(ctx.saveResultData('2026', '11', common).success, true);
assert.equal(sheets['6. 월 목표'].rows.length, 6);
assert.equal(ctx.getResultData('2026', '11').length, 4);
assert.equal(ctx.getGoalStatusData('2026', '11').length, 4);
common.forEach((p, i) => assert.equal(sheets['6. 월 목표'].rows[i + 2][7], 1));
const legacyGoal = sheets['6. 월 목표'];
legacyGoal.rows.push(['2026', '11', 'H2.0/H2.5', '메인PCB(진우/캐리어)', 3]);
const countBefore = legacyGoal.rows.length;
ctx.saveResultData('2026', '11', [{ name: '메인 PCB(진우/캐리어)', qty: 2 }]);
assert.equal(legacyGoal.rows.length, countBefore);
assert.equal(legacyGoal.rows.at(-1)[7], 2);
assert(ctx.getResultData('2026', '11').some(p => p.name === '메인 PCB(진우/캐리어)'));

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
console.log('PASS: all 63 parts mapped; BM-BP round trip; missing/duplicate columns and invalid quantities blocked before writes; A/B formulas preserved; shared transfer/goal/result/status; legacy names; UI syntax');
