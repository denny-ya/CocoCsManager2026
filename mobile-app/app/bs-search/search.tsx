import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, Alert, ScrollView, RefreshControl } from 'react-native';
import { Text, Surface, TextInput as PaperInput, Button, Chip } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { Header } from '@/components/Header';
import { EmptyState } from '@/components/EmptyState';
import { AppColors } from '@/constants/Colors';
import { searchBSRework } from '@/services/api';
import { BsSearchResult } from '@/services/mockData';
import { Skeleton } from '@/components/ui/Skeleton';

export default function BsSearchScreen() {
    const params = useLocalSearchParams();
    const serviceId = Number(params.serviceId ?? 0);
    const serviceName = params.serviceName as string ?? '서비스';

    // 강제 라이트 모드
    const colors = AppColors.light;

    const [keyword, setKeyword] = useState('');
    const [results, setResults] = useState<BsSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState('전체');

    const handleSearch = async () => {
        if (!keyword.trim()) {
            Alert.alert('알림', '차대번호를 입력해주세요.');
            return;
        }

        setLoading(true);
        setSearched(true);

        // 검색 시 기존 결과 초기화하지 않음 (스켈레톤 보여주기 위함)
        if (!refreshing) setResults([]);

        const response = await searchBSRework(serviceId, keyword);

        setLoading(false);

        if (response.success) {
            setResults(response.data);
        } else {
            Alert.alert('오류', response.message);
        }
    };

    const onRefresh = async () => {
        if (!searched) return;
        setRefreshing(true);
        await handleSearch();
        setRefreshing(false);
    };

    const filteredResults = useMemo(() => {
        if (statusFilter === '전체') return results;
        return results.filter(item => item.status === statusFilter);
    }, [results, statusFilter]);

    const filters = ['전체', '완료', '진행중', '대기'];

    return (
        <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
            <Header title={`${serviceName} 검색`} />

            {/* 검색 입력 영역 */}
            <View style={[styles.searchContainer, { backgroundColor: '#FFFFFF' }]}>
                <PaperInput
                    mode="outlined"
                    label="차대번호 입력"
                    value={keyword}
                    onChangeText={setKeyword}
                    style={styles.input}
                    right={<PaperInput.Icon icon="close-circle" onPress={() => setKeyword('')} />}
                    onSubmitEditing={handleSearch}
                />
                <Button
                    mode="contained"
                    onPress={handleSearch}
                    style={[styles.searchButton, { backgroundColor: colors.primary }]}
                    labelStyle={styles.searchButtonLabel}
                    disabled={loading && !refreshing}
                >
                    검색
                </Button>
            </View>

            {/* 필터 칩 영역 (검색된 상태에서만 표시) */}
            {searched && (
                <View style={styles.filterContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {filters.map((filter) => (
                            <Chip
                                key={filter}
                                selected={statusFilter === filter}
                                onPress={() => setStatusFilter(filter)}
                                style={[
                                    styles.chip,
                                    statusFilter === filter && { backgroundColor: colors.primaryLight }
                                ]}
                                textStyle={{ color: statusFilter === filter ? colors.primary : colors.textSecondary }}
                                showSelectedOverlay
                            >
                                {filter}
                            </Chip>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* 결과 영역 */}
            {loading && !refreshing ? (
                <View style={styles.listContent}>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <View key={i} style={styles.skeletonCard}>
                            <View style={styles.row}>
                                <Skeleton width={100} height={20} />
                                <Skeleton width={50} height={20} borderRadius={12} />
                            </View>
                            <Skeleton width={150} height={16} style={{ marginTop: 8 }} />
                            <Skeleton width={80} height={14} style={{ marginTop: 6 }} />
                        </View>
                    ))}
                </View>
            ) : !searched ? (
                <EmptyState
                    icon="magnifyingglass"
                    message="차대번호를 입력해주세요"
                    subMessage="검색 버튼을 누르면 실시간 데이터를 조회합니다."
                />
            ) : filteredResults.length === 0 ? (
                <EmptyState
                    icon="doc.text.fill"
                    message="검색 결과가 없습니다"
                    subMessage={statusFilter !== '전체' ? '해당 상태의 데이터가 없습니다.' : '입력한 차대번호를 다시 확인해주세요.'}
                />
            ) : (
                <FlatList
                    data={filteredResults}
                    renderItem={({ item }) => <ResultItem item={item} />}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                    }
                />
            )}
        </View>
    );
}

function ResultItem({ item }: { item: BsSearchResult }) {
    const colors = AppColors.light;

    const statusColor =
        item.status === '완료' ? colors.success :
            item.status === '진행중' ? colors.warning : colors.textSecondary;

    return (
        <Surface style={[styles.card, { backgroundColor: '#FFFFFF' }]} elevation={1}>
            <View style={styles.row}>
                <Text variant="titleSmall" style={{ color: colors.textPrimary, fontWeight: '700' }}>
                    {item.storeName || item.code}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
                </View>
            </View>
            <Text variant="bodyMedium" style={{ color: colors.textSecondary, marginTop: 4 }}>
                {item.model} · {item.symptom}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textSecondary, marginTop: 2 }}>
                {item.date}
            </Text>
        </Surface>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    searchContainer: {
        margin: 16,
        padding: 16,
        borderRadius: 16,
        elevation: 2,
    },
    input: {
        backgroundColor: 'transparent',
    },
    searchButton: {
        marginTop: 12,
        borderRadius: 8,
        paddingVertical: 2,
    },
    searchButtonLabel: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    filterContainer: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    chip: {
        marginRight: 8,
        backgroundColor: '#F5F5F5',
    },
    listContent: {
        paddingTop: 8,
        paddingBottom: 24,
    },
    card: {
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 14,
        padding: 16,
    },
    skeletonCard: {
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 14,
        padding: 16,
        backgroundColor: '#FFFFFF',
        elevation: 1,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
