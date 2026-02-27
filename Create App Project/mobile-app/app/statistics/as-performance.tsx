import React, { useState } from 'react';
import {
    View, ScrollView, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Alert, Modal, Platform,
} from 'react-native';
import { Button } from 'react-native-paper';
import { Header } from '@/components/Header';
import { AppColors } from '@/constants/Colors';
import { getAsPerformance } from '@/services/api';

// ── 타입 ──
type RepairType = '경수리' | '중수리';

const PART_OPTIONS_LIGHT: string[] = ['전체', '서비스1', '서비스2', '서비스3', '서비스4'];
const PART_OPTIONS_HEAVY: string[] = ['전체', '서비스1', '서비스2', '서비스3', '서비스4', '팩토리'];

// ── 날짜 유틸 ──
function formatKoreanDate(d: Date) {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    return `${y}년 ${m}월 ${day}일 (${dow})`;
}
function toApiDate(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}

// ── 달력 컴포넌트 ──
function CalendarPicker({ selected, onSelect, onClose }: { selected: Date; onSelect: (d: Date) => void; onClose: () => void }) {
    const [viewYear, setViewYear] = useState(selected.getFullYear());
    const [viewMonth, setViewMonth] = useState(selected.getMonth());

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const weeks: (number | null)[][] = [];
    let week: (number | null)[] = Array(firstDay).fill(null);

    for (let d = 1; d <= daysInMonth; d++) {
        week.push(d);
        if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }

    const prevMonth = () => {
        if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
        else setViewMonth(viewMonth - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
        else setViewMonth(viewMonth + 1);
    };

    const isSelected = (day: number) =>
        day === selected.getDate() && viewMonth === selected.getMonth() && viewYear === selected.getFullYear();
    const isToday = (day: number) => {
        const t = new Date();
        return day === t.getDate() && viewMonth === t.getMonth() && viewYear === t.getFullYear();
    };

    return (
        <View style={cal.container}>
            <View style={cal.header}>
                <TouchableOpacity onPress={prevMonth}><Text style={cal.navBtn}>◀</Text></TouchableOpacity>
                <Text style={cal.title}>{viewYear}년 {viewMonth + 1}월</Text>
                <TouchableOpacity onPress={nextMonth}><Text style={cal.navBtn}>▶</Text></TouchableOpacity>
            </View>
            <View style={cal.dayNames}>
                {['일', '월', '화', '수', '목', '금', '토'].map((n, i) => (
                    <Text key={i} style={[cal.dayName, i === 0 && { color: '#D32F2F' }, i === 6 && { color: '#1565C0' }]}>{n}</Text>
                ))}
            </View>
            {weeks.map((w, wi) => (
                <View key={wi} style={cal.weekRow}>
                    {w.map((day, di) => (
                        <TouchableOpacity
                            key={di}
                            style={[cal.dayCell, day && isSelected(day) && cal.selectedDay]}
                            onPress={() => day && onSelect(new Date(viewYear, viewMonth, day))}
                            disabled={!day}
                        >
                            <Text style={[
                                cal.dayText,
                                di === 0 && { color: '#D32F2F' },
                                di === 6 && { color: '#1565C0' },
                                day && isToday(day) && cal.todayText,
                                day && isSelected(day) && cal.selectedText,
                            ]}>
                                {day || ''}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            ))}
            <TouchableOpacity style={cal.closeBtn} onPress={onClose}>
                <Text style={cal.closeBtnText}>확인</Text>
            </TouchableOpacity>
        </View>
    );
}

const cal = StyleSheet.create({
    container: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginHorizontal: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    navBtn: { fontSize: 18, color: '#1565C0', padding: 8 },
    title: { fontSize: 17, fontWeight: '700', color: '#333' },
    dayNames: { flexDirection: 'row', marginBottom: 4 },
    dayName: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#666', paddingVertical: 4 },
    weekRow: { flexDirection: 'row' },
    dayCell: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 20 },
    dayText: { fontSize: 14, color: '#333' },
    todayText: { fontWeight: '800', textDecorationLine: 'underline' },
    selectedDay: { backgroundColor: '#1565C0' },
    selectedText: { color: '#FFF', fontWeight: '700' },
    closeBtn: { backgroundColor: '#1565C0', borderRadius: 8, paddingVertical: 12, marginTop: 12, alignItems: 'center' },
    closeBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

// ── 드롭다운 선택 ──
function DropdownSelector({ label, value, options, onSelect }: { label: string; value: string; options: string[]; onSelect: (v: string) => void }) {
    const [open, setOpen] = useState(false);
    return (
        <View style={dd.wrapper}>
            <Text style={dd.label}>{label}</Text>
            <TouchableOpacity style={dd.select} onPress={() => setOpen(!open)}>
                <Text style={dd.selectText}>{value}</Text>
                <Text style={dd.arrow}>▼</Text>
            </TouchableOpacity>
            {open && (
                <View style={dd.dropdown}>
                    {options.map((opt, i) => (
                        <TouchableOpacity key={i} style={[dd.option, opt === value && dd.optionActive]} onPress={() => { onSelect(opt); setOpen(false); }}>
                            <Text style={[dd.optionText, opt === value && dd.optionTextActive]}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
}

const dd = StyleSheet.create({
    wrapper: { flex: 1 },
    label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
    select: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#E0E0E0' },
    selectText: { fontSize: 14, fontWeight: '600', color: '#333' },
    arrow: { fontSize: 10, color: '#999' },
    dropdown: { position: 'absolute', top: 68, left: 0, right: 0, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', zIndex: 100, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
    option: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EEE' },
    optionActive: { backgroundColor: '#E3F2FD' },
    optionText: { fontSize: 14, color: '#333' },
    optionTextActive: { color: '#1565C0', fontWeight: '700' },
});

// ── 결과 테이블 행 ──
function DataRow({ label, daily, cumulative, incomplete, overdue, leadTime, level, isSubtotal }: {
    label: string; daily: number; cumulative: number; incomplete: number; overdue: number; leadTime: number;
    level: number; isSubtotal?: boolean;
}) {
    const bg = isSubtotal ? '#F0F4F8' : '#FFF';
    const fw = isSubtotal ? '700' as const : '400' as const;
    const pl = level * 16 + 12;
    const ltColor = leadTime >= 1.5 ? '#D32F2F' : leadTime >= 1.0 ? '#F57F17' : '#388E3C';
    const odColor = overdue > 0 ? '#D32F2F' : '#333';

    return (
        <View style={[s.dataRow, { backgroundColor: bg }]}>
            <Text style={[s.cell, s.cellName, { paddingLeft: pl, fontWeight: fw }]} numberOfLines={1}>{label}</Text>
            <Text style={[s.cell, s.cellNum, { fontWeight: fw }]}>{daily}</Text>
            <Text style={[s.cell, s.cellNum, { fontWeight: fw }]}>{cumulative}</Text>
            <Text style={[s.cell, s.cellNum, { fontWeight: fw }]}>{incomplete}</Text>
            <Text style={[s.cell, s.cellNum, { fontWeight: fw, color: odColor }]}>{overdue}</Text>
            <Text style={[s.cell, s.cellNum, { fontWeight: fw, color: ltColor }]}>{leadTime}</Text>
        </View>
    );
}

// ── 센터 아코디언 ──
function CenterAccordion({ center }: { center: any }) {
    const [expanded, setExpanded] = useState(false);
    const masters = center.masters || [];
    const st = center.stats || center;

    return (
        <View>
            <TouchableOpacity style={[s.dataRow, { backgroundColor: '#FAFAFA' }]} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
                <Text style={[s.cell, s.cellName, { paddingLeft: 28, fontWeight: '600' }]}>
                    {expanded ? '▾' : '▸'} {center.name}
                </Text>
                <Text style={[s.cell, s.cellNum, { fontWeight: '600' }]}>{st.asCount?.daily ?? 0}</Text>
                <Text style={[s.cell, s.cellNum, { fontWeight: '600' }]}>{st.asCount?.cumulative ?? 0}</Text>
                <Text style={[s.cell, s.cellNum, { fontWeight: '600' }]}>{st.incomplete?.total ?? 0}</Text>
                <Text style={[s.cell, s.cellNum, { fontWeight: '600' }]}>{st.incomplete?.overdue ?? 0}</Text>
                <Text style={[s.cell, s.cellNum, { fontWeight: '600' }]}>{st.leadTime ?? 0}</Text>
            </TouchableOpacity>
            {expanded && masters.map((m: any, i: number) => {
                const ms = m.stats || m;
                return <DataRow key={i} label={m.name} daily={ms.asCount?.daily ?? 0} cumulative={ms.asCount?.cumulative ?? 0}
                    incomplete={ms.incomplete?.total ?? 0} overdue={ms.incomplete?.overdue ?? 0} leadTime={ms.leadTime ?? 0} level={2} />;
            })}
        </View>
    );
}

// ── 서비스 아코디언 ──
function ServiceAccordion({ service }: { service: any }) {
    const [expanded, setExpanded] = useState(false);
    const st = service.stats || service;

    return (
        <View style={s.accordionContainer}>
            <TouchableOpacity style={s.accordionHeader} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={s.accordionArrow}>{expanded ? '▼' : '▶'}</Text>
                    <Text style={s.accordionTitle}>{service.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Text style={s.accordionStat}>건수 <Text style={{ fontWeight: '700' }}>{st.asCount?.daily ?? 0}</Text>/{st.asCount?.cumulative ?? 0}</Text>
                    <Text style={[s.accordionStat, (st.incomplete?.total ?? 0) > 0 && { color: '#D32F2F' }]}>
                        미완료 <Text style={{ fontWeight: '700' }}>{st.incomplete?.total ?? 0}</Text>
                    </Text>
                </View>
            </TouchableOpacity>
            {expanded && (
                <View>
                    <DataRow label={service.name + ' 소계'} daily={st.asCount?.daily ?? 0} cumulative={st.asCount?.cumulative ?? 0}
                        incomplete={st.incomplete?.total ?? 0} overdue={st.incomplete?.overdue ?? 0} leadTime={st.leadTime ?? 0} level={0} isSubtotal />
                    {(service.centers || []).map((c: any, i: number) => <CenterAccordion key={i} center={c} />)}
                </View>
            )}
        </View>
    );
}

// ══════════════════════════════════════════
// 메인 화면
// ══════════════════════════════════════════

export default function AsPerformanceScreen() {
    // 검색 조건
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [repairType, setRepairType] = useState<RepairType>('경수리');
    const [selectedPart, setSelectedPart] = useState('전체');
    const [calendarOpen, setCalendarOpen] = useState(false);

    // 결과
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [resultData, setResultData] = useState<any>(null);

    const partOptions = repairType === '중수리' ? PART_OPTIONS_HEAVY : PART_OPTIONS_LIGHT;

    const handleRepairTypeChange = (type: string) => {
        setRepairType(type as RepairType);
        setSelectedPart('전체');
        setSearched(false);
        setResultData(null);
    };

    const handleSearch = async () => {
        setLoading(true);
        setSearched(true);
        try {
            const dateStr = toApiDate(selectedDate);
            const monthStr = dateStr.substring(0, 7);
            const response = await getAsPerformance(monthStr, dateStr);
            if (response.success && response.data) {
                setResultData(response.data);
            } else {
                Alert.alert('오류', response.message || '데이터 조회에 실패했습니다.');
                setResultData(null);
            }
        } catch {
            Alert.alert('오류', 'API 호출 중 에러가 발생했습니다.');
            setResultData(null);
        }
        setLoading(false);
    };

    // 결과 필터링
    const getFilteredServices = () => {
        if (!resultData?.services) return [];
        if (selectedPart === '전체') return resultData.services;
        return resultData.services.filter((svc: any) => svc.name === selectedPart);
    };

    return (
        <View style={[s.container, { backgroundColor: '#FFF' }]}>
            <Header title="AS 실적" />

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* ── 검색 조건 ── */}
                <View style={s.searchContainer}>
                    {/* 날짜 선택 */}
                    <Text style={s.fieldLabel}>완료일자</Text>
                    <TouchableOpacity style={s.dateSelector} onPress={() => setCalendarOpen(true)}>
                        <Text style={s.dateText}>📅 {formatKoreanDate(selectedDate)}</Text>
                        <Text style={s.arrow}>▼</Text>
                    </TouchableOpacity>

                    {/* 수리구분 + 파트 */}
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 12, zIndex: 10 }}>
                        <DropdownSelector label="수리구분" value={repairType} options={['경수리', '중수리']} onSelect={handleRepairTypeChange} />
                        <DropdownSelector label="파트" value={selectedPart} options={partOptions} onSelect={setSelectedPart} />
                    </View>

                    {/* 검색 버튼 */}
                    <Button mode="contained" onPress={handleSearch} loading={loading} disabled={loading}
                        style={[s.searchButton, { backgroundColor: '#1565C0' }]} labelStyle={s.searchBtnLabel}>
                        검색
                    </Button>
                </View>

                {/* ── 결과 영역 ── */}
                {loading ? (
                    <View style={s.loadingBox}>
                        <ActivityIndicator size="large" color="#1565C0" />
                        <Text style={s.loadingText}>데이터를 불러오는 중...</Text>
                    </View>
                ) : !searched ? (
                    <View style={s.emptyBox}>
                        <Text style={s.emptyIcon}>📊</Text>
                        <Text style={s.emptyTitle}>조건을 선택하고 검색해주세요</Text>
                        <Text style={s.emptySub}>날짜, 수리구분, 파트를 선택한 후{'\n'}검색 버튼을 눌러주세요.</Text>
                    </View>
                ) : !resultData ? (
                    <View style={s.emptyBox}>
                        <Text style={s.emptyIcon}>⚠️</Text>
                        <Text style={s.emptyTitle}>데이터가 없습니다</Text>
                        <Text style={s.emptySub}>조건을 변경하여 다시 검색해주세요.</Text>
                    </View>
                ) : (
                    <View>
                        {/* 요약 카드 */}
                        <View style={s.summaryRow}>
                            <View style={[s.summaryCard, { borderTopColor: '#1976D2' }]}>
                                <Text style={s.summaryLabel}>AS접수</Text>
                                <Text style={[s.summaryValue, { color: '#1976D2' }]}>{resultData.summary?.asCount?.daily ?? 0}</Text>
                                <Text style={s.summarySub}>누적 {resultData.summary?.asCount?.cumulative ?? 0}</Text>
                            </View>
                            <View style={[s.summaryCard, { borderTopColor: '#388E3C' }]}>
                                <Text style={s.summaryLabel}>AS완료</Text>
                                <Text style={[s.summaryValue, { color: '#388E3C' }]}>
                                    {(resultData.summary?.completed?.noVisit?.daily ?? 0) + (resultData.summary?.completed?.visit?.daily ?? 0)}
                                </Text>
                                <Text style={s.summarySub}>누적 {(resultData.summary?.completed?.noVisit?.cumulative ?? 0) + (resultData.summary?.completed?.visit?.cumulative ?? 0)}</Text>
                            </View>
                            <View style={[s.summaryCard, { borderTopColor: (resultData.summary?.incomplete?.total ?? 0) > 0 ? '#D32F2F' : '#999' }]}>
                                <Text style={s.summaryLabel}>미완료</Text>
                                <Text style={[s.summaryValue, { color: (resultData.summary?.incomplete?.total ?? 0) > 0 ? '#D32F2F' : '#999' }]}>{resultData.summary?.incomplete?.total ?? 0}</Text>
                                <Text style={s.summarySub}>{(resultData.summary?.incomplete?.overdue ?? 0) > 0 ? `4일+ ${resultData.summary.incomplete.overdue}` : '-'}</Text>
                            </View>
                            <View style={[s.summaryCard, { borderTopColor: '#F57F17' }]}>
                                <Text style={s.summaryLabel}>L/T</Text>
                                <Text style={[s.summaryValue, { color: '#F57F17' }]}>{resultData.summary?.leadTime ?? 0}</Text>
                                <Text style={s.summarySub}>누적평균</Text>
                            </View>
                        </View>

                        {/* 상세 테이블 */}
                        <View style={s.tableContainer}>
                            <View style={s.tableHeader}>
                                <Text style={[s.cell, s.cellName, s.headerText]}>구분</Text>
                                <Text style={[s.cell, s.cellNum, s.headerText]}>당일</Text>
                                <Text style={[s.cell, s.cellNum, s.headerText]}>누적</Text>
                                <Text style={[s.cell, s.cellNum, s.headerText]}>미완료</Text>
                                <Text style={[s.cell, s.cellNum, s.headerText]}>4일+</Text>
                                <Text style={[s.cell, s.cellNum, s.headerText]}>L/T</Text>
                            </View>

                            {/* 전체 합계 */}
                            <View style={[s.dataRow, { backgroundColor: '#E3F2FD' }]}>
                                <Text style={[s.cell, s.cellName, { fontWeight: '800', color: '#1565C0', paddingLeft: 12 }]}>전체({repairType})</Text>
                                <Text style={[s.cell, s.cellNum, { fontWeight: '800', color: '#1565C0' }]}>{resultData.summary?.asCount?.daily ?? 0}</Text>
                                <Text style={[s.cell, s.cellNum, { fontWeight: '800', color: '#1565C0' }]}>{resultData.summary?.asCount?.cumulative ?? 0}</Text>
                                <Text style={[s.cell, s.cellNum, { fontWeight: '800', color: '#1565C0' }]}>{resultData.summary?.incomplete?.total ?? 0}</Text>
                                <Text style={[s.cell, s.cellNum, { fontWeight: '800', color: '#1565C0' }]}>{resultData.summary?.incomplete?.overdue ?? 0}</Text>
                                <Text style={[s.cell, s.cellNum, { fontWeight: '800', color: '#1565C0' }]}>{resultData.summary?.leadTime ?? 0}</Text>
                            </View>

                            {/* 서비스별 */}
                            {getFilteredServices().map((svc: any, i: number) => (
                                <ServiceAccordion key={i} service={svc} />
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* 달력 모달 */}
            <Modal visible={calendarOpen} transparent animationType="fade" onRequestClose={() => setCalendarOpen(false)}>
                <View style={s.modalOverlay}>
                    <CalendarPicker selected={selectedDate} onSelect={(d) => { setSelectedDate(d); setSearched(false); setResultData(null); }} onClose={() => setCalendarOpen(false)} />
                </View>
            </Modal>
        </View>
    );
}

// ══════════════════════════════════════════
// 스타일
// ══════════════════════════════════════════
const s = StyleSheet.create({
    container: { flex: 1 },
    searchContainer: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
    dateSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: '#E0E0E0' },
    dateText: { fontSize: 14, fontWeight: '600', color: '#333' },
    arrow: { fontSize: 10, color: '#999' },
    searchButton: { marginTop: 16, borderRadius: 8, paddingVertical: 4 },
    searchBtnLabel: { fontSize: 15, fontWeight: '700' },

    loadingBox: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    loadingText: { marginTop: 12, color: '#666', fontSize: 14 },
    emptyBox: { alignItems: 'center', paddingTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 8 },
    emptySub: { fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 20 },

    summaryRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 16, gap: 8 },
    summaryCard: { flex: 1, backgroundColor: '#FAFAFA', borderRadius: 10, padding: 12, borderTopWidth: 3, alignItems: 'center' },
    summaryLabel: { fontSize: 11, marginBottom: 4, color: '#666' },
    summaryValue: { fontSize: 22, fontWeight: '800' },
    summarySub: { fontSize: 11, color: '#999', marginTop: 2 },

    tableContainer: { marginHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0', overflow: 'hidden' },
    tableHeader: { flexDirection: 'row', backgroundColor: '#1565C0', paddingVertical: 10 },
    headerText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
    dataRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E0E0E0' },
    cell: { fontSize: 13, color: '#333' },
    cellName: { flex: 2.5, paddingLeft: 12 },
    cellNum: { flex: 1, textAlign: 'center' },

    accordionContainer: { borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
    accordionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, backgroundColor: '#EEF5FD' },
    accordionArrow: { fontSize: 12, color: '#1565C0', marginRight: 6 },
    accordionTitle: { fontSize: 14, fontWeight: '700', color: '#1565C0' },
    accordionStat: { fontSize: 12, color: '#666' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
});
