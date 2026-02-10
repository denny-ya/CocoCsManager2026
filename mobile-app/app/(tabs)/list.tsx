import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

// 샘플 데이터
const sampleData = [
    { id: '1', title: '항목 1', description: '첫 번째 항목입니다' },
    { id: '2', title: '항목 2', description: '두 번째 항목입니다' },
    { id: '3', title: '항목 3', description: '세 번째 항목입니다' },
];

export default function ListScreen() {
    const renderItem = ({ item }: { item: typeof sampleData[0] }) => (
        <TouchableOpacity style={styles.listItem}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemDescription}>{item.description}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={sampleData}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    listContainer: {
        padding: 16,
    },
    listItem: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    itemTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    itemDescription: {
        fontSize: 14,
        color: '#666',
    },
});
