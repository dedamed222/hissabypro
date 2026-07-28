
import React, { useEffect, useState } from 'react';
import { loadStoreData } from "@/utils/localStorage";
import { Image, Store } from 'lucide-react';

interface StoreInfoData {
  name: string;
  photoUrl: string;
}

export default function StoreInfo() {
  const [storeInfo, setStoreInfo] = useState<StoreInfoData>({
    name: '',
    photoUrl: ''
  });

  useEffect(() => {
    const data = loadStoreData();
    if (data.storeInfo) {
      setStoreInfo({
        name: data.storeInfo.name || '',
        photoUrl: data.storeInfo.photoUrl || ''
      });
    }
  }, []);

  if (!storeInfo.name && !storeInfo.photoUrl) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <Store size={16} />
        <span className="text-sm">لم يتم تعيين معلومات المتجر</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {storeInfo.photoUrl ? (
        <div className="w-8 h-8 rounded-full overflow-hidden">
          <img 
            src={storeInfo.photoUrl} 
            alt="Store logo" 
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
          <Store size={16} className="text-gray-600" />
        </div>
      )}
      {storeInfo.name && (
        <div className="font-medium">{storeInfo.name}</div>
      )}
    </div>
  );
}
