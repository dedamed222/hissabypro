
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import { DollarSign, CreditCard, Banknote } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";
import { TranslationKey } from "@/locales";

interface PaymentMethodCardsProps {
  totalSales: number;
  paymentMethods: string[];
  getPaymentMethodTotal: (method: string) => number;
}

export const PaymentMethodCards = ({ 
  totalSales, 
  paymentMethods, 
  getPaymentMethodTotal 
}: PaymentMethodCardsProps) => {
  const { t } = useLocale();

  const translateMethod = (method: string) => {
    const methodLower = method?.toLowerCase();
    if (methodLower === 'cash' || method === 'نقدي') return t('cash');
    if (methodLower === 'bank' || method === 'تحويل بنكي') return t('bankTransfer');
    if (methodLower === 'electronic' || method === 'دفع إلكتروني') return t('electronicPayment');
    
    // Check if it's a known key in our translations
    const keys: TranslationKey[] = ['cash', 'card', 'transfer', 'bankTransfer', 'electronicPayment', 'creditPayment'];
    if (keys.includes(methodLower as TranslationKey)) return t(methodLower as TranslationKey);
    
    return method;
  };

  const getPaymentMethodIcon = (method: string) => {
    const methodLower = method?.toLowerCase();
    switch (methodLower) {
      case 'cash':
      case 'نقدي':
        return <Banknote className="w-5 h-5" />;
      case 'bank':
      case 'تحويل بنكي':
      case 'electronic':
      case 'دفع إلكتروني':
        return <CreditCard className="w-5 h-5" />;
      default:
        return <DollarSign className="w-5 h-5" />;
    }
  };

  const getPaymentMethodColor = (method: string) => {
    const methodLower = method?.toLowerCase();
    switch (methodLower) {
      case 'cash':
      case 'نقدي':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'bank':
      case 'تحويل بنكي':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'electronic':
      case 'دفع إلكتروني':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Sales Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 mb-1">{t('totalSales')}</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalSales)}</p>
            </div>
            <div className="bg-blue-200 p-3 rounded-full">
              <DollarSign className="w-6 h-6 text-blue-700" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Cards */}
      {paymentMethods.slice(0, 3).map((method) => {
        const total = getPaymentMethodTotal(method);
        const colorClass = getPaymentMethodColor(method);
        
        return (
          <Card key={method} className={`border ${colorClass}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1">{translateMethod(method)}</p>
                  <p className="text-xl font-bold">{formatCurrency(total)}</p>
                </div>
                <div className="p-3 rounded-full bg-white bg-opacity-50">
                  {getPaymentMethodIcon(method)}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
