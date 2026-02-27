import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Linking } from 'react-native';
import { Text, Surface, Searchbar } from 'react-native-paper';
import { Header } from '@/components/Header';
import { EmptyState } from '@/components/EmptyState';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MOCK_STORES, StoreInfo } from '@/services/mockData';

// 영업점 아이템 컴포넌트
function StoreItem({ item }: { item: StoreInfo }) {
    const colors = AppColors.light;

    const handleCall = () => {
        Linking.openURL(`tel:${item.phone}`);
    };

    return (
        <Surface style={[itemStyles.card, { backgroundColor: '#FFFFFF' }]} elevation={1}>
            <View style={itemStyles.content}>
                <View style={[itemStyles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                    <IconSymbol name="map.fill" size={20} color={colors.primary} />
                </View>
                <View style={itemStyles.info}>
                    <Text variant="titleSmall" style={{ color: colors.textPrimary, fontWeight: '700' }}>
                        {item.name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: colors.textSecondary, marginTop: 2 }}>
                        {item.address}
                    </Text>
                    <Text variant="bodySmall" style={{ color: colors.secondary, marginTop: 2 }}>
                        📞 {item.phone}
                    </Text>
                </View>
                <TouchableOpacity onPress={handleCall} style={[itemStyles.callButton, { backgroundColor: colors.success + '15' }]}>
                    <IconSymbol name="phone.fill" size={18} color={colors.success} />
                </TouchableOpacity>
            </View>
        </Surface>
    );
}

const itemStyles = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 14,
        padding: 14,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    info: {
        flex: 1,
    },
    callButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default function StoreDirectoryScreen() {
    // 강제 라이트 모드
    const colors = AppColors.light;
    const [searchQuery, setSearchQuery] = useState('');

    const filteredStores = useMemo(() => {
        if (!searchQuery.trim()) return MOCK_STORES;
        const query = searchQuery.trim().toLowerCase();
        return MOCK_STORES.filter(
            (store) =>
                store.name.toLowerCase().includes(query) ||
                store.address.toLowerCase().includes(query) ||
                store.region.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    return (
        <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
            <Header title="영업점 주소 검색" />

            {/* 검색바 */}
            <View style={styles.searchContainer}>
                <Searchbar
                    placeholder="영업점 검색 (예: 가락점)"
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={[styles.searchbar, { backgroundColor: '#F5F5F5' }]}
                    inputStyle={{ color: colors.textPrimary }}
                    iconColor={colors.textSecondary}
                    placeholderTextColor={colors.textSecondary}
                />
            </View>

            {/* 결과 카운트 */}
            {searchQuery.trim() !== '' && (
                <Text variant="bodySmall" style={[styles.resultCount, { color: colors.textSecondary }]}>
                    검색 결과: {filteredStores.length}건
                </Text>
            )}

            {/* 결과 리스트 */}
            {filteredStores.length === 0 ? (
                <EmptyState
                    icon="map.fill"
                    message="검색 결과가 없습니다"
                    subMessage="다른 검색어로 다시 시도해보세요."
                />
            ) : (
                <FlatList
                    data={filteredStores}
                    renderItem={({ item }) => <StoreItem item={item} />}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingTop: 4, paddingBottom: 24 }}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    searchbar: {
        borderRadius: 14,
        elevation: 0,
    },
    resultCount: {
        marginHorizontal: 20,
        marginBottom: 8,
    },
});
