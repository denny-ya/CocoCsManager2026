import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Button, Surface, IconButton } from 'react-native-paper';
import { AppColors } from '@/constants/Colors';

interface DatePickerModalProps {
    visible: boolean;
    onDismiss: () => void;
    onConfirm: (date: string) => void;
    initialDate?: string;
}

export function DatePickerModal({ visible, onDismiss, onConfirm, initialDate }: DatePickerModalProps) {
    const colors = AppColors.light;
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(initialDate || new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (initialDate) {
            setCurrentDate(new Date(initialDate));
            setSelectedDate(initialDate);
        }
    }, [initialDate, visible]);

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const generateDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = new Date(year, month, 1).getDay();

        const days = [];
        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }
        // Days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }
        return days;
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleSelectDay = (day: number) => {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        setSelectedDate(`${year}-${month}-${dayStr}`);
    };

    const handleConfirm = () => {
        onConfirm(selectedDate);
        onDismiss();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} onPress={onDismiss} />
                <Surface style={[styles.modalContent, { backgroundColor: '#FFFFFF' }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>날짜 선택</Text>
                        <IconButton icon="close" size={20} onPress={onDismiss} />
                    </View>

                    {/* Month Navigator */}
                    <View style={styles.monthNav}>
                        <IconButton icon="chevron-left" onPress={handlePrevMonth} />
                        <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                            {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                        </Text>
                        <IconButton icon="chevron-right" onPress={handleNextMonth} />
                    </View>

                    {/* Calendar Grid */}
                    <View style={styles.calendar}>
                        {/* Weekdays */}
                        <View style={styles.weekRow}>
                            {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                                <Text key={idx} style={[styles.weekDay, idx === 0 && { color: colors.error }]}>
                                    {day}
                                </Text>
                            ))}
                        </View>
                        {/* Days */}
                        <View style={styles.daysGrid}>
                            {generateDays().map((day, idx) => (
                                <View key={idx} style={styles.dayCell}>
                                    {day && (
                                        <TouchableOpacity
                                            style={[
                                                styles.dayButton,
                                                selectedDate === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` &&
                                                { backgroundColor: colors.primary }
                                            ]}
                                            onPress={() => handleSelectDay(day)}
                                        >
                                            <Text style={[
                                                styles.dayText,
                                                selectedDate === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` &&
                                                { color: 'white' }
                                            ]}>
                                                {day}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Button mode="contained" onPress={handleConfirm} style={{ backgroundColor: colors.primary, flex: 1 }}>
                            확인
                        </Button>
                    </View>
                </Surface>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 0 },
    monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
    calendar: { paddingHorizontal: 16 },
    weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    weekDay: { width: 40, textAlign: 'center', fontWeight: 'bold' },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: '14.28%', alignItems: 'center', marginBottom: 8 },
    dayButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    dayText: { fontSize: 16 },
    footer: { padding: 16, paddingTop: 8 },
});
