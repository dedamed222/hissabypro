
import * as React from 'react';
import { useEffect, useState } from 'react';
import { MOBILE_BREAKPOINTS } from '@/hooks/use-mobile';

// تحسين التفاعلات باللمس
export function useOptimizeTouch() {
  useEffect(() => {
    // منع التكبير بالنقر المزدوج
    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    
    // منع السحب للأسفل للتحديث في بعض المتصفحات
    document.body.style.overscrollBehavior = 'none';
    
    // تحسين التمرير لأجهزة iOS
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      // Use a type assertion to set the webkit property
      (document.documentElement.style as any).webkitOverflowScrolling = 'touch';
    }
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.body.style.overscrollBehavior = '';
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        // Use a type assertion when removing the webkit property
        (document.documentElement.style as any).webkitOverflowScrolling = '';
      }
    };
  }, []);
}

// الكشف عن نوع المنصة
export function detectMobilePlatform() {
  const userAgent = navigator.userAgent || navigator.vendor;
  
  if (/android/i.test(userAgent)) {
    return 'android';
  }
  
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return 'ios';
  }
  
  return window.innerWidth < MOBILE_BREAKPOINTS.MEDIUM ? 'mobile-web' : 'web';
}

// ضبط حجم الخطوط حسب الجهاز
export function getFontSizeForDevice() {
  const platform = detectMobilePlatform();
  const width = window.innerWidth;
  
  switch(platform) {
    case 'android':
      return width < MOBILE_BREAKPOINTS.SMALL ? 'text-sm' : 'text-base';
    case 'ios':
      return width < MOBILE_BREAKPOINTS.SMALL ? 'text-sm' : 'text-base';
    case 'mobile-web':
      return width < MOBILE_BREAKPOINTS.SMALL ? 'text-sm' : 'text-base';
    default:
      return ''; // سيستخدم الحجم الافتراضي للنص
  }
}

// الكشف عن اتجاه الشاشة (أفقي/عمودي)
export function useScreenOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  );

  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      );
    };

    window.addEventListener('resize', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  return orientation;
}

// تحسين الأداء للأجهزة المحمولة
export function useMobilePerformanceOptimization() {
  useEffect(() => {
    const isMobile = window.innerWidth < MOBILE_BREAKPOINTS.MEDIUM;
    
    if (isMobile) {
      // تقليل عدد التحديثات لتحسين الأداء على الأجهزة المحمولة
      const originalRAF = window.requestAnimationFrame;
      let lastTime = 0;
      
      // Use type assertion to fix the TypeScript error
      window.requestAnimationFrame = ((callback) => {
        const currentTime = Date.now();
        if (currentTime - lastTime < 16) { // ~ 60fps
          return window.setTimeout(() => callback(currentTime), 16);
        }
        lastTime = currentTime;
        return originalRAF(callback);
      }) as typeof window.requestAnimationFrame;
      
      return () => {
        window.requestAnimationFrame = originalRAF;
      };
    }
  }, []);
}

// تطبيق تنسيق CSS مخصص للأجهزة المحمولة
export function getMobileSpecificClasses() {
  const isMobile = window.innerWidth < MOBILE_BREAKPOINTS.MEDIUM;
  const isSmall = window.innerWidth < MOBILE_BREAKPOINTS.SMALL;
  
  if (!isMobile) return {};
  
  return {
    container: isSmall ? 'px-2 py-2' : 'px-4 py-3',
    text: isSmall ? 'text-sm' : 'text-base',
    heading: isSmall ? 'text-lg mb-2' : 'text-xl mb-3',
    button: isSmall ? 'text-sm py-1 px-2' : 'text-base py-2 px-3',
    card: isSmall ? 'p-2 rounded-md' : 'p-3 rounded-lg',
    grid: isSmall ? 'grid-cols-1 gap-2' : 'grid-cols-2 gap-4',
  };
}

// تحسين عناصر الإدخال للأجهزة التي تعمل باللمس
export function useTouchInputOptimization() {
  useEffect(() => {
    const isMobile = window.innerWidth < MOBILE_BREAKPOINTS.MEDIUM;
    
    if (isMobile) {
      // زيادة حجم عناصر الإدخال للأجهزة التي تعمل باللمس
      const inputs = document.querySelectorAll('input, button, select, textarea, a');
      inputs.forEach(el => {
        const element = el as HTMLElement;
        const currentPadding = window.getComputedStyle(element).padding;
        
        if (currentPadding !== 'auto' && element.tagName !== 'A') {
          element.style.minHeight = '44px';
        }
      });
    }
  }, []);
}
