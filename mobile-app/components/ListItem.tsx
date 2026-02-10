import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ListItemProps {
    title: string;
    description?: string;
    onPress?: () => void;
    showArrow?: boolean;
}

export default function ListItem({
    title,
    description,
    onPress,
    showArrow = true
}: ListItemProps) {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <View style={styles.content}>
                <Text style={styles.title}>{title}</Text>
                {description && (
                    <Text style={styles.description}>{description}</Text>
                )}
            </View>
            {showArrow && (
                <Ionicons name="chevron-forward" size={20} color="#999" />
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 8,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    description: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
});
