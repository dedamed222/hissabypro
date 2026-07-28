import React from "react";
import { useLocale } from "@/hooks/useLocale";

interface ProductSortSelectProps {
  sortOption: string;
  setSortOption: (option: string) => void;
}

export default function ProductSortSelect({
  sortOption,
  setSortOption
}: ProductSortSelectProps) {
  const { t } = useLocale();

  return <div className="relative">
      <select 
        value={sortOption}
        onChange={e => setSortOption(e.target.value)} 
        aria-label={t('sortBy')} 
        className="border border-gray-300 rounded-md px-4 focus:outline-none focus:ring-2 focus:ring-arab-blue bg-white appearance-none pr-10 mx-[5px] py-[5px]"
      >
        <option value="created_at-desc">{t('sortBy')}</option>
        <option value="name-asc">{t('nameAsc')}</option>
        <option value="name-desc">{t('nameDesc')}</option>
        <option value="price-asc">{t('priceAsc')}</option>
        <option value="price-desc">{t('priceDesc')}</option>
        <option value="quantity-asc">{t('quantityAsc')}</option>
        <option value="quantity-desc">{t('quantityDesc')}</option>
        <option value="sold-asc">{t('soldAsc')}</option>
        <option value="sold-desc">{t('soldDesc')}</option>
      </select>
      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>
    </div>;
}