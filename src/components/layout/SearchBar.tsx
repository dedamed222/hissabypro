
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Package, FileText, Users, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProductSearch } from '@/hooks/useProductSearch';
import { useLocale } from '@/hooks/useLocale';
import { translations } from '@/locales';

export default function SearchBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { filteredProducts } = useProductSearch();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const { locale } = useLocale();
  const t = translations[locale];

  const quickActions = [
    { nameKey: 'createInvoice', path: '/create-invoice', icon: FileText, type: 'action' },
    { nameKey: 'products', path: '/products', icon: Package, type: 'action' },
    { nameKey: 'customers', path: '/customers', icon: Users, type: 'action' },
    { nameKey: 'sales', path: '/sales', icon: ShoppingCart, type: 'action' },
  ];

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleProductSelect = (productId: string) => {
    navigate(`/products?search=${productId}`);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleActionSelect = (path: string) => {
    navigate(path);
    setIsOpen(false);
    setSearchQuery('');
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsOpen(false);
  };

  // Filter products based on search query
  const searchResults = searchQuery.trim() 
    ? filteredProducts.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.code.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  // Filter quick actions based on search query
  const filteredActions = searchQuery.trim()
    ? quickActions.filter(action =>
        (t[action.nameKey as keyof typeof t] as string).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : quickActions.slice(0, 4);

  const isRTL = locale === 'ar';

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-gray-400`} size={18} />
        <input
          type="text"
          placeholder={t.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-2.5 bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 transition-all duration-200 text-sm`}
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors`}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-md border border-gray-200/50 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="max-h-80 overflow-y-auto p-2">
            {/* Quick Actions */}
            {filteredActions.length > 0 && (
              <div className="mb-4">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  {t.quickActions}
                </div>
                <div className="mt-2 space-y-1">
                  {filteredActions.map((action) => (
                    <button
                      key={action.path}
                      onClick={() => handleActionSelect(action.path)}
                      className={`w-full flex items-center gap-3 px-3 py-2 ${isRTL ? 'text-right' : 'text-left'} hover:bg-blue-50 rounded-lg transition-colors`}
                    >
                      <action.icon className="text-blue-600" size={16} />
                      <span className="text-sm text-gray-700">{t[action.nameKey as keyof typeof t]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Products */}
            {searchResults.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  {t.products}
                </div>
                <div className="mt-2 space-y-1">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleProductSelect(product.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 ${isRTL ? 'text-right' : 'text-left'} hover:bg-green-50 rounded-lg transition-colors`}
                    >
                      <div className="flex items-center gap-2">
                        <Package className="text-green-600" size={16} />
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-500">{t.code}: {product.code}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {product.quantity > 0 ? `${t.available} (${product.quantity})` : t.notAvailable}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {searchQuery.trim() && searchResults.length === 0 && filteredActions.length === 0 && (
              <div className="px-3 py-6 text-center text-gray-500">
                <Search className="mx-auto mb-2 text-gray-300" size={24} />
                <p className="text-sm">{t.searchNoResults}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
