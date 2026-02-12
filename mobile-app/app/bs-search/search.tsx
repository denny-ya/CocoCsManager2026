import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Surface, TextInput as PaperInput, Button, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { Header } from '@/components/Header';
import { EmptyState } from '@/components/EmptyState';
import { AppColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { searchBSRework } from '@/services/api';
import { BsSearchResult } from '@/services/mockData';

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

    const handleSearch = async () => {
        if (!keyword.trim()) {
            Alert.alert('알림', '차대번호를 입력해주세요.');
            return;
        }

        setLoading(true);
        setSearched(true);
        setResults([]); // Reset previous results

        const response = await searchBSRework(serviceId, keyword);

        setLoading(false);

        if (response.success) {
            setResults(response.data);
        } else {
            Alert.alert('오류', response.message);
        }
    };

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
                    loading={loading}
                    disabled={loading}
                >
                    검색
                </Button>
            </View>

            {/* 결과 영역 */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ marginTop: 16, color: colors.textSecondary }}>데이터를 조회하고 있습니다...</Text>
                </View>
            ) : !searched ? (
                <EmptyState
                    icon="magnifyingglass"
                    message="차대번호를 입력해주세요"
                    subMessage="검색 버튼을 누르면 실시간 데이터를 조회합니다."
                />
            ) : results.length === 0 ? (
                <EmptyState
                    icon="doc.text.fill"
                    message="검색 결과가 없습니다"
                    subMessage="입력한 차대번호를 다시 확인해주세요."
                />
            ) : (
                <FlatList
                    data={results}
                    renderItem={({ item }) => <ResultItem item={item} />}
                    keyExtractor={(item, index) => item.id || String(index)}
                    contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
                    showsVerticalScrollIndicator={false}
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
                    {item.storeName || item.code} {/* code가 있으면 표시, 없으면 storeName? mockData 참조 */}
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
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 14,
        padding: 16,
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
