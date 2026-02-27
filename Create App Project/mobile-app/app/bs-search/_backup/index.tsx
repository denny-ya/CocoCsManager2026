import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Header } from '@/components/Header';
import { AppColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ServiceSelectScreen() {
    const router = useRouter();
    // 강제 라이트 모드 (다크모드 제거)
    const colors = AppColors.light;

    const services = [
        { id: 0, name: '서비스1', icon: 'person.fill', color: '#4CAF50' },
        { id: 1, name: '서비스2', icon: 'person.fill', color: '#2196F3' },
        { id: 2, name: '서비스3', icon: 'person.fill', color: '#FF9800' },
        { id: 3, name: '서비스4', icon: 'person.fill', color: '#9C27B0' },
    ];

    return (
        <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
            <Header title="서비스 선택" />

            <ScrollView contentContainerStyle={styles.content}>
                <Text variant="titleMedium" style={[styles.guideText, { color: colors.textSecondary }]}>
                    검색할 서비스를 선택해주세요.
                </Text>

                <View style={styles.grid}>
                    {services.map((service) => (
                        <ServiceCard
                            key={service.id}
                            name={service.name}
                            icon={service.icon}
                            color={service.color}
                            onPress={() => router.push({
                                pathname: '/bs-search/search',
                                params: { serviceId: service.id, serviceName: service.name }
                            })}
                        />
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

function ServiceCard({ name, icon, color, onPress }: { name: string, icon: any, color: string, onPress: () => void }) {
    const colors = AppColors.light;

    return (
        <Surface style={[styles.card, { backgroundColor: '#FFFFFF' }]} elevation={2}>
            <TouchableOpacity style={styles.touchable} onPress={onPress} activeOpacity={0.7}>
                <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                    <IconSymbol name={icon} size={32} color={color} />
                </View>
                <Text variant="titleMedium" style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    {name}
                </Text>
            </TouchableOpacity>
        </Surface>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20 },
    guideText: { marginBottom: 20, textAlign: 'center' },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 16,
    },
    card: {
        width: '47%', // 2-column layout
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
    },
    touchable: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontWeight: 'bold',
    },
});
