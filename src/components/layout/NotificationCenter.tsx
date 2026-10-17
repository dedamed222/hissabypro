import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Bell, Check, Trash2, AlertTriangle, PackageX, ShoppingBag, ShieldCheck, CreditCard, ChevronRight, BellRing } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLocale } from "@/hooks/useLocale";
import { loadStoreData } from "@/utils/localStorage";
import { useNavigate } from "react-router-dom";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "@/hooks/use-toast";

interface StoreNotification {
  id: string;
  type: "out_of_stock" | "low_stock" | "sales" | "debt" | "system";
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  time: string;
  timeAr: string;
  link: string;
  read: boolean;
  severity: "critical" | "warning" | "success" | "info";
}

const READ_STORAGE_KEY = "gsc_read_notifications_v1";

export const NotificationCenter: React.FC = () => {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const navigate = useNavigate();
  const { subscribe } = usePushNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "stock" | "finance">("all");
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(READ_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Keep readIds synced to localStorage
  const saveReadIds = useCallback((newIds: string[]) => {
    setReadIds(newIds);
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(newIds));
    } catch (e) {
      console.error("Error saving read notifications:", e);
    }
  }, []);

  // Compute live notifications from store state
  const notifications: StoreNotification[] = useMemo(() => {
    const data = loadStoreData();
    const list: StoreNotification[] = [];

    // 1. Out of stock products
    const outOfStock = data.products.filter((p) => p.quantity <= 0);
    outOfStock.slice(0, 3).forEach((p) => {
      const id = `out-stock-${p.id}`;
      list.push({
        id,
        type: "out_of_stock",
        title: "Rupture de stock",
        titleAr: "نفاد المخزون",
        description: `Le produit "${p.name}" est totalement épuisé.`,
        descriptionAr: `المنتج "${p.name}" نفد بالكامل من المخزون.`,
        time: "Action requise",
        timeAr: "مطلوب إجراء",
        link: "/products",
        read: readIds.includes(id),
        severity: "critical",
      });
    });

    // 2. Low stock products
    const lowStock = data.products.filter(
      (p) => p.quantity > 0 && p.quantity <= (p.lowStockThreshold || 5)
    );
    lowStock.slice(0, 4).forEach((p) => {
      const id = `low-stock-${p.id}`;
      list.push({
        id,
        type: "low_stock",
        title: "Niveau de stock faible",
        titleAr: "مستوى مخزون منخفض",
        description: `"${p.name}" - reste ${p.quantity} unités (seuil: ${p.lowStockThreshold || 5}).`,
        descriptionAr: `"${p.name}" - متبقي ${p.quantity} وحدات فقط (الحد الأدنى: ${p.lowStockThreshold || 5}).`,
        time: "Aujourd'hui",
        timeAr: "اليوم",
        link: "/products",
        read: readIds.includes(id),
        severity: "warning",
      });
    });

    // 3. Today's sales milestone
    const todayStr = new Date().toISOString().split("T")[0];
    const todaySales = (data.dailySales || []).filter((s) => s.date && s.date.startsWith(todayStr));
    const todaySalesTotal = todaySales.reduce((acc, s) => acc + (s.totalSales || s.total || 0), 0);

    if (todaySales.length > 0) {
      const id = `sales-today-${todayStr}`;
      list.push({
        id,
        type: "sales",
        title: "Activité commerciale du jour",
        titleAr: "نشاط المبيعات لليوم",
        description: `${todaySales.length} ventes effectuées • Total: MRU ${todaySalesTotal.toLocaleString()}`,
        descriptionAr: `${todaySales.length} مبيعات مسجلة • الإجمالي: ${todaySalesTotal.toLocaleString()} أوقية`,
        time: "En direct",
        timeAr: "مباشر",
        link: "/sales",
        read: readIds.includes(id),
        severity: "success",
      });
    }

    // 4. Pending client notes / Debts
    const openNotes = (data.clientNotes || []).filter((n) => n.status === "open");
    const openDebtors = (data.debtors || []).filter((d) => d.status !== "paid");
    const totalDebt = openNotes.reduce((acc, n) => acc + (n.total || 0), 0) +
      openDebtors.reduce((acc, d) => acc + (d.totalAmount || d.amount || 0), 0);
    const totalPendingCount = openNotes.length + openDebtors.length;

    if (totalPendingCount > 0) {
      const id = `pending-debts-summary`;
      list.push({
        id,
        type: "debt",
        title: "Créances clients en cours",
        titleAr: "ديون العملاء المعلقة",
        description: `${totalPendingCount} créance(s) en attente • Solde impayé: MRU ${totalDebt.toLocaleString()}`,
        descriptionAr: `${totalPendingCount} مديونيات معلقة • الرصيد غير المسدد: ${totalDebt.toLocaleString()} أوقية`,
        time: "Rappel",
        timeAr: "تذكير",
        link: "/debtors",
        read: readIds.includes(id),
        severity: "warning",
      });
    }

    // 5. System operational status
    const idSync = `system-sync-ok`;
    list.push({
      id: idSync,
      type: "system",
      title: "Sauvegarde & Synchronisation",
      titleAr: "النسخ الاحتياطي والمزامنة",
      description: "Le système de stockage local et de synchronisation est opérationnel.",
      descriptionAr: "نظام التخزين المحلي والمزامنة يعمل بكفاءة وأمان.",
      time: "Système",
      timeAr: "النظام",
      link: "/settings",
      read: readIds.includes(idSync),
      severity: "info",
    });

    return list;
  }, [readIds]);

  // Unread count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    if (activeFilter === "stock") {
      return notifications.filter((n) => n.type === "low_stock" || n.type === "out_of_stock");
    }
    if (activeFilter === "finance") {
      return notifications.filter((n) => n.type === "sales" || n.type === "debt");
    }
    return notifications;
  }, [notifications, activeFilter]);

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    saveReadIds(allIds);
    toast({
      title: isAr ? "تم تحديد الكل كمقروء" : "Tout est marqué comme lu",
      description: isAr ? "تم تحديث حالة كافة الإشعارات." : "Toutes les notifications ont été marquées comme lues.",
    });
  };

  const handleNotificationClick = (n: StoreNotification) => {
    if (!readIds.includes(n.id)) {
      saveReadIds([...readIds, n.id]);
    }
    setIsOpen(false);
    navigate(n.link);
  };

  const handleEnablePush = async () => {
    const success = await subscribe();
    if (success) {
      toast({
        title: isAr ? "تم تفعيل الإشعارات بنجاح" : "Notifications activées",
        description: isAr ? "ستتلقى إشعارات فورية من النظام." : "Vous recevrez des alertes en temps réel.",
      });
    }
  };

  const renderIcon = (n: StoreNotification) => {
    switch (n.type) {
      case "out_of_stock":
        return (
          <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <PackageX className="w-4 h-4 stroke-[2.5]" />
          </div>
        );
      case "low_stock":
        return (
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
          </div>
        );
      case "sales":
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
          </div>
        );
      case "debt":
        return (
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-4 h-4 stroke-[2.5]" />
          </div>
        );
      case "system":
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
          </div>
        );
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-white/10 active:scale-95 text-white transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/30"
          aria-label={isAr ? "الإشعارات" : "Notifications"}
          title={isAr ? "الإشعارات" : "Notifications"}
        >
          <Bell className="w-5 h-5 transition-transform hover:rotate-6" />

          {/* Dynamic Unread Badge */}
          {unreadCount > 0 && (
            <span className="absolute top-1 end-1 flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative min-w-[17px] h-[17px] px-1 flex items-center justify-center bg-rose-500 text-white text-[10px] font-black rounded-full border border-blue-900 shadow-xs">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[360px] sm:w-[400px] p-0 bg-white rounded-2xl shadow-2xl border border-slate-200/90 text-slate-800 overflow-hidden z-50 animate-in fade-in-50 zoom-in-95"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0047cc] to-[#0052d9] text-white p-3.5 sm:p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-xs">
              <Bell className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight leading-tight">
                {isAr ? "مركز الإشعارات" : "Centre de notifications"}
              </h3>
              <p className="text-[11px] text-blue-100/80 font-medium leading-tight">
                {unreadCount > 0
                  ? isAr
                    ? `${unreadCount} تنبيهات غير مقروءة`
                    : `${unreadCount} notification(s) non lue(s)`
                  : isAr
                  ? "لا توجد تنبيهات جديدة"
                  : "Toutes les alertes sont à jour"}
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs bg-white/15 hover:bg-white/25 active:bg-white/30 text-white px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 font-medium cursor-pointer"
              title={isAr ? "تحديد الكل كمقروء" : "Tout marquer comme lu"}
            >
              <Check className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isAr ? "تعليم كمقروء" : "Tout lire"}
              </span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border-b border-slate-100 text-xs">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              activeFilter === "all"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            {isAr ? "الكل" : "Toutes"} ({notifications.length})
          </button>
          <button
            onClick={() => setActiveFilter("stock")}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              activeFilter === "stock"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            {isAr ? "المخزون" : "Stock"}
          </button>
          <button
            onClick={() => setActiveFilter("finance")}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              activeFilter === "finance"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            {isAr ? "المبيعات والديون" : "Ventes & Dettes"}
          </button>
        </div>

        {/* Notifications Scrollable List */}
        <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
          {filteredNotifications.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <BellRing className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">
                {isAr ? "لا توجد إشعارات في هذا التصنيف" : "Aucune notification ici"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isAr ? "نشاط متجرك هادئ ومستقر" : "Votre magasin est parfaitement à jour"}
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-3 sm:p-3.5 flex items-start gap-3 hover:bg-blue-50/50 transition-colors cursor-pointer group ${
                  !n.read ? "bg-blue-50/30" : ""
                }`}
              >
                {renderIcon(n)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h4
                      className={`text-xs font-bold truncate ${
                        !n.read ? "text-slate-900" : "text-slate-700"
                      }`}
                    >
                      {isAr ? n.titleAr : n.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                      {isAr ? n.timeAr : n.time}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                    {isAr ? n.descriptionAr : n.description}
                  </p>
                </div>

                <div className="flex items-center self-center shrink-0">
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all rtl:rotate-180" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <button
            onClick={handleEnablePush}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>{isAr ? "تفعيل إشعارات المتصفح" : "Activer alertes bureau"}</span>
          </button>

          <button
            onClick={() => {
              saveReadIds(notifications.map((n) => n.id));
              setIsOpen(false);
            }}
            className="text-[11px] text-slate-400 hover:text-slate-600 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {isAr ? "إغلاق" : "Fermer"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
