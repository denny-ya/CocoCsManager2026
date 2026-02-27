import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { WebLayout } from '@/components/WebLayout';

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  const colorScheme = 'light'; // 강제 라이트 모드
  const paperTheme = MD3LightTheme;

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={DefaultTheme}>
        <WebLayout>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} />
            <Stack.Screen name="bs-search/index" />
            <Stack.Screen name="bs-search/search" />
            <Stack.Screen name="statistics" />
            <Stack.Screen name="store-directory" />
            <Stack.Screen name="dispatch" />
            <Stack.Screen name="work-guide" />
          </Stack>
          <StatusBar style="light" />
        </WebLayout>
      </ThemeProvider>
    </PaperProvider>
  );
}

