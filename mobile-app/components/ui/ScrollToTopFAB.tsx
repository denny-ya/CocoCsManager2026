import React from 'react';
import { StyleSheet, Animated } from 'react-native';
import { FAB } from 'react-native-paper';
import { AppColors } from '@/constants/Colors';

interface ScrollToTopFABProps {
    visible: boolean;
    onPress: () => void;
}

export function ScrollToTopFAB({ visible, onPress }: ScrollToTopFABProps) {
    const colors = AppColors.light;

    if (!visible) return null;

    return (
        <FAB
            icon="arrow-up"
            style={[styles.fab, { backgroundColor: colors.primary }]}
            color="white"
            onPress={onPress}
            mode="elevated"
            size="small"
        />
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        borderRadius: 30,
        elevation: 4,
    },
});
