
import StatCard from "@/components/ui/StatCard";
import { FormattedStat } from "@/types";
import { ShoppingCart, CreditCard, Package2 } from "lucide-react";

interface StatCardsProps {
  salesStat: FormattedStat;
  expensesStat: FormattedStat;
  inventoryStat: FormattedStat;
}

export function StatCards({ salesStat, expensesStat, inventoryStat }: StatCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <StatCard 
        data={salesStat} 
        icon={<ShoppingCart size={28} />} 
        iconColor="bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg" 
      />
      <StatCard 
        data={expensesStat} 
        icon={<CreditCard size={28} />} 
        iconColor="bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-lg" 
      />
      <StatCard 
        data={inventoryStat} 
        icon={<Package2 size={28} />} 
        iconColor="bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-lg" 
      />
    </div>
  );
}
