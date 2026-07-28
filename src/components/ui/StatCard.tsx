
import { cn } from "@/lib/utils";
import { FormattedStat } from "@/types";
import { ReactNode } from "react";
import { ArrowDownIcon, ArrowUpIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  data: FormattedStat;
  icon: ReactNode;
  iconColor?: string;
  className?: string;
}

export default function StatCard({ data, icon, iconColor = "bg-blue-100 text-blue-600", className }: StatCardProps) {
  return (
    <div className={cn(
      "bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100/50 p-6 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:bg-white group",
      className
    )}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">{data.label}</h3>
          <p className="text-3xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
            {data.value}
          </p>
        </div>
        <div className={cn(
          "p-4 rounded-2xl transition-all duration-300 group-hover:scale-110",
          iconColor
        )}>
          {icon}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
          data.isPositive 
            ? "bg-green-50 text-green-700 border border-green-200" 
            : "bg-red-50 text-red-700 border border-red-200"
        )}>
          {data.isPositive ? (
            <TrendingUp size={16} />
          ) : (
            <TrendingDown size={16} />
          )}
          <span>{data.change}%</span>
        </div>
        <span className="text-xs text-gray-500">مقارنة بالأمس</span>
      </div>
    </div>
  );
}
