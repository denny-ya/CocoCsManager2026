import React from 'react';
import { TouchableOpacity, StyleSheet, View, Dimensions } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// 화면 너비의 절반에서 여백을 뺀 크기 (2열 그리드용)
const padding = 16;
const cardWidth = (Dimensions.get('window').width - (padding * 3)) / 2;

type MenuCardProps = {
    title: string;
    icon: IconSymbolName;
    onPress: () => void;
    color?: string; // 아이콘/포인트 컬러 (기본값: Primary)
};

export function MenuCard({ title, icon, onPress, color }: MenuCardProps) {
    const colorScheme = useColorScheme();

    // 테마 컬러 설정
    const primaryColor = color || '#0051A2'; // 로고 Primary
    const backgroundColor = '#FFFFFF'; // 화이트 배경
    const iconBackgroundColor = '#E3F2FD'; // 연한 파랑 배경
    const textColor = '#212121'; // 다크 그레이 텍스트

    return (
        <Surface style={[styles.card, { backgroundColor }]} elevation={2}>
            <TouchableOpacity
                style={styles.touchable}
                onPress={onPress}
                activeOpacity={0.7}
            >
                {/* 아이콘 영역 */}
                <View style={[styles.iconContainer, { backgroundColor: iconBackgroundColor }]}>
                    <IconSymbol size={28} name={icon} color={primaryColor} />
                </View>

                {/* 텍스트 영역 */}
                <View style={styles.textContainer}>
                    <Text variant="titleMedium" style={[styles.title, { color: textColor }]}>
                        {title}
                    </Text>
                </View>
            </TouchableOpacity>
        </Surface>
    );
}

const styles = StyleSheet.create({
    card: {
        width: cardWidth,
        aspectRatio: 1, // 정사각형 비율
        borderRadius: 20, // 둥근 모서리 (사진 참고)
        overflow: 'hidden',
        marginBottom: 16,
    },
    touchable: {
        flex: 1,
        padding: 16,
        justifyContent: 'space-between',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14, // 아이콘 배경도 둥글게
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        marginTop: 12,
    },
    title: {
        fontWeight: '700',
        fontSize: 16,
        lineHeight: 22,
    },
});
