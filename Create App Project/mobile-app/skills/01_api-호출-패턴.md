# API 호출 패턴 (React Native 호환)
> 출처: [30-seconds-of-code](https://30secondsofcode.org) 기반, React Native/Expo 환경에 맞게 수정

---

## 1. useFetch 커스텀 훅

API 호출을 선언적으로 처리하는 훅. 로딩/에러/데이터 상태를 자동 관리합니다.

```typescript
import { useState, useEffect, useCallback } from 'react';

interface FetchState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function useFetch<T>(url: string, options?: RequestInit) {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    error: null,
    loading: true,
  });

  const refetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setState({ data: json, error: null, loading: false });
    } catch (err) {
      setState({
        data: null,
        error: err instanceof Error ? err.message : '알 수 없는 오류',
        loading: false,
      });
    }
  }, [url]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...state, refetch };
}
```

### 사용 예시
```tsx
function SearchScreen() {
  const { data, loading, error, refetch } = useFetch<SearchResult[]>(
    `${API_URL}?action=search&keyword=HYM`
  );

  if (loading) return <ActivityIndicator />;
  if (error) return <Text>에러: {error}</Text>;
  return <FlatList data={data} ... />;
}
```

### 적용 시점
- 화면 진입 시 자동으로 데이터를 불러와야 할 때
- 여러 화면에서 API 호출 패턴이 반복될 때

---

## 2. fetchWithTimeout — Promise 타임아웃

GAS API가 응답하지 않을 때 무한 대기를 방지합니다.

```typescript
export function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<Response> {
  return Promise.race([
    fetch(url, options),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('요청 시간이 초과되었습니다.')), timeoutMs)
    ),
  ]);
}
```

### 사용 예시
```typescript
try {
  const res = await fetchWithTimeout(gasUrl, {}, 8000); // 8초 타임아웃
  const data = await res.json();
} catch (err) {
  // '요청 시간이 초과되었습니다.' 에러 처리
}
```

### 적용 시점
- GAS API 호출 시 (GAS 자체 30초 제한 + 네트워크 불안정 대비)
- Phase 6 다른 화면 데이터 연동 시

---

## 3. fetchWithRetry — 재시도 로직

네트워크 실패 시 자동으로 재시도합니다.

```typescript
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetchWithTimeout(url, options);
      if (res.ok) return res;
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, delayMs * (i + 1))); // 점진적 지연
    }
  }
  throw new Error('최대 재시도 횟수 초과');
}
```

### 적용 시점
- 모바일 환경에서 네트워크 불안정 시
- 중요한 데이터 조회(배차 목록, 실적 등)에서 안정성 확보
