import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useState } from 'react';

export default function SearchScreen() {
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.searchInput}
                placeholder="검색어를 입력하세요..."
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
            <View style={styles.resultContainer}>
                <Text style={styles.resultText}>
                    {searchQuery ? `"${searchQuery}" 검색 중...` : '검색어를 입력해주세요'}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        padding: 16,
    },
    searchInput: {
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 8,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    resultContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resultText: {
        fontSize: 16,
        color: '#666',
    },
});
