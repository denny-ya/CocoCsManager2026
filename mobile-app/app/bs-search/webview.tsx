import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { Header } from '@/components/Header';
import { AppColors } from '@/constants/Colors';

// WebView는 네이티브 전용, 웹에서는 iframe 사용
let WebView: any = null;
if (Platform.OS !== 'web') {
    WebView = require('react-native-webview').default;
}

const SERVICE_URLS = [
    'https://script.google.com/macros/s/AKfycbx8UbNnZZMlCLluigXJqfjRPq7n7DOgd7DHgCaJzExP_VvqCtKzkMXlVENHwokRnSr6sQ/exec',
    'https://script.google.com/macros/s/AKfycbykccCJv60OF-lkyoohL1b8BKmb5_2jfg2AxKAHh3YwjYWzAyA6eSTn7cLEN8-m5F-T/exec',
    'https://script.google.com/macros/s/AKfycbyYoKqyYVO1ramISnKkjoAAr-faxG-p-1gkGyhBm2yxhFlye073Fsm5BCEBONGr6hQa_g/exec',
    'https://script.google.com/macros/s/AKfycby9p_1-2ER9DtYIqq_-zge_vGAhHgtmy1HDnAvb1NqviEXVO7F53f0oyxnagHCTm2bg/exec',
];

export default function BsWebViewScreen() {
    const params = useLocalSearchParams();
    const serviceId = Number(params.serviceId ?? 0);
    const serviceName = (params.serviceName as string) ?? '서비스';
    const colors = AppColors.light;

    const [loading, setLoading] = useState(true);
    const url = SERVICE_URLS[serviceId] || SERVICE_URLS[0];

    return (
        <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
            <Header title={`${serviceName} 검색`} />

            {/* 로딩 인디케이터 */}
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
                        웹앱을 불러오는 중...
                    </Text>
                </View>
            )}

            {/* 플랫폼별 분기 */}
            {Platform.OS === 'web' ? (
                <iframe
                    src={url}
                    style={{
                        flex: 1,
                        width: '100%',
                        height: '100%',
                        border: 'none',
                    }}
                    onLoad={() => setLoading(false)}
                    title={serviceName}
                />
            ) : WebView ? (
                <WebView
                    source={{ uri: url }}
                    style={styles.webview}
                    onLoadEnd={() => setLoading(false)}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={false}
                    scalesPageToFit={true}
                />
            ) : (
                <View style={styles.loadingOverlay}>
                    <Text style={{ color: colors.textSecondary }}>
                        WebView를 사용할 수 없습니다.
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    webview: {
        flex: 1,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        zIndex: 10,
    },
});
