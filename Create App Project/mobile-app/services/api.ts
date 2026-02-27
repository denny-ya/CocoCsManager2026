import { VehicleData } from './mockData';

// ── 앱 전용 GAS API URL ──
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://script.google.com/macros/s/AKfycbyyeVxmzpurJIgWll33h8vyMHkgPnAd-f6msN_Ay8oVh4hQQ5Vc_JtdLvakMBKwlEd4cg/exec';

export interface SearchResponse {
    success: boolean;
    data: VehicleData[];
    message?: string;
}

export interface MasterStatsResponse {
    success: boolean;
    data: any;
    message?: string;
}

/**
 * GAS API 호출 공통 함수
 * GAS 웹앱은 302 리다이렉트를 거치므로 redirect: 'follow' 필수
 */
async function callGasApi(params: Record<string, string>): Promise<any> {
    const urlParams = new URLSearchParams({ mode: 'api', ...params });
    const fetchUrl = `${API_BASE_URL}?${urlParams.toString()}`;
    console.log(`[API] Fetching: ${fetchUrl}`);

    const response = await fetch(fetchUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: { 'Accept': 'application/json' },
    });

    // GAS 리다이렉트 후 응답 텍스트 가져오기
    const text = await response.text();
    console.log(`[API] Response (${text.length} chars):`, text.substring(0, 200));

    // HTML이 반환된 경우 (CORS/리다이렉트 문제)
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
        throw new Error('API가 HTML을 반환했습니다. CORS 문제일 수 있습니다. 실기기에서 테스트해주세요.');
    }

    return JSON.parse(text);
}

/**
 * BS 및 리워크 통합 검색
 */
export async function searchBS(keyword: string, part: string = ''): Promise<SearchResponse> {
    try {
        const data = await callGasApi({
            action: 'search',
            keyword: keyword,
            part: part,
        });

        if (data.error) throw new Error(data.error);

        if (Array.isArray(data)) {
            return { success: true, data };
        } else if (data.result && Array.isArray(data.result)) {
            return { success: true, data: data.result };
        } else {
            return { success: true, data: [] };
        }
    } catch (error) {
        console.error('[API Error]', error);
        return {
            success: false,
            data: [],
            message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
        };
    }
}

/**
 * 마스터 통계 조회
 */
export async function getMasterStats(master: string, part: string = ''): Promise<MasterStatsResponse> {
    try {
        const data = await callGasApi({
            action: 'masterStats',
            master: master,
            part: part,
        });

        if (data.error) throw new Error(data.error);

        return { success: true, data };
    } catch (error) {
        console.error('[API Error]', error);
        return {
            success: false,
            data: null,
            message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
        };
    }
}

/**
 * API 연결 테스트 (ping)
 */
export async function pingAPI(): Promise<boolean> {
    try {
        const data = await callGasApi({ action: 'ping' });
        return data.status === 'ok';
    } catch {
        return false;
    }
}

export interface ApiResult {
    success: boolean;
    message?: string;
    error?: string;
}

/**
 * 비고/메모 저장
 */
export async function saveMemo(vin: string, memo: string): Promise<ApiResult> {
    try {
        const data = await callGasApi({
            action: 'saveMemo',
            vin: vin,
            memo: memo,
        });
        if (data.error) throw new Error(data.error);
        return { success: true, message: data.message || '메모가 저장되었습니다.' };
    } catch (error) {
        console.error('[API Error]', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : '메모 저장 실패'
        };
    }
}

/**
 * 점검 완료 처리
 */
export async function markAsComplete(
    vin: string,
    memo: string,
    processTypes: { inspection: boolean; replace: boolean; transfer: boolean; disposal: boolean }
): Promise<ApiResult> {
    try {
        const data = await callGasApi({
            action: 'complete',
            vin: vin,
            memo: memo,
            inspection: String(processTypes.inspection),
            replace: String(processTypes.replace),
            transfer: String(processTypes.transfer),
            disposal: String(processTypes.disposal),
        });
        if (data.error) throw new Error(data.error);
        return { success: true, message: data.message || '점검 완료 처리되었습니다.' };
    } catch (error) {
        console.error('[API Error]', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : '완료 처리 실패'
        };
    }
}
