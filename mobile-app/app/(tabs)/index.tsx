import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>홈 화면</Text>
            <Text style={styles.subtitle}>앱에 오신 것을 환영합니다!</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
});
