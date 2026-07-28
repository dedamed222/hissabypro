
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Calendar } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";
import { TranslationKey } from "@/locales";

interface SalesFiltersProps {
  dateFilter: string;
  setDateFilter: (date: string) => void;
  paymentMethodFilter: string;
  setPaymentMethodFilter: (method: string) => void;
  paymentMethods: string[];
}

export const SalesFilters = ({
  dateFilter,
  setDateFilter,
  paymentMethodFilter,
  setPaymentMethodFilter,
  paymentMethods
}: SalesFiltersProps) => {
  const { t } = useLocale();

  const translateMethod = (method: string) => {
    if (method === 'all') return t('allPaymentMethods');
    const methodLower = method?.toLowerCase();
    if (methodLower === 'cash' || method === 'نقدي') return t('cash');
    if (methodLower === 'bank' || method === 'تحويل بنكي') return t('bankTransfer');
    if (methodLower === 'electronic' || method === 'دفع إلكتروني') return t('electronicPayment');
    
    // Check if it's a known key in our translations
    const keys: TranslationKey[] = ['cash', 'card', 'transfer', 'bankTransfer', 'electronicPayment', 'creditPayment'];
    if (keys.includes(methodLower as TranslationKey)) return t(methodLower as TranslationKey);
    
    return method;
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          {t('filterSales')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {t('date')}
            </label>
            <Input 
              type="date" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">{t('paymentMethod')}</label>
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectPaymentMethod')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allPaymentMethods')}</SelectItem>
                {paymentMethods.map((method) => (
                  <SelectItem key={method} value={method}>
                    {translateMethod(method)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
