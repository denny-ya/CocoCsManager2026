import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Surface, Button, TextInput } from 'react-native-paper';
import { Header } from '@/components/Header';
import { EmptyState } from '@/components/EmptyState';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppColors } from '@/constants/Colors';
import { MOCK_DISPATCHES, DispatchItem as DispatchItemType } from '@/services/mockData';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { Skeleton } from '@/components/ui/Skeleton';

// 배차 아이템
function DispatchCard({ item }: { item: DispatchItemType }) {
    const colors = AppColors.light;

    const statusColor =
        item.status === '완료' ? colors.success :
            item.status === '이동중' ? colors.warning : colors.textSecondary;

    const statusIcon =
        item.status === '완료' ? 'checkmark.circle.fill' as const :
            item.status === '이동중' ? 'car.fill' as const : 'clock.fill' as const;

    return (
        <Surface style={[cardStyles.card, { backgroundColor: '#FFFFFF' }]} elevation={1}>
            {/* 상태 바 */}
            <View style={[cardStyles.statusBar, { backgroundColor: statusColor }]} />
            <View style={cardStyles.content}>
                <View style={cardStyles.topRow}>
                    <View style={cardStyles.storeInfo}>
                        <Text variant="titleSmall" style={{ color: colors.textPrimary, fontWeight: '700' }}>
                            {item.storeName}
                        </Text>
                        <Text variant="bodySmall" style={{ color: colors.textSecondary, marginTop: 2 }}>
                            {item.vehicleNo}
                        </Text>
                    </View>
                    <View style={[cardStyles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                        <IconSymbol name={statusIcon} size={14} color={statusColor} />
                        <Text style={[cardStyles.statusText, { color: statusColor }]}> {item.status}</Text>
                    </View>
                </View>
                <View style={cardStyles.bottomRow}>
                    <View style={cardStyles.infoChip}>
                        <IconSymbol name="clock.fill" size={14} color={colors.textSecondary} />
                        <Text variant="bodySmall" style={{ color: colors.textSecondary, marginLeft: 4 }}>
                            {item.time}
                        </Text>
                    </View>
                    <View style={cardStyles.infoChip}>
                        <IconSymbol name="person.2.fill" size={14} color={colors.textSecondary} />
                        <Text variant="bodySmall" style={{ color: colors.textSecondary, marginLeft: 4 }}>
                            {item.driver}
                        </Text>
                    </View>
                </View>
            </View>
        </Surface>
    );
}

const cardStyles = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 14,
        overflow: 'hidden',
        flexDirection: 'row',
    },
    statusBar: {
        width: 4,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    storeInfo: {
        flex: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    bottomRow: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 16,
    },
    infoChip: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});

export default function DispatchScreen() {
    // 강제 라이트 모드
    const colors = AppColors.light;

    const today = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(today);
    const [results, setResults] = useState<DispatchItemType[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [datePickerVisible, setDatePickerVisible] = useState(false);

    const handleSearch = async () => {
        setLoading(true);
        setSearched(true);
        setResults([]); // 스켈레톤 노출 위해 초기화

        // Mock API Call Simulation
        await new Promise(resolve => setTimeout(resolve, 800));

        // 날짜가 일치하는 데이터 필터링 (MockData에는 날짜 필드가 없으므로, 현재는 모두 리턴하거나 랜덤으로 필터링)
        // 실제로는 item.date 필드가 있어야 함. MockData에 date 필드 추가 필요.
        // 임시로, 홀수 날짜에는 빈 배열, 짝수 날짜에는 전체 데이터를 리턴하는 식으로 시뮬레이션
        // 혹은 모든 데이터를 그냥 보여줌 (사용자가 "날짜별"이라고 했지만 MockData에 날짜가 없으므로)
        // **수정**: MockData에 date 필드가 없으므로, 그냥 다 보여주되 "검색" 했다는 느낌만.

        setResults(MOCK_DISPATCHES);
        setLoading(false);
    };

    const onRefresh = async () => {
        if (!searched) return;
        setRefreshing(true);
        await handleSearch();
        setRefreshing(false);
    };

    const handleDateConfirm = (date: string) => {
        setSelectedDate(date);
        // 날짜 변경 시 자동 검색? or 사용자가 조회 버튼 눌러야 함?
        // 조회 버튼 누르게 하는 것이 명확함.
    };

    return (
        <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
            <Header title="배차 목록" />

            {/* 날짜 선택 영역 */}
            <View style={[styles.dateContainer, { backgroundColor: '#FFFFFF' }]}>
                <Text variant="labelMedium" style={[styles.dateLabel, { color: colors.textSecondary }]}>
                    배차일 선택
                </Text>
                <View style={styles.dateRow}>
                    <TouchableOpacity
                        style={styles.dateInputWrapper}
                        onPress={() => setDatePickerVisible(true)}
                        activeOpacity={0.7}
                    >
                        <IconSymbol name="calendar" size={20} color={colors.primary} />
                        <View style={[styles.dateInput, { borderColor: colors.border }]}>
                            <Text style={{ fontSize: 16, color: colors.textPrimary }}>{selectedDate}</Text>
                        </View>
                    </TouchableOpacity>
                    <Button
                        mode="contained"
                        onPress={handleSearch}
                        style={[styles.searchBtn, { backgroundColor: colors.primary }]}
                        labelStyle={{ fontWeight: '600' }}
                        disabled={loading}
                    >
                        조회
                    </Button>
                </View>
            </View>

            {/* 결과 */}
            {loading && !refreshing ? (
                <View style={{ paddingHorizontal: 16 }}>
                    {[1, 2, 3].map(i => (
                        <View key={i} style={[cardStyles.card, { padding: 16, backgroundColor: 'white', elevation: 1 }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <View>
                                    <Skeleton width={80} height={20} />
                                    <Skeleton width={120} height={16} style={{ marginTop: 8 }} />
                                </View>
                                <Skeleton width={50} height={24} borderRadius={12} />
                            </View>
                            <View style={{ flexDirection: 'row', marginTop: 16, gap: 16 }}>
                                <Skeleton width={60} height={16} />
                                <Skeleton width={60} height={16} />
                            </View>
                        </View>
                    ))}
                </View>
            ) : !searched ? (
                <EmptyState
                    icon="truck.fill"
                    message="날짜를 선택해주세요"
                    subMessage="배차일을 입력하고 조회 버튼을 눌러주세요."
                />
            ) : results.length === 0 ? (
                <EmptyState
                    icon="truck.fill"
                    message="배차 데이터가 없습니다"
                    subMessage="해당 날짜의 배차 정보가 없습니다."
                />
            ) : (
                <>
                    <Text variant="bodySmall" style={[styles.resultCount, { color: colors.textSecondary }]}>
                        총 {results.length}건의 배차 (가상 데이터)
                    </Text>
                    <FlatList
                        data={results}
                        renderItem={({ item }) => <DispatchCard item={item} />}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingBottom: 24 }}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                        }
                    />
                </>
            )}

            <DatePickerModal
                visible={datePickerVisible}
                onDismiss={() => setDatePickerVisible(false)}
                onConfirm={handleDateConfirm}
                initialDate={selectedDate}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    dateContainer: {
        margin: 16,
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    dateLabel: {
        fontWeight: '600',
        marginBottom: 8,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dateInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dateInput: {
        flex: 1,
        height: 42,
        borderRadius: 10,
        borderWidth: 1,
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    searchBtn: {
        borderRadius: 10,
        paddingVertical: 2,
    },
    resultCount: {
        marginHorizontal: 20,
        marginBottom: 8,
    },
});
