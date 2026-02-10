import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    onSearch?: () => void;
}

export default function SearchBar({
    value,
    onChangeText,
    placeholder = '검색어를 입력하세요',
    onSearch
}: SearchBarProps) {
    return (
        <View style={styles.container}>
            <Ionicons name="search" size={20} color="#666" style={styles.icon} />
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#999"
                returnKeyType="search"
                onSubmitEditing={onSearch}
            />
            {value.length > 0 && (
                <TouchableOpacity onPress={() => onChangeText('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    icon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
});
