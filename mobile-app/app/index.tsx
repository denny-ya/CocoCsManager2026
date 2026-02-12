import { StyleSheet, View, FlatList, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MenuCard } from '@/components/MenuCard';
import { IconSymbolName } from '@/components/ui/icon-symbol';

// 메뉴 데이터 정의
const MENU_ITEMS: { id: string; title: string; description: string; icon: IconSymbolName; route: string }[] = [
  { id: '1', title: '[검색] BS 및 리워크', description: '검색을 통한 업무 조회', icon: 'magnifyingglass', route: '/bs-search' },
  { id: '2', title: '실적 및 통계', description: '일일/월간 실적 대시보드', icon: 'chart.bar.fill', route: '/statistics' },
  { id: '3', title: '영업점 주소록', description: '전국 영업점 및 지사 연락처', icon: 'map.fill', route: '/store-directory' },
  { id: '4', title: '배차 목록', description: '실시간 배차 및 이동 현황', icon: 'truck.fill', route: '/dispatch' },
  { id: '5', title: '업무 가이드', description: '표준 업무 절차 및 매뉴얼', icon: 'book.fill', route: '/work-guide' },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* 커스텀 헤더 영역 (SafeAreaView와 별도로 배경색 적용 위함) */}
      <View style={styles.headerBackground}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={styles.headerContent}>
            <View>
              <Text variant="headlineSmall" style={styles.headerTitle}>Coco CS Manager</Text>
              <Text variant="bodyMedium" style={styles.headerSubtitle}>반갑습니다, 관리자님!</Text>
            </View>
            {/* 프로필 아이콘 자리 (임시) */}
            <View style={styles.profileIcon} />
          </View>
        </SafeAreaView>
      </View>

      {/* 메인 컨텐츠 (리스트) */}
      <View style={styles.content}>
        <FlatList
          data={MENU_ITEMS}
          renderItem={({ item }) => (
            <MenuCard
              title={item.title}
              description={item.description}
              icon={item.icon}
              onPress={() => router.push(item.route as any)}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // 전체 배경 화이트
  },
  headerBackground: {
    backgroundColor: '#0051A2', // Primary Color
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#E3F2FD', // Primary Light
    marginTop: 4,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    flex: 1,
    paddingTop: 24,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});
