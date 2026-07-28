import React from 'react';
import { Search } from 'lucide-react';
import ProductSortSelect from './ProductSortSelect';
import { useLocale } from '@/hooks/useLocale';

interface ProductsSearchBarProps {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sortOption: string;
  setSortOption: (option: string) => void;
}
export default function ProductsSearchBar({
  searchQuery,
  onSearchChange,
  sortOption,
  setSortOption
}: ProductsSearchBarProps) {
  const { t } = useLocale();

  return <div className="flex flex-col md:flex-row gap-4">
      <div className="relative flex-grow">
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <img src="/lovable-uploads/9bf8f3b6-2cd1-4788-a907-3ea9cb2eb6fc.png" alt="Hissaby Pro" className="h-5 w-5 mr-1" />
          <Search className="text-gray-400" size={18} />
        </div>
        <input type="text" placeholder={t('searchPlaceholder') as string} value={searchQuery} onChange={onSearchChange} className="w-full pl-4 pr-16 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-blue bg-white appearance-none h-[42px] px-0 py-0" />
      </div>
      <ProductSortSelect sortOption={sortOption} setSortOption={setSortOption} />
    </div>;
}