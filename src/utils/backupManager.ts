
import { StoreData } from "@/types";
import { loadStoreData, saveStoreData } from "./localStorage";
import * as CryptoJS from "crypto-js";

const BACKUP_PREFIX = "arab-business-hub-backup";
const MAX_BACKUPS = 5;

// Retrieve the same per-device encryption key used by localStorage.ts
const getEncryptionKey = (): string => {
  const KEY_ITEM = "arab-hub-device-key";
  let key = localStorage.getItem(KEY_ITEM);
  if (!key) {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    key = Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(KEY_ITEM, key);
  }
  return key;
};

const encryptBackup = (data: object): string => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), getEncryptionKey()).toString();
};

const decryptBackup = (cipher: string): any => {
  const bytes = CryptoJS.AES.decrypt(cipher, getEncryptionKey());
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

// Migrate any legacy plaintext backups to encrypted form
const migratePlaintextBackups = (): void => {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(BACKUP_PREFIX) && !key.endsWith("-last-auto")) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        // If it starts with '{' it is plaintext JSON — re-encrypt it
        if (raw.trimStart().startsWith("{")) {
          const parsed = JSON.parse(raw);
          localStorage.setItem(key, encryptBackup(parsed));
        }
      } catch {
        // Ignore unreadable entries
      }
    }
  }
};

// إنشاء نسخة احتياطية
export const createBackup = (): boolean => {
  try {
    migratePlaintextBackups();
    const currentData = loadStoreData();
    const timestamp = new Date().toISOString();
    const backupKey = `${BACKUP_PREFIX}-${timestamp}`;

    const backupData = {
      ...currentData,
      backupInfo: {
        createdAt: timestamp,
        version: getAppVersion(),
        userAgent: navigator.userAgent
      }
    };

    // Store encrypted — same key as main data store
    localStorage.setItem(backupKey, encryptBackup(backupData));

    // تنظيف النسخ الاحتياطية القديمة
    cleanOldBackups();

    console.log(`تم إنشاء نسخة احتياطية: ${backupKey}`);
    return true;
  } catch (error) {
    console.error("خطأ في إنشاء النسخة الاحتياطية:", error);
    return false;
  }
};

// الحصول على قائمة النسخ الاحتياطية
export const getBackupsList = (): Array<{key: string, date: string, size: string}> => {
  const backups = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(BACKUP_PREFIX) && !key.endsWith("-last-auto")) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          let parsedData: any;
          if (raw.trimStart().startsWith("{")) {
            parsedData = JSON.parse(raw); // legacy plaintext
          } else {
            parsedData = decryptBackup(raw);
          }
          backups.push({
            key,
            date: parsedData.backupInfo?.createdAt || key.replace(BACKUP_PREFIX + "-", ""),
            size: (raw.length / 1024).toFixed(2) + " KB"
          });
        }
      } catch (error) {
        console.error(`خطأ في قراءة النسخة الاحتياطية ${key}:`, error);
      }
    }
  }

  return backups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// استرداد نسخة احتياطية
export const restoreBackup = (backupKey: string): boolean => {
  try {
    // Validate key prefix to prevent arbitrary localStorage reads
    if (!backupKey.startsWith(BACKUP_PREFIX)) {
      console.error("مفتاح النسخة الاحتياطية غير صالح");
      return false;
    }

    const raw = localStorage.getItem(backupKey);
    if (!raw) {
      console.error("النسخة الاحتياطية غير موجودة");
      return false;
    }

    let parsedData: any;
    if (raw.trimStart().startsWith("{")) {
      parsedData = JSON.parse(raw); // legacy plaintext
    } else {
      parsedData = decryptBackup(raw);
    }

    // إزالة معلومات النسخة الاحتياطية قبل الاستعادة
    delete parsedData.backupInfo;

    saveStoreData(parsedData);
    console.log(`تم استرداد النسخة الاحتياطية: ${backupKey}`);
    return true;
  } catch (error) {
    console.error("خطأ في استرداد النسخة الاحتياطية:", error);
    return false;
  }
};

// تنظيف النسخ الاحتياطية القديمة
const cleanOldBackups = (): void => {
  const backups = getBackupsList();

  if (backups.length > MAX_BACKUPS) {
    const backupsToDelete = backups.slice(MAX_BACKUPS);
    backupsToDelete.forEach(backup => {
      localStorage.removeItem(backup.key);
      console.log(`تم حذف النسخة الاحتياطية القديمة: ${backup.key}`);
    });
  }
};

// حذف نسخة احتياطية محددة
export const deleteBackup = (backupKey: string): boolean => {
  try {
    localStorage.removeItem(backupKey);
    console.log(`تم حذف النسخة الاحتياطية: ${backupKey}`);
    return true;
  } catch (error) {
    console.error("خطأ في حذف النسخة الاحتياطية:", error);
    return false;
  }
};

// تصدير جميع البيانات
export const exportAllData = (): string => {
  const currentData = loadStoreData();
  return JSON.stringify(currentData, null, 2);
};

// استيراد البيانات
export const importData = (jsonData: string): boolean => {
  try {
    const parsedData = JSON.parse(jsonData);

    // التحقق من صحة البيانات
    if (!parsedData.users || !Array.isArray(parsedData.users)) {
      throw new Error("البيانات غير صحيحة");
    }

    // إنشاء نسخة احتياطية قبل الاستيراد
    createBackup();

    saveStoreData(parsedData);
    console.log("تم استيراد البيانات بنجاح");
    return true;
  } catch (error) {
    console.error("خطأ في استيراد البيانات:", error);
    return false;
  }
};

// الحصول على إصدار التطبيق
const getAppVersion = (): string => {
  return "1.0.0";
};

// فحص وإنشاء نسخة احتياطية تلقائية
export const autoBackup = (): void => {
  const lastBackupKey = `${BACKUP_PREFIX}-last-auto`;
  const lastBackupTime = localStorage.getItem(lastBackupKey);
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  if (!lastBackupTime || (now - parseInt(lastBackupTime)) > oneHour) {
    if (createBackup()) {
      localStorage.setItem(lastBackupKey, now.toString());
    }
  }
};
