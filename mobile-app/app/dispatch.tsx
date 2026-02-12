import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';
import { Text, Surface, Button, TextInput } from 'react-native-paper';
import { Header } from '@/components/Header';
import { EmptyState } from '@/components/EmptyState';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MOCK_DISPATCHES, DispatchItem as DispatchItemType } from '@/services/mockData';

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

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const [selectedDate, setSelectedDate] = useState(today);
    const [results, setResults] = useState<DispatchItemType[]>([]);
    const [searched, setSearched] = useState(false);

    const handleSearch = () => {
        setResults(MOCK_DISPATCHES);
        setSearched(true);
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
                    <View style={styles.dateInputWrapper}>
                        <IconSymbol name="calendar" size={20} color={colors.primary} />
                        <TextInput
                            mode="outlined"
                            value={selectedDate}
                            onChangeText={setSelectedDate}
                            placeholder="YYYY-MM-DD"
                            style={[styles.dateInput, { backgroundColor: 'transparent' }]}
                            outlineStyle={{ borderRadius: 10, borderColor: colors.border }}
                            contentStyle={{ paddingLeft: 8 }}
                            dense
                        />
                    </View>
                    <Button
                        mode="contained"
                        onPress={handleSearch}
                        style={[styles.searchBtn, { backgroundColor: colors.primary }]}
                        labelStyle={{ fontWeight: '600' }}
                    >
                        조회
                    </Button>
                </View>
            </View>

            {/* 결과 */}
            {!searched ? (
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
                        총 {results.length}건의 배차
                    </Text>
                    <FlatList
                        data={results}
                        renderItem={({ item }) => <DispatchCard item={item} />}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingBottom: 24 }}
                        showsVerticalScrollIndicator={false}
                    />
                </>
            )}
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
        fontSize: 14,
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
