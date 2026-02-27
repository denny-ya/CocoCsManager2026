import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { AppColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

type EmptyStateProps = {
    icon: IconSymbolName;
    message: string;
    subMessage?: string;
};

export function EmptyState({ icon, message, subMessage }: EmptyStateProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = AppColors[colorScheme];

    return (
        <View style={styles.container}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                <IconSymbol name={icon} size={48} color={colors.primary} />
            </View>
            <Text
                variant="titleMedium"
                style={[styles.message, { color: colors.textSecondary }]}
            >
                {message}
            </Text>
            {subMessage && (
                <Text
                    variant="bodyMedium"
                    style={[styles.subMessage, { color: colors.textSecondary }]}
                >
                    {subMessage}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 48,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    message: {
        textAlign: 'center',
        fontWeight: '600',
        marginBottom: 8,
    },
    subMessage: {
        textAlign: 'center',
        opacity: 0.7,
    },
});
