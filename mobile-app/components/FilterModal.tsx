import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FilterOption {
    id: string;
    label: string;
    selected: boolean;
}

interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    options: FilterOption[];
    onOptionToggle: (id: string) => void;
    onApply: () => void;
    onReset: () => void;
}

export default function FilterModal({
    visible,
    onClose,
    options,
    onOptionToggle,
    onApply,
    onReset,
}: FilterModalProps) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>필터</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        {options.map((option) => (
                            <TouchableOpacity
                                key={option.id}
                                style={styles.optionItem}
                                onPress={() => onOptionToggle(option.id)}
                            >
                                <Text style={styles.optionLabel}>{option.label}</Text>
                                <Ionicons
                                    name={option.selected ? 'checkbox' : 'square-outline'}
                                    size={24}
                                    color={option.selected ? '#007AFF' : '#999'}
                                />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.resetButton} onPress={onReset}>
                            <Text style={styles.resetButtonText}>초기화</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.applyButton} onPress={onApply}>
                            <Text style={styles.applyButtonText}>적용</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        padding: 16,
    },
    optionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    optionLabel: {
        fontSize: 16,
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    resetButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        alignItems: 'center',
    },
    resetButtonText: {
        fontSize: 16,
        color: '#666',
    },
    applyButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        backgroundColor: '#007AFF',
        alignItems: 'center',
    },
    applyButtonText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
});
