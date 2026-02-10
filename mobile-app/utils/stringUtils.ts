/**
 * 문자열 앞뒤 공백 제거
 */
export function trim(str: string): string {
    return str.trim();
}

/**
 * 빈 문자열 여부 확인
 */
export function isEmpty(str: string | null | undefined): boolean {
    return !str || str.trim().length === 0;
}

/**
 * 문자열 자르기 (말줄임표 추가)
 */
export function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
}

/**
 * 전화번호 포맷팅 (010-1234-5678)
 */
export function formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
}

/**
 * 첫 글자 대문자로 변환
 */
export function capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * 문자열에서 특수문자 제거
 */
export function removeSpecialChars(str: string): string {
    return str.replace(/[^a-zA-Z0-9가-힣\s]/g, '');
}

/**
 * 숫자에 천 단위 콤마 추가
 */
export function formatNumber(num: number): string {
    return num.toLocaleString('ko-KR');
}
