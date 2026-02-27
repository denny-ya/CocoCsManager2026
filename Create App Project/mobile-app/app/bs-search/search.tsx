import React, { useState, useRef } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Modal, Dimensions, ScrollView, TextInput } from 'react-native';
import { Text, Surface, TextInput as PaperInput, Button, ActivityIndicator, Checkbox } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Header } from '@/components/Header';
import { EmptyState } from '@/components/EmptyState';
import { AppColors } from '@/constants/Colors';
import { searchBS, getMasterStats, saveMemo as saveMemoApi, markAsComplete as markAsCompleteApi } from '@/services/api';
import { VehicleData } from '@/services/mockData';

const PART_OPTIONS: { label: string; value: string }[] = [
    { label: '전체', value: '' },
    { label: '서비스1', value: '서비스1' },
    { label: '서비스2', value: '서비스2' },
    { label: '서비스3', value: '서비스3' },
    { label: '서비스4', value: '서비스4' },
];

type TabType = 'vin-search' | 'master-stats';

export default function BsSearchScreen() {
    const colors = AppColors.light;
    const [activeTab, setActiveTab] = useState<TabType>('vin-search');

    // 차대번호 검색
    const [keyword, setKeyword] = useState('');
    const [selectedPart, setSelectedPart] = useState('');
    const [results, setResults] = useState<VehicleData[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    // 마스터 통계
    const [masterName, setMasterName] = useState('');
    const [masterPart, setMasterPart] = useState('');
    const [masterStats, setMasterStats] = useState<any>(null);
    const [masterLoading, setMasterLoading] = useState(false);
    const [masterSearched, setMasterSearched] = useState(false);

    // 바코드
    const [scannerVisible, setScannerVisible] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const scanLock = useRef(false);

    const handleSearch = async () => {
        if (!keyword.trim()) { Alert.alert('알림', '차대번호를 입력해주세요.'); return; }
        setLoading(true); setSearched(true); setResults([]);
        const response = await searchBS(keyword, selectedPart);
        setLoading(false);
        if (response.success) setResults(response.data);
        else Alert.alert('오류', response.message);
    };

    const handleMasterSearch = async () => {
        if (!masterName.trim()) { Alert.alert('알림', '마스터 이름을 입력해주세요.'); return; }
        setMasterLoading(true); setMasterSearched(true); setMasterStats(null);
        const response = await getMasterStats(masterName, masterPart);
        setMasterLoading(false);
        if (response.success) setMasterStats(response.data);
        else Alert.alert('오류', response.message);
    };

    const openScanner = async () => {
        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) { Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.'); return; }
        }
        scanLock.current = false;
        setScannerVisible(true);
    };

    const handleBarCodeScanned = async (result: { type: string; data: string }) => {
        if (scanLock.current) return;
        scanLock.current = true;
        setScannerVisible(false);

        const scannedCode = result.data;
        setKeyword(scannedCode);
        setLoading(true); setSearched(true); setResults([]);

        const response = await searchBS(scannedCode, selectedPart);
        setLoading(false);

        if (response.success && response.data.length > 0) {
            const matchedVin = response.data[0].vin;
            setResults(response.data);
            Alert.alert(
                '스캔 완료',
                `인식된 코드: ${scannedCode}\n매칭 차대번호: ${matchedVin}`
            );
        } else {
            Alert.alert(
                '스캔 완료',
                `인식된 코드: ${scannedCode}\n⚠️ 매칭되는 차대번호가 없습니다.`
            );
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
            <Header title="BS 및 리워크 검색" />

            {/* 탭 바 */}
            <View style={styles.tabBar}>
                <TouchableOpacity style={[styles.tabItem, activeTab === 'vin-search' && styles.tabItemActive]}
                    onPress={() => setActiveTab('vin-search')}>
                    <Text style={[styles.tabText, activeTab === 'vin-search' && { color: colors.primary, fontWeight: '700' }]}>차대번호 검색</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabItem, activeTab === 'master-stats' && styles.tabItemActive]}
                    onPress={() => setActiveTab('master-stats')}>
                    <Text style={[styles.tabText, activeTab === 'master-stats' && { color: colors.primary, fontWeight: '700' }]}>마스터 통계</Text>
                </TouchableOpacity>
            </View>

            {/* ═══ 탭1: 차대번호 검색 ═══ */}
            {activeTab === 'vin-search' && (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
                    <View style={styles.searchContainer}>
                        <PartChips options={PART_OPTIONS} selected={selectedPart} onSelect={setSelectedPart} colors={colors} />
                        <View style={styles.inputRow}>
                            <View style={{ flex: 1 }}>
                                <PaperInput mode="outlined" label="차대번호 입력 (예: HYM322122726)"
                                    value={keyword} onChangeText={setKeyword} style={styles.input}
                                    right={<PaperInput.Icon icon="close-circle" onPress={() => setKeyword('')} />}
                                    onSubmitEditing={handleSearch} />
                            </View>
                            <TouchableOpacity style={[styles.scanButton, { backgroundColor: colors.primary }]} onPress={openScanner}>
                                <Text style={styles.scanButtonIcon}>📷</Text>
                            </TouchableOpacity>
                        </View>
                        <Button mode="contained" onPress={handleSearch}
                            style={[styles.searchButton, { backgroundColor: colors.primary }]}
                            labelStyle={styles.searchButtonLabel} loading={loading} disabled={loading}>
                            검색
                        </Button>
                    </View>

                    {loading ? (
                        <LoadingView message="데이터를 조회하고 있습니다..." colors={colors} />
                    ) : !searched ? (
                        <EmptyState icon="magnifyingglass" message="차대번호를 입력해주세요" subMessage="검색 버튼을 누르면 실시간 데이터를 조회합니다." />
                    ) : results.length === 0 ? (
                        <EmptyState icon="doc.text.fill" message="검색 결과가 없습니다" subMessage="입력한 차대번호를 다시 확인해주세요." />
                    ) : (
                        results.map((item, idx) => <VehicleCard key={idx} data={item} onRefresh={handleSearch} />)
                    )}
                </ScrollView>
            )}

            {/* ═══ 탭2: 마스터 통계 ═══ */}
            {activeTab === 'master-stats' && (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
                    <View style={styles.searchContainer}>
                        <PartChips options={PART_OPTIONS} selected={masterPart} onSelect={setMasterPart} colors={colors} />
                        <PaperInput mode="outlined" label="마스터 이름 입력 (예: 홍길동)"
                            value={masterName} onChangeText={setMasterName} style={styles.input}
                            right={<PaperInput.Icon icon="close-circle" onPress={() => setMasterName('')} />}
                            onSubmitEditing={handleMasterSearch} />
                        <Button mode="contained" onPress={handleMasterSearch}
                            style={[styles.searchButton, { backgroundColor: colors.primary }]}
                            labelStyle={styles.searchButtonLabel} loading={masterLoading} disabled={masterLoading}>
                            통계 조회
                        </Button>
                    </View>

                    {masterLoading ? (
                        <LoadingView message="통계를 조회하고 있습니다..." colors={colors} />
                    ) : !masterSearched ? (
                        <EmptyState icon="chart.bar.fill" message="마스터 이름을 입력해주세요" subMessage="마스터별 점검 현황을 확인할 수 있습니다." />
                    ) : !masterStats ? (
                        <EmptyState icon="exclamationmark.triangle" message="통계를 불러올 수 없습니다" subMessage="마스터 이름을 다시 확인해주세요." />
                    ) : masterStats.total === 0 ? (
                        <EmptyState icon="person.fill.xmark" message="해당 파트에 배정된 데이터가 없습니다" subMessage={`'${masterName}' 마스터는 선택한 파트에 작업 내역이 없습니다.\n다른 파트를 선택해주세요.`} />
                    ) : (
                        <MasterStatsView stats={masterStats} masterName={masterName} />
                    )}
                </ScrollView>
            )}

            {/* 바코드 스캐너 */}
            <Modal visible={scannerVisible} animationType="slide" onRequestClose={() => setScannerVisible(false)}>
                <View style={styles.scannerContainer}>
                    <CameraView style={StyleSheet.absoluteFillObject}
                        barcodeScannerSettings={{ barcodeTypes: ['code39', 'code128', 'code93', 'ean13', 'ean8', 'qr'] }}
                        onBarcodeScanned={handleBarCodeScanned} />
                    <View style={styles.scannerOverlay}>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700' }}>차대번호 바코드를 스캔하세요</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 8 }}>바코드를 카메라 중앙에 위치시켜 주세요</Text>
                        </View>
                        <View style={styles.scanFrame}>
                            <View style={[styles.scanCorner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }]} />
                            <View style={[styles.scanCorner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }]} />
                            <View style={[styles.scanCorner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
                            <View style={[styles.scanCorner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }]} />
                        </View>
                        <TouchableOpacity style={styles.scanCloseButton} onPress={() => setScannerVisible(false)}>
                            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>닫기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ══════════════════════════════════════════════════════════
function LoadingView({ message, colors }: { message: string; colors: any }) {
    return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 16, color: '#999' }}>{message}</Text>
        </View>
    );
}

function PartChips({ options, selected, onSelect, colors }: any) {
    return (
        <View style={styles.partChipContainer}>
            {options.map((opt: any) => (
                <TouchableOpacity key={opt.value}
                    style={[styles.partChip, selected === opt.value && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                    onPress={() => onSelect(opt.value)}>
                    <Text style={[styles.partChipText, selected === opt.value && { color: colors.primary, fontWeight: '700' }]}>
                        {opt.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

// ══════════════════════════════════════════════════════════
// 차량 상세 카드 (메모 편집 + 점검 완료 처리 기능 포함)
// ══════════════════════════════════════════════════════════
function VehicleCard({ data, onRefresh }: { data: VehicleData; onRefresh: () => void }) {
    const isCompleted = data.completed && String(data.completed).includes('완료');
    const [memoText, setMemoText] = useState(data.memo || '');
    const [saving, setSaving] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [processTypes, setProcessTypes] = useState({
        inspection: false,
        replace: false,
        transfer: false,
        disposal: false,
    });

    // 처리 유형 수집 (이미 완료된 경우)
    const processList: string[] = [];
    if (data.processInspection) processList.push('점검');
    if (data.processReplace) processList.push('교체');
    if (data.processTransfer) processList.push('이관');
    if (data.processDisposal) processList.push('폐기');
    const processText = processList.length > 0 ? `(${processList.join(', ')})` : '';

    // 상태 배지
    const statusBadges: { text: string; type: string }[] = [];
    if (isCompleted) {
        let completeText = 'BS 완료';
        if (processText) completeText += ' ' + processText;
        if (data.completedDate) completeText += ' (' + data.completedDate + ')';
        statusBadges.push({ text: completeText, type: 'completed' });
    } else {
        if (String(data.bsTarget).includes('O')) {
            statusBadges.push({ text: 'BS 점검 대상', type: 'target' });
        }
        if (typeof data.bsTarget === 'string' && data.bsTarget.includes('리워크')) {
            statusBadges.push({ text: '리워크(2026)', type: 'rework' });
        }
        if (statusBadges.length === 0) {
            statusBadges.push({ text: 'BS 점검 비대상', type: 'nonTarget' });
        }
    }

    const badgeStyles: Record<string, { bg: string; color: string; icon: string }> = {
        completed: { bg: '#E8F5E9', color: '#388E3C', icon: '✅' },
        target: { bg: '#FFEBEE', color: '#D32F2F', icon: '⚠️' },
        rework: { bg: '#E3F2FD', color: '#1976D2', icon: '🔧' },
        nonTarget: { bg: '#F1F8E9', color: '#558B2F', icon: '✅' },
        exclusion: { bg: '#F3E5F5', color: '#7B1FA2', icon: '⛔' },
        disposal: { bg: '#FCE4EC', color: '#C62828', icon: '🗑️' },
    };

    // 메모 저장
    const handleSaveMemo = async () => {
        setSaving(true);
        const result = await saveMemoApi(data.vin, memoText);
        setSaving(false);
        if (result.success) {
            Alert.alert('완료', result.message || '메모가 저장되었습니다.');
        } else {
            Alert.alert('오류', result.message || '메모 저장에 실패했습니다.');
        }
    };

    // 점검 완료 처리
    const handleComplete = async () => {
        if (!processTypes.inspection && !processTypes.replace && !processTypes.transfer && !processTypes.disposal) {
            Alert.alert('알림', '처리구분을 1개 이상 선택해주세요.');
            return;
        }
        setShowCompleteModal(false);
        setCompleting(true);
        const result = await markAsCompleteApi(data.vin, memoText, processTypes);
        setCompleting(false);
        if (result.success) {
            onRefresh();
        } else {
            Alert.alert('오류', result.message || '완료 처리에 실패했습니다.');
        }
    };

    const toggleProcess = (key: keyof typeof processTypes) => {
        setProcessTypes(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <>
            <Surface style={[styles.vehicleCard, { backgroundColor: '#FFF' }]} elevation={1}>
                {/* 상태 배지 */}
                {statusBadges.map((badge, idx) => {
                    const style = badgeStyles[badge.type] || badgeStyles.nonTarget;
                    return (
                        <View key={idx} style={[styles.statusBar, { backgroundColor: style.bg }]}>
                            <Text style={[styles.statusBarText, { color: style.color }]}>
                                {style.icon} {badge.text}
                            </Text>
                        </View>
                    );
                })}

                {/* 제외 사유 */}
                {data.exclusionReason ? (
                    <View style={[styles.statusBar, { backgroundColor: badgeStyles.exclusion.bg }]}>
                        <Text style={[styles.statusBarText, { color: badgeStyles.exclusion.color }]}>
                            {badgeStyles.exclusion.icon} 제외: {data.exclusionReason}
                        </Text>
                    </View>
                ) : null}

                {/* 폐기 대상 */}
                {data.disposalTarget ? (
                    <View style={[styles.statusBar, { backgroundColor: badgeStyles.disposal.bg }]}>
                        <Text style={[styles.statusBarText, { color: badgeStyles.disposal.color }]}>
                            {badgeStyles.disposal.icon} 폐기: {data.disposalTarget}
                        </Text>
                    </View>
                ) : null}

                {/* 상세 정보 */}
                <InfoRow label="차대번호" value={data.vin} bold />
                <InfoRow label="카트버전" value={data.cartVersion} />
                <InfoRow label="지점/영업소" value={`${data.branch || ''} / ${data.salesOffice || ''}`} />
                <InfoRow label="영업점" value={data.salesPoint} />
                <InfoRow label="지구" value={data.district || '-'} />
                <InfoRow label="마스터" value={data.master} />
                <InfoRow label="제조일" value={data.manufactureDate} />

                {/* 메모 섹션 */}
                <View style={styles.memoSection}>
                    <Text style={styles.memoTitle}>📝 비고 / 메모</Text>
                    <TextInput
                        style={[styles.memoInput, isCompleted && styles.memoInputReadonly]}
                        value={memoText}
                        onChangeText={setMemoText}
                        placeholder="비고 사항을 입력하세요..."
                        placeholderTextColor="#bbb"
                        multiline
                        numberOfLines={3}
                        editable={!isCompleted}
                    />
                    {isCompleted && (
                        <Text style={{ fontSize: 12, color: '#999', marginTop: 4 }}>※ 완료된 항목은 수정할 수 없습니다.</Text>
                    )}
                </View>

                {/* 점검 완료 버튼 (미완료 건만) */}
                {!isCompleted && (
                    <TouchableOpacity
                        style={[styles.completeButton, completing && { opacity: 0.5 }]}
                        onPress={() => setShowCompleteModal(true)}
                        disabled={completing}
                    >
                        <Text style={styles.completeButtonText}>
                            {completing ? '⏳ 처리 중...' : '✓ 점검 완료 처리'}
                        </Text>
                    </TouchableOpacity>
                )}
            </Surface>

            {/* 점검 완료 확인 모달 */}
            <Modal visible={showCompleteModal} transparent animationType="fade"
                onRequestClose={() => setShowCompleteModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>점검 완료 처리</Text>
                        <Text style={styles.modalSubtitle}>차대번호: {data.vin}</Text>
                        <Text style={styles.modalLabel}>처리구분 선택 (1개 이상)</Text>

                        <TouchableOpacity style={styles.checkRow} onPress={() => toggleProcess('inspection')}>
                            <Checkbox status={processTypes.inspection ? 'checked' : 'unchecked'} onPress={() => toggleProcess('inspection')} />
                            <Text style={styles.checkLabel}>점검</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.checkRow} onPress={() => toggleProcess('replace')}>
                            <Checkbox status={processTypes.replace ? 'checked' : 'unchecked'} onPress={() => toggleProcess('replace')} />
                            <Text style={styles.checkLabel}>교체</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.checkRow} onPress={() => toggleProcess('transfer')}>
                            <Checkbox status={processTypes.transfer ? 'checked' : 'unchecked'} onPress={() => toggleProcess('transfer')} />
                            <Text style={styles.checkLabel}>이관</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.checkRow} onPress={() => toggleProcess('disposal')}>
                            <Checkbox status={processTypes.disposal ? 'checked' : 'unchecked'} onPress={() => toggleProcess('disposal')} />
                            <Text style={styles.checkLabel}>폐기</Text>
                        </TouchableOpacity>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowCompleteModal(false)}>
                                <Text style={styles.modalCancelText}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleComplete}>
                                <Text style={styles.modalConfirmText}>완료 처리</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

function InfoRow({ label, value, bold, valueColor }: { label: string; value: string; bold?: boolean; valueColor?: string }) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={[styles.infoValue, bold && { fontWeight: '700' }, valueColor ? { color: valueColor } : {}]}>
                {value || '-'}
            </Text>
        </View>
    );
}

// ══════════════════════════════════════════════════════════
// 마스터 통계
// ══════════════════════════════════════════════════════════
function MasterStatsView({ stats, masterName }: { stats: any; masterName: string }) {
    return (
        <View style={{ paddingHorizontal: 16 }}>
            <Surface style={[styles.statsSection, { backgroundColor: '#FFF' }]} elevation={1}>
                <Text style={styles.statsHeader}>👤 {masterName} 마스터 작업 현황</Text>
                <Text style={{ textAlign: 'center', color: '#999', marginBottom: 4 }}>전체 완료율</Text>
                <Text style={{ textAlign: 'center', fontSize: 32, fontWeight: '800', color: '#1976D2' }}>
                    {stats.completionRate}%
                </Text>
                <ProgressBar value={stats.completionRate} color="#1976D2" />
                <View style={styles.statsRowSpaced}>
                    <Text style={{ fontSize: 14, color: '#666' }}>완료 <Text style={{ fontWeight: '700' }}>{stats.completed}</Text></Text>
                    <Text style={{ fontSize: 14, color: '#ccc' }}>|</Text>
                    <Text style={{ fontSize: 14, color: '#666' }}>전체 <Text style={{ fontWeight: '700' }}>{stats.total}</Text></Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statsCardRow}>
                    <View style={styles.halfCardBox}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#D32F2F', marginBottom: 8 }}>BS 점검대상</Text>
                        <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 4 }}>{stats.regularCompletionRate}%</Text>
                        <ProgressBar value={stats.regularCompletionRate} color="#D32F2F" />
                        <Text style={{ fontSize: 13, color: '#666', marginTop: 8 }}>완료 {stats.regularCompleted} / {stats.regularTotal}</Text>
                    </View>
                    <View style={styles.halfCardBox}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#1565C0', marginBottom: 8 }}>리워크(2026)</Text>
                        <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 4 }}>{stats.reworkCompletionRate}%</Text>
                        <ProgressBar value={stats.reworkCompletionRate} color="#1565C0" />
                        <Text style={{ fontSize: 13, color: '#666', marginTop: 8 }}>완료 {stats.reworkCompleted} / {stats.reworkTotal}</Text>
                    </View>
                </View>
                <View style={styles.divider} />
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 12 }}>🏢 영업점별 현황</Text>
                <View style={styles.branchListContainer}>
                    {stats.branchStats && stats.branchStats.length > 0 ? (
                        stats.branchStats.map((branch: any, idx: number) => (
                            <View key={idx} style={styles.branchCard}>
                                <View style={styles.branchHeader}>
                                    <Text style={styles.branchName}>{branch.name}</Text>
                                    <Text style={styles.branchSummary}>{branch.completed}/{branch.total} ({branch.rate}%)</Text>
                                </View>
                                <View style={styles.branchDetail}>
                                    <View style={styles.branchHalf}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ fontSize: 12, color: '#666' }}>BS</Text>
                                            <Text style={{ fontSize: 12, color: '#666' }}>{branch.regularCompleted}/{branch.regularTotal}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#D32F2F' }}>{branch.regularRate}%</Text>
                                            <MiniBar value={branch.regularRate} color="#D32F2F" />
                                        </View>
                                    </View>
                                    <View style={styles.branchHalf}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ fontSize: 12, color: '#666' }}>Rework</Text>
                                            <Text style={{ fontSize: 12, color: '#666' }}>{branch.reworkCompleted}/{branch.reworkTotal}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#1565C0' }}>{branch.reworkRate}%</Text>
                                            <MiniBar value={branch.reworkRate} color="#1565C0" />
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={{ textAlign: 'center', color: '#999', padding: 12 }}>영업점 데이터 없음</Text>
                    )}
                </View>
            </Surface>
        </View>
    );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
    return (
        <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.min(value || 0, 100)}%`, backgroundColor: color }]} />
        </View>
    );
}

function MiniBar({ value, color }: { value: number; color: string }) {
    return (
        <View style={{ width: 50, height: 4, borderRadius: 2, backgroundColor: '#eee', marginTop: 2 }}>
            <View style={{ width: `${Math.min(value || 0, 100)}%`, height: '100%', borderRadius: 2, backgroundColor: color }} />
        </View>
    );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_SIZE = SCREEN_WIDTH * 0.7;

const styles = StyleSheet.create({
    container: { flex: 1 },
    tabBar: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
    tabItem: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabItemActive: { borderBottomColor: '#1976D2' },
    tabText: { fontSize: 15, color: '#999', fontWeight: '500' },

    searchContainer: { margin: 16, padding: 16, borderRadius: 16, backgroundColor: '#FFF', elevation: 2 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    input: { backgroundColor: 'transparent' },
    scanButton: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
    scanButtonIcon: { fontSize: 22 },
    searchButton: { marginTop: 12, borderRadius: 8, paddingVertical: 2 },
    searchButtonLabel: { fontSize: 16, fontWeight: 'bold' },

    partChipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    partChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f5f5f5' },
    partChipText: { fontSize: 13, color: '#666' },

    loadingContainer: { paddingTop: 80, alignItems: 'center', justifyContent: 'center' },

    // 차량 카드
    vehicleCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 16 },
    statusBar: { paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
    statusBarText: { fontSize: 14, fontWeight: '700' },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    infoLabel: { fontSize: 14, color: '#666', flex: 1 },
    infoValue: { fontSize: 14, color: '#333', textAlign: 'right', flex: 1.5 },

    // 메모
    memoSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' },
    memoTitle: { fontSize: 14, fontWeight: '600', color: '#D32F2F', marginBottom: 8 },
    memoInput: {
        backgroundColor: '#FFFDE7', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#FFF9C4',
        fontSize: 13, color: '#333', minHeight: 70, textAlignVertical: 'top',
    },
    memoInputReadonly: { backgroundColor: '#f5f5f5', borderColor: '#eee', color: '#999' },

    // 점검 완료 버튼
    completeButton: {
        marginTop: 12, backgroundColor: '#1976D2', borderRadius: 10, paddingVertical: 14, alignItems: 'center',
    },
    completeButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

    // 완료 확인 모달
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 16, padding: 24 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 4 },
    modalSubtitle: { fontSize: 13, color: '#999', marginBottom: 16 },
    modalLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
    checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
    checkLabel: { fontSize: 15, color: '#333', marginLeft: 4 },
    modalButtons: { flexDirection: 'row', gap: 10, marginTop: 20 },
    modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#f5f5f5', alignItems: 'center' },
    modalCancelText: { fontSize: 15, fontWeight: '600', color: '#999' },
    modalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#1976D2', alignItems: 'center' },
    modalConfirmText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

    // 마스터 통계
    statsSection: { borderRadius: 14, padding: 16, marginBottom: 12 },
    statsHeader: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 16 },
    statsRowSpaced: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 16 },
    statsCardRow: { flexDirection: 'row', gap: 12 },
    halfCardBox: { flex: 1, backgroundColor: '#f9f9f9', padding: 12, borderRadius: 8 },

    branchListContainer: { borderWidth: 1, borderColor: '#BBDEFB', borderRadius: 8, backgroundColor: '#E3F2FD', padding: 4 },
    branchCard: { padding: 12, backgroundColor: '#FFF', marginBottom: 8, borderRadius: 8, elevation: 1 },
    branchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    branchName: { fontSize: 14, fontWeight: '600', color: '#333' },
    branchSummary: { fontSize: 13, color: '#555' },
    branchDetail: { flexDirection: 'row', gap: 12 },
    branchHalf: { flex: 1, backgroundColor: '#fafafa', padding: 6, paddingHorizontal: 8, borderRadius: 4 },

    // 바코드
    scannerContainer: { flex: 1, backgroundColor: '#000' },
    scannerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 80 },
    scanFrame: { width: SCAN_SIZE, height: SCAN_SIZE * 0.5, position: 'relative' },
    scanCorner: { position: 'absolute', width: 24, height: 24, borderColor: '#FFF' },
    scanCloseButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },

    progressBg: { height: 8, borderRadius: 4, backgroundColor: '#EEE', overflow: 'hidden', marginTop: 6 },
    progressFill: { height: '100%', borderRadius: 4 },
});
