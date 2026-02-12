import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Header } from '@/components/Header';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { AppColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SubMenuCardProps = {
    title: string;
    description: string;
    icon: IconSymbolName;
    iconColor: string;
    onPress: () => void;
};

function SubMenuCard({ title, description, icon, iconColor, onPress }: SubMenuCardProps) {
    const colors = AppColors.light;

    return (
        <Surface style={[cardStyles.card, { backgroundColor: '#FFFFFF' }]} elevation={2}>
            <TouchableOpacity style={cardStyles.touchable} onPress={onPress} activeOpacity={0.7}>
                <View style={[cardStyles.iconContainer, { backgroundColor: iconColor + '15' }]}>
                    <IconSymbol name={icon} size={32} color={iconColor} />
                </View>
                <View style={cardStyles.textArea}>
                    <Text variant="titleMedium" style={[cardStyles.title, { color: colors.textPrimary }]}>
                        {title}
                    </Text>
                    <Text variant="bodyMedium" style={[cardStyles.description, { color: colors.textSecondary }]}>
                        {description}
                    </Text>
                </View>
                <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
        </Surface>
    );
}

const cardStyles = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
    },
    touchable: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textArea: {
        flex: 1,
    },
    title: {
        fontWeight: '700',
        marginBottom: 4,
    },
    description: {
        opacity: 0.7,
    },
});

export default function StatisticsScreen() {
    const router = useRouter();
    // 강제 라이트 모드
    const colors = AppColors.light;

    return (
        <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
            <Header title="실적 및 통계" />

            <View style={styles.content}>
                <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    카테고리 선택
                </Text>

                <SubMenuCard
                    title="AS 실적"
                    description="AS 서비스 실적 데이터를 조회합니다"
                    icon="chart.bar.fill"
                    iconColor="#2E7D32"
                    onPress={() => {
                        router.push('/statistics/as-performance');
                    }}
                />

                <SubMenuCard
                    title="CS 통계"
                    description="CS 서비스 통계를 확인합니다"
                    icon="chart.line.uptrend.xyaxis"
                    iconColor="#1565C0"
                    onPress={() => {
                        router.push('/statistics/cs-stats');
                    }}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingTop: 24,
    },
    sectionTitle: {
        marginHorizontal: 20,
        marginBottom: 16,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
});
