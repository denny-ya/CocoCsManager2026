/**
 * 이메일 형식 검증
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * 전화번호 형식 검증 (한국)
 */
export function isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
    return phoneRegex.test(phone.replace(/-/g, ''));
}

/**
 * 필수 입력 검증
 */
export function isRequired(value: string | null | undefined): boolean {
    return value !== null && value !== undefined && value.trim().length > 0;
}

/**
 * 최소 길이 검증
 */
export function minLength(value: string, min: number): boolean {
    return value.length >= min;
}

/**
 * 최대 길이 검증
 */
export function maxLength(value: string, max: number): boolean {
    return value.length <= max;
}

/**
 * 숫자만 포함 여부 검증
 */
export function isNumeric(value: string): boolean {
    return /^\d+$/.test(value);
}

/**
 * 폼 필드 검증 결과 타입
 */
export interface ValidationResult {
    isValid: boolean;
    message?: string;
}

/**
 * 폼 필드 검증
 */
export function validateField(
    value: string,
    rules: {
        required?: boolean;
        minLength?: number;
        maxLength?: number;
        email?: boolean;
        phone?: boolean;
    }
): ValidationResult {
    if (rules.required && !isRequired(value)) {
        return { isValid: false, message: '필수 입력 항목입니다' };
    }

    if (rules.minLength && !minLength(value, rules.minLength)) {
        return { isValid: false, message: `최소 ${rules.minLength}자 이상 입력해주세요` };
    }

    if (rules.maxLength && !maxLength(value, rules.maxLength)) {
        return { isValid: false, message: `최대 ${rules.maxLength}자까지 입력 가능합니다` };
    }

    if (rules.email && !isValidEmail(value)) {
        return { isValid: false, message: '올바른 이메일 형식이 아닙니다' };
    }

    if (rules.phone && !isValidPhoneNumber(value)) {
        return { isValid: false, message: '올바른 전화번호 형식이 아닙니다' };
    }

    return { isValid: true };
}
