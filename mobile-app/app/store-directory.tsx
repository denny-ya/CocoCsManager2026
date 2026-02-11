import { View, Text, StyleSheet } from 'react-native';

export default function StoreDirectoryScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>매장 디렉토리 화면</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 20,
    },
});
