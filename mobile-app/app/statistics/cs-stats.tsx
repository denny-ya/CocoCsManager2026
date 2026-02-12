import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { Header } from '@/components/Header';
import { AppColors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function CsStatsScreen() {
    const colors = AppColors.light;

    const topDefects = [
        { id: 1, name: '냉각 불량', count: 42, percentage: 35 },
        { id: 2, name: '소음 발생', count: 28, percentage: 23 },
        { id: 3, name: '전원 불량', count: 15, percentage: 12 },
        { id: 4, name: '누수', count: 12, percentage: 10 },
        { id: 5, name: '기타 단순 문의', count: 23, percentage: 20 },
    ];

    return (
        <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
            <Header title="CS 통계" />
            <ScrollView contentContainerStyle={styles.content}>

                {/* 1. 요약 */}
                <View style={styles.headerRow}>
                    <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>2월 불량 유형 분석</Text>
                    <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>2026.02.01 ~ 02.12</Text>
                </View>

                {/* 2. Top 5 리스트 */}
                <Surface style={[styles.card, { backgroundColor: 'white' }]} elevation={1}>
                    <Text variant="titleMedium" style={styles.cardTitle}>🔥 주요 불량 Top 5</Text>

                    {topDefects.map((item, index) => (
                        <View key={item.id} style={styles.row}>
                            <View style={styles.rankBadge}>
                                <Text style={{ color: index < 3 ? 'white' : colors.textSecondary, fontWeight: 'bold' }}>{index + 1}</Text>
                                {/* Background logic inside style below */}
                                <View style={[
                                    StyleSheet.absoluteFill,
                                    {
                                        backgroundColor: index < 3 ? colors.primary : '#F5F5F5',
                                        borderRadius: 12,
                                        zIndex: -1
                                    }
                                ]} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text variant="bodyLarge" style={{ fontWeight: '600' }}>{item.name}</Text>
                                    <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{item.count}건</Text>
                                </View>
                                <View style={{ height: 6, backgroundColor: '#F5F5F5', borderRadius: 3, overflow: 'hidden' }}>
                                    <View style={{
                                        width: `${item.percentage}%`,
                                        height: '100%',
                                        backgroundColor: index === 0 ? colors.error : colors.primary
                                    }} />
                                </View>
                            </View>
                        </View>
                    ))}
                </Surface>

                {/* 3. 인사이트 */}
                <Surface style={[styles.insightCard, { backgroundColor: '#E3F2FD' }]} elevation={0}>
                    <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                        <IconSymbol name="lightbulb.fill" size={20} color={colors.primary} />
                        <Text variant="titleSmall" style={{ marginLeft: 8, color: colors.primary, fontWeight: 'bold' }}>INSIGHT</Text>
                    </View>
                    <Text variant="bodyMedium" style={{ lineHeight: 22, color: '#1565C0' }}>
                        지난달 대비 '냉각 불량' 건수가 <Text style={{ fontWeight: 'bold' }}>15% 증가</Text>했습니다.
                        주로 특정 모델(REF-G900S)에서 발생하고 있으니 부품 재고 확보가 필요합니다.
                    </Text>
                </Surface>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 16, paddingBottom: 32 },
    headerRow: {
        marginBottom: 24,
    },
    card: {
        padding: 24,
        borderRadius: 16,
        marginBottom: 24,
    },
    cardTitle: {
        fontWeight: 'bold',
        marginBottom: 24,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    rankBadge: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    insightCard: {
        padding: 20,
        borderRadius: 16,
    },
});
