import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { useState } from 'react';

export default function SettingsScreen() {
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [darkModeEnabled, setDarkModeEnabled] = useState(false);

    return (
        <View style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>설정</Text>

                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>알림</Text>
                    <Switch
                        value={notificationsEnabled}
                        onValueChange={setNotificationsEnabled}
                    />
                </View>

                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>다크 모드</Text>
                    <Switch
                        value={darkModeEnabled}
                        onValueChange={setDarkModeEnabled}
                    />
                </View>

                <TouchableOpacity style={styles.button}>
                    <Text style={styles.buttonText}>로그아웃</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.version}>버전 1.0.0</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        padding: 16,
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    settingLabel: {
        fontSize: 16,
    },
    button: {
        backgroundColor: '#FF3B30',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    version: {
        textAlign: 'center',
        marginTop: 24,
        color: '#999',
    },
});
