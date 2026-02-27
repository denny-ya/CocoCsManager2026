import React from 'react';
import { View, StyleSheet, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { StackActions } from '@react-navigation/native';

type HeaderProps = {
    title: string;
    showBack?: boolean;
    showHome?: boolean;
};

export function Header({ title, showBack = true, showHome = true }: HeaderProps) {
    const router = useRouter();
    const navigation = useNavigation();
    // 강제 라이트 모드
    const colors = AppColors.light;

    const handleHomePress = () => {
        // 스택의 최상위(홈)로 이동
        navigation.dispatch(StackActions.popToTop());
    };

    return (
        <View style={[styles.headerBackground, { backgroundColor: colors.primary }]}>
            <SafeAreaView edges={['top']} style={styles.safeArea}>
                <View style={styles.headerContent}>
                    {/* 뒤로가기 버튼 */}
                    {showBack ? (
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.iconButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <IconSymbol name="chevron.left" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.iconPlaceholder} />
                    )}

                    {/* 제목 */}
                    <Text variant="titleLarge" style={styles.title} numberOfLines={1}>
                        {title}
                    </Text>

                    {/* 홈 버튼 */}
                    {showHome ? (
                        <TouchableOpacity
                            onPress={handleHomePress}
                            style={styles.iconButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <IconSymbol name="house.fill" size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.iconPlaceholder} />
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    headerBackground: {
        paddingBottom: 16,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    safeArea: {
        backgroundColor: 'transparent',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 8 : 4,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconPlaceholder: {
        width: 40,
        height: 40,
    },
    title: {
        color: '#FFFFFF',
        fontWeight: '700',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 8,
    },
});
