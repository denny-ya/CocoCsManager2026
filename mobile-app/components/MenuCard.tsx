import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';

type MenuCardProps = {
    title: string;
    description?: string;
    icon: IconSymbolName;
    onPress: () => void;
    color?: string;
};

export function MenuCard({ title, description, icon, onPress, color }: MenuCardProps) {
    // 테마 컬러 설정
    const primaryColor = color || '#0051A2';
    const backgroundColor = '#F5F5F5'; // 카드 배경 (약간 회색)
    const textColor = '#212121';
    const subTextColor = '#757575';

    return (
        <Surface style={[styles.card, { backgroundColor }]} elevation={1}>
            <TouchableOpacity
                style={styles.touchable}
                onPress={onPress}
                activeOpacity={0.7}
            >
                {/* 왼쪽 컬러 바 */}
                <View style={[styles.leftBar, { backgroundColor: primaryColor }]} />

                {/* 컨텐츠 영역 */}
                <View style={styles.contentContainer}>
                    {/* 아이콘 */}
                    <View style={styles.iconContainer}>
                        <IconSymbol size={32} name={icon} color={primaryColor} />
                    </View>

                    {/* 텍스트 */}
                    <View style={styles.textContainer}>
                        <Text variant="titleMedium" style={[styles.title, { color: textColor }]}>
                            {title}
                        </Text>
                        {description && (
                            <Text variant="bodySmall" style={[styles.subtitle, { color: subTextColor }]}>
                                {description}
                            </Text>
                        )}
                    </View>

                    {/* 오른쪽 화살표 */}
                    <IconSymbol size={20} name="chevron.right" color="#9E9E9E" />
                </View>
            </TouchableOpacity>
        </Surface>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        borderRadius: 12, // 둥근 모서리
        overflow: 'hidden',
        marginBottom: 12,
        backgroundColor: '#FFFFFF',
    },
    touchable: {
        flexDirection: 'row',
        height: 80, // 카드 높이
        alignItems: 'center',
    },
    leftBar: {
        width: 6, // 왼쪽 컬러 바 두께
        height: '100%',
    },
    contentContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontWeight: '700',
        fontSize: 16,
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 12,
    },
});
