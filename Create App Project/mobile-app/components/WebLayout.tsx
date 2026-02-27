import React from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';

export function WebLayout({ children }: { children: React.ReactNode }) {
    if (Platform.OS === 'web') {
        return (
            <View style={styles.container}>
                <View style={styles.content}>
                    {children}
                </View>
            </View>
        );
    }
    return <>{children}</>;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#333', // Dark background for the "area outside phone"
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        width: '100%',
        maxWidth: 480, // Max width for mobile simulation
        height: '100%',
        backgroundColor: '#fff',

        // Optional: Add shadow/border to look like a phone
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
});
