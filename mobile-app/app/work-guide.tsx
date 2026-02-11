import { View, Text, StyleSheet } from 'react-native';

export default function WorkGuideScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>작업 가이드 화면</Text>
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
