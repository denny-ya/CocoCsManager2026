import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, ProgressBar } from 'react-native-paper';
import { Header } from '@/components/Header';
import { AppColors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function AsPerformanceScreen() {
    const colors = AppColors.light;

    const stats = {
        total: 125,
        completed: 98,
        pending: 15,
        processing: 12,
    };

    const completionRate = stats.completed / stats.total;

    return (
        <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
            <Header title="AS 실적" />
            <ScrollView contentContainerStyle={styles.content}>

                {/* 1. 요약 카드 */}
                <Surface style={[styles.summaryCard, { backgroundColor: colors.primary }]} elevation={4}>
                    <Text variant="titleMedium" style={{ color: 'rgba(255,255,255,0.8)' }}>이번 달 전체 접수</Text>
                    <Text variant="displayMedium" style={{ color: 'white', fontWeight: 'bold' }}>{stats.total}건</Text>
                    <View style={styles.rateRow}>
                        <IconSymbol name="checkmark.circle.fill" size={20} color="white" />
                        <Text style={{ color: 'white', marginLeft: 8 }}>완료율 {(completionRate * 100).toFixed(1)}%</Text>
                    </View>
                </Surface>

                {/* 2. 상태별 현황 */}
                <View style={styles.grid}>
                    <StatusCard label="처리 완료" value={stats.completed} color={colors.success} icon="checkmark.circle.fill" />
                    <StatusCard label="진행 중" value={stats.processing} color={colors.warning} icon="hammer.fill" />
                    <StatusCard label="대기" value={stats.pending} color={colors.error} icon="clock.fill" />
                    <StatusCard label="이월" value={0} color={colors.textSecondary} icon="arrow.forward.circle.fill" />
                </View>

                {/* 3. 목표 달성도 */}
                <Surface style={[styles.card, { backgroundColor: 'white' }]} elevation={1}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 16 }}>이달의 목표 달성도</Text>

                    <View style={styles.progressRow}>
                        <View style={styles.progressLabel}>
                            <Text variant="bodyMedium">완료 건수</Text>
                            <Text variant="bodySmall" style={{ color: colors.textSecondary }}>목표 120건</Text>
                        </View>
                        <ProgressBar progress={0.8} color={colors.primary} style={styles.progressBar} />
                        <Text variant="bodyMedium" style={{ marginTop: 4, textAlign: 'right' }}>81%</Text>
                    </View>

                    <View style={[styles.progressRow, { marginTop: 24 }]}>
                        <View style={styles.progressLabel}>
                            <Text variant="bodyMedium">고객 만족도</Text>
                            <Text variant="bodySmall" style={{ color: colors.textSecondary }}>목표 4.8점</Text>
                        </View>
                        <ProgressBar progress={0.95} color={colors.secondary} style={styles.progressBar} />
                        <Text variant="bodyMedium" style={{ marginTop: 4, textAlign: 'right' }}>4.9점</Text>
                    </View>
                </Surface>

            </ScrollView>
        </View>
    );
}

function StatusCard({ label, value, color, icon }: { label: string, value: number, color: string, icon: any }) {
    return (
        <Surface style={[styles.statusCard, { backgroundColor: 'white' }]} elevation={1}>
            <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
                <IconSymbol name={icon} size={24} color={color} />
            </View>
            <Text variant="displaySmall" style={{ fontWeight: 'bold', color: '#212121', marginTop: 12 }}>{value}</Text>
            <Text variant="bodyMedium" style={{ color: '#757575' }}>{label}</Text>
        </Surface>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 16, paddingBottom: 32 },
    summaryCard: {
        padding: 24,
        borderRadius: 20,
        marginBottom: 24,
    },
    rateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 24,
    },
    statusCard: {
        width: '48%',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        padding: 24,
        borderRadius: 16,
    },
    progressRow: {
        marginBottom: 8,
    },
    progressLabel: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        alignItems: 'flex-end',
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F5F5F5',
    },
});
