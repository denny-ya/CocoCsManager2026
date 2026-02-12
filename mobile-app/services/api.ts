import { BsSearchResult } from './mockData';

// Apps Script Web App URLs
const SERVICE_URLS = [
    'https://script.google.com/macros/s/AKfycbx8UbNnZZMlCLluigXJqfjRPq7n7DOgd7DHgCaJzExP_VvqCtKzkMXlVENHwokRnSr6sQ/exec', // 서비스1
    'https://script.google.com/macros/s/AKfycbykccCJv60OF-lkyoohL1b8BKmb5_2jfg2AxKAHh3YwjYWzAyA6eSTn7cLEN8-m5F-T/exec',     // 서비스2
    'https://script.google.com/macros/s/AKfycbyYoKqyYVO1ramISnKkjoAAr-faxG-p-1gkGyhBm2yxhFlye073Fsm5BCEBONGr6hQa_g/exec', // 서비스3
    'https://script.google.com/macros/s/AKfycby9p_1-2ER9DtYIqq_-zge_vGAhHgtmy1HDnAvb1NqviEXVO7F53f0oyxnagHCTm2bg/exec',   // 서비스4
];

export interface SearchResponse {
    success: boolean;
    data: BsSearchResult[];
    message?: string;
}

/**
 * BS 및 리워크 검색 API 호출
 * @param serviceIndex 서비스 인덱스 (0~3: 서비스1~4)
 * @param keyword 검색 키워드 (자산번호)
 */
export async function searchBSRework(serviceIndex: number, keyword: string): Promise<SearchResponse> {
    try {
        const url = SERVICE_URLS[serviceIndex];
        if (!url) throw new Error('Invalid Service Index');

        const fetchUrl = `${url}?type=json&keyword=${encodeURIComponent(keyword)}`;
        console.log(`[API] Fetching from ${fetchUrl}`);

        const response = await fetch(fetchUrl);

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const text = await response.text();
        console.log(`[API] Response: ${text.substring(0, 100)}...`);

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('[API Error] JSON Parse Failed:', text);
            throw new Error('서버 응답이 올바른 JSON 형식이 아닙니다.');
        }

        if (Array.isArray(data)) {
            return { success: true, data: data };
        } else {
            return { success: true, data: data.result || [] };
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
