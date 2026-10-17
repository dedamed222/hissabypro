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

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-grow">
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none text-slate-400">
          <Search size={17} />
        </div>
        <input
          type="text"
          placeholder={t('searchPlaceholder') as string || 'البحث عن منتج بالاسم، الرمز، أو الفئة...'}
          value={searchQuery}
          onChange={onSearchChange}
          className="w-full pr-10 pl-4 py-2.5 bg-white text-slate-800 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs transition-all font-medium"
        />
      </div>
      <div className="shrink-0">
        <ProductSortSelect sortOption={sortOption} setSortOption={setSortOption} />
      </div>
    </div>
  );
}