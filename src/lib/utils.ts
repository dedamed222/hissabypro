
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import * as CryptoJS from "crypto-js"
import { User } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Per-device JWT signing key — never hardcoded, generated and stored locally
const getJwtSecret = (): string => {
  const KEY_ITEM = "arab-hub-jwt-key";
  let key = localStorage.getItem(KEY_ITEM);
  if (!key) {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    key = Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(KEY_ITEM, key);
  }
  return key;
};

// دالة لتشفير البيانات باستخدام JWT
export function jwtEncode(payload: any): string {
  try {
    // تشفير الرأس (Header)
    const header = {
      alg: "HS256",
      typ: "JWT"
    };
    const encodedHeader = btoa(JSON.stringify(header));
    
    // تشفير المحتوى (Payload)
    const encodedPayload = btoa(JSON.stringify(payload));
    
    // إنشاء التوقيع (Signature)
    const signature = CryptoJS.HmacSHA256(
      `${encodedHeader}.${encodedPayload}`,
      getJwtSecret()
    ).toString(CryptoJS.enc.Base64);
    
    // إنشاء رمز JWT كامل
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  } catch (error) {
    console.error("JWT encoding error:", error);
    return "";
  }
}

// دالة لفك تشفير JWT والتحقق من صحته
export function jwtDecode(token: string): { userId: string; user: User; iat: number; exp: number } | null {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split(".");
    
    // التحقق من التوقيع
    const expectedSignature = CryptoJS.HmacSHA256(
      `${encodedHeader}.${encodedPayload}`,
      getJwtSecret()
    ).toString(CryptoJS.enc.Base64);
    
    if (signature !== expectedSignature) {
      throw new Error("Invalid token signature");
    }
    
    // فك تشفير المحتوى
    const payload = JSON.parse(atob(encodedPayload));
    return payload;
  } catch (error) {
    console.error("JWT decoding error:", error);
    return null;
  }
}

// تنظيف البيانات للحماية من هجمات XSS
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\//g, "&#x2F;")
    .replace(/\\/g, "&#x5C;")
    .replace(/`/g, "&#x60;");
}

// دالة للتحقق من مدخلات المستخدم
export function validateInput(input: string, pattern: RegExp): boolean {
  return pattern.test(input);
}

// أنماط مفيدة للتحقق من المدخلات
export const INPUT_PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,20}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  PHONE: /^[\d\s+()-]{8,15}$/,
};
