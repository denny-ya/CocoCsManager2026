import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { Header } from '@/components/Header';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { AppColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MOCK_GUIDES, GuideItem } from '@/services/mockData';

// Android에서 LayoutAnimation 활성화
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// 가이드 아이콘 매핑
const GUIDE_ICONS: Record<string, IconSymbolName> = {
    description: 'doc.text.fill',
    build: 'wrench.fill',
    handyman: 'wrench.fill',
    people: 'person.2.fill',
    security: 'shield.fill',
};

const GUIDE_COLORS = ['#1565C0', '#2E7D32', '#E65100', '#6A1B9A', '#00838F'];

// 아코디언 아이템
function GuideAccordion({
    item,
    index,
    isExpanded,
    onToggle,
}: {
    item: GuideItem;
    index: number;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const colors = AppColors.light;
    const accentColor = GUIDE_COLORS[index % GUIDE_COLORS.length];
    const iconName = GUIDE_ICONS[item.icon] || 'info.circle.fill';

    return (
        <Surface
            style={[accStyles.card, { backgroundColor: '#FFFFFF' }]}
            elevation={isExpanded ? 2 : 1}
        >
            <TouchableOpacity
                style={accStyles.header}
                onPress={onToggle}
                activeOpacity={0.7}
            >
                <View style={[accStyles.iconContainer, { backgroundColor: accentColor + '15' }]}>
                    <IconSymbol name={iconName} size={22} color={accentColor} />
                </View>
                <Text
                    variant="titleSmall"
                    style={[accStyles.title, { color: colors.textPrimary }]}
                >
                    {item.title}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 18 }}>
                    {isExpanded ? '▲' : '▼'}
                </Text>
            </TouchableOpacity>

            {isExpanded && (
                <View style={[accStyles.contentArea, { borderTopColor: colors.border }]}>
                    {item.content.split('\n').map((line, idx) => (
                        <View key={idx} style={accStyles.contentLine}>
                            <View style={[accStyles.bullet, { backgroundColor: accentColor }]} />
                            <Text
                                variant="bodyMedium"
                                style={[accStyles.contentText, { color: colors.textPrimary }]}
                            >
                                {line.replace(/^\d+\.\s*/, '')}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </Surface>
    );
}

const accStyles = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 14,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    title: {
        flex: 1,
        fontWeight: '700',
    },
    contentArea: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderTopWidth: 1,
        paddingTop: 12,
    },
    contentLine: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 7,
        marginRight: 10,
    },
    contentText: {
        flex: 1,
        lineHeight: 20,
    },
});

export default function WorkGuideScreen() {
    // 강제 라이트 모드
    const colors = AppColors.light;
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
            <Header title="업무 가이드" />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Text variant="bodyMedium" style={[styles.intro, { color: colors.textSecondary }]}>
                    업무 수행에 필요한 가이드 문서입니다. 항목을 터치하면 상세 내용을 확인할 수 있습니다.
                </Text>

                {MOCK_GUIDES.map((guide, index) => (
                    <GuideAccordion
                        key={guide.id}
                        item={guide}
                        index={index}
                        isExpanded={expandedId === guide.id}
                        onToggle={() => toggleExpand(guide.id)}
                    />
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 16,
        paddingBottom: 32,
    },
    intro: {
        marginHorizontal: 20,
        marginBottom: 16,
        lineHeight: 20,
    },
});
