import React, { useState, useMemo } from "react";
import {
  X,
  Plus,
  Trash2,
  FileText,
  Printer,
  Sparkles,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { ClientNote, ClientNoteItem, Customer, Invoice, InvoiceItem } from "@/types";
import { formatCurrency, formatShortDate } from "@/utils/formatters";
import { generateId, generateInvoiceNumber, saveStoreData, loadStoreData, saveCustomerFile } from "@/utils/localStorage";
import { upsertInvoice, upsertClientNote } from "@/lib/database";
import { useLocale } from "@/hooks/useLocale";
import { recordInvoiceMovements } from "@/utils/productMovements";

interface InvoiceSlot {
  slotId: string;
  invoiceNumber: string;
  noteIds: string[];
  // If individual items were moved/split:
  customItems?: { noteId: string; item: ClientNoteItem }[];
}

interface SplitInvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNotes: ClientNote[];
  customer: Customer;
  onSuccess: (createdInvoices: Invoice[]) => void;
}

export const SplitInvoicesModal: React.FC<SplitInvoicesModalProps> = ({
  isOpen,
  onClose,
  selectedNotes,
  customer,
  onSuccess,
}) => {
  const { t } = useLocale();

  // Initialize with 2 default invoice slots
  const [slots, setSlots] = useState<InvoiceSlot[]>(() => {
    const inv1Num = generateInvoiceNumber("INV");
    const inv2Num = generateInvoiceNumber("INV");

    // Initially, distribute half to slot 1 and half to slot 2
    const half = Math.ceil(selectedNotes.length / 2);
    const slot1Notes = selectedNotes.slice(0, half).map((n) => n.id);
    const slot2Notes = selectedNotes.slice(half).map((n) => n.id);

    return [
      { slotId: "slot-1", invoiceNumber: inv1Num, noteIds: slot1Notes },
      { slotId: "slot-2", invoiceNumber: inv2Num, noteIds: slot2Notes },
    ];
  });

  const [maxItemsPerPage, setMaxItemsPerPage] = useState<number>(20);
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInvoices, setCreatedInvoices] = useState<Invoice[] | null>(null);

  // Map notes by ID for easy lookup
  const noteMap = useMemo(() => {
    const map = new Map<string, ClientNote>();
    selectedNotes.forEach((n) => map.set(n.id, n));
    return map;
  }, [selectedNotes]);

  // Compute contents for each slot
  const slotSummaries = useMemo(() => {
    return slots.map((slot, index) => {
      let totalAmount = 0;
      let totalItemsCount = 0;
      const notesInSlot: ClientNote[] = [];

      slot.noteIds.forEach((id) => {
        const note = noteMap.get(id);
        if (note) {
          notesInSlot.push(note);
          totalAmount += note.total;
          totalItemsCount += note.items.length;
        }
      });

      return {
        ...slot,
        index,
        notes: notesInSlot,
        totalAmount,
        totalItemsCount,
      };
    });
  }, [slots, noteMap]);

  if (!isOpen) return null;

  // Add new invoice slot
  const handleAddSlot = () => {
    const newSlotId = `slot-${Date.now()}`;
    const newInvNum = generateInvoiceNumber("INV");
    setSlots((prev) => [...prev, { slotId: newSlotId, invoiceNumber: newInvNum, noteIds: [] }]);
  };

  // Remove empty slot
  const handleRemoveSlot = (slotId: string) => {
    if (slots.length <= 1) return;
    const targetSlot = slots.find((s) => s.slotId === slotId);
    if (!targetSlot) return;

    // Move any notes back to the first available slot
    const notesToReassign = targetSlot.noteIds;
    setSlots((prev) => {
      const remaining = prev.filter((s) => s.slotId !== slotId);
      if (notesToReassign.length > 0 && remaining.length > 0) {
        remaining[0].noteIds = [...remaining[0].noteIds, ...notesToReassign];
      }
      return [...remaining];
    });
  };

  // Move note to specific slot
  const handleMoveNote = (noteId: string, targetSlotId: string) => {
    setSlots((prev) => {
      return prev.map((slot) => {
        if (slot.slotId === targetSlotId) {
          if (!slot.noteIds.includes(noteId)) {
            return { ...slot, noteIds: [...slot.noteIds, noteId] };
          }
          return slot;
        } else {
          return { ...slot, noteIds: slot.noteIds.filter((id) => id !== noteId) };
        }
      });
    });
  };

  // Smart Auto-Distribute based on max items per page
  const handleAutoDistribute = () => {
    const newSlots: InvoiceSlot[] = [];
    let currentSlotNotes: string[] = [];
    let currentItemCount = 0;

    selectedNotes.forEach((note) => {
      const noteItemCount = note.items.length || 1;
      if (currentItemCount > 0 && currentItemCount + noteItemCount > maxItemsPerPage) {
        // Create new slot
        newSlots.push({
          slotId: `slot-${Date.now()}-${newSlots.length}`,
          invoiceNumber: generateInvoiceNumber("INV"),
          noteIds: currentSlotNotes,
        });
        currentSlotNotes = [note.id];
        currentItemCount = noteItemCount;
      } else {
        currentSlotNotes.push(note.id);
        currentItemCount += noteItemCount;
      }
    });

    if (currentSlotNotes.length > 0) {
      newSlots.push({
        slotId: `slot-${Date.now()}-${newSlots.length}`,
        invoiceNumber: generateInvoiceNumber("INV"),
        noteIds: currentSlotNotes,
      });
    }

    if (newSlots.length === 0) {
      newSlots.push({
        slotId: `slot-${Date.now()}`,
        invoiceNumber: generateInvoiceNumber("INV"),
        noteIds: selectedNotes.map((n) => n.id),
      });
    }

    setSlots(newSlots);
  };

  // Confirm and Create Invoices
  const handleConfirmSplit = async () => {
    // Validate that every slot has at least one note
    const activeSlots = slots.filter((s) => s.noteIds.length > 0);
    if (activeSlots.length === 0) {
      alert("يرجى توزيع الملاحظات على الفواتير قبل التأكيد.");
      return;
    }

    setIsSubmitting(true);
    try {
      const batchNumber = `BATCH-${Date.now().toString(36).toUpperCase()}`;
      const totalBatchCount = activeSlots.length;
      const createdList: Invoice[] = [];

      for (let i = 0; i < activeSlots.length; i++) {
        const slot = activeSlots[i];
        const slotNotes = slot.noteIds.map((id) => noteMap.get(id)!).filter(Boolean);

        // Collect all items
        const invoiceItems: InvoiceItem[] = [];
        slotNotes.forEach((n) => {
          n.items.forEach((item) => {
            invoiceItems.push({
              productId: item.productId || "",
              productName: item.productName,
              productCode: item.productCode || "",
              quantity: item.quantity,
              price: item.unitPrice,
              total: item.total,
              unit: item.unit,
              isManual: item.isManual,
              originalNoteId: n.id,
              originalNoteDate: n.date,
            });
          });
        });

        const subtotal = invoiceItems.reduce((acc, it) => acc + it.total, 0);
        const invoiceId = generateId();

        const newInvoice: Invoice = {
          id: invoiceId,
          invoiceNumber: slot.invoiceNumber,
          customerId: customer.id,
          customerName: customer.name,
          date: invoiceDate,
          dueDate: invoiceDate,
          status: "pending",
          type: "sales",
          paymentMethod: "cash",
          items: invoiceItems,
          products: invoiceItems.map((it) => ({
            productId: it.productId,
            name: it.productName,
            price: it.price,
            quantity: it.quantity,
          })),
          subtotal,
          total: subtotal,
          discount: 0,
          tax: 0,
          notes: `فاتورة مجمعة (${i + 1} من ${totalBatchCount}) من ملاحظات العميل.`,
          clientNoteIds: slot.noteIds,
          batchNumber,
          batchIndex: i + 1,
          batchTotal: totalBatchCount,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Save locally
        const storeData = loadStoreData();
        if (!storeData.invoices) storeData.invoices = [];
        storeData.invoices.unshift(newInvoice);
        saveStoreData(storeData);

        // Record movements for this split invoice
        recordInvoiceMovements(newInvoice);

        // Save customer file entry
        saveCustomerFile({
          customerId: customer.id,
          customerName: customer.name,
          invoiceId: newInvoice.id,
          invoiceNumber: newInvoice.invoiceNumber,
          fileName: `فاتورة-${newInvoice.invoiceNumber}-${customer.name.replace(/[/\\?%*:|"<>]/g, "_")}-${invoiceDate}.pdf`,
          fileType: "pdf",
          date: invoiceDate,
          total: newInvoice.total,
        });

        // Upsert to DB if available
        try {
          await upsertInvoice({
            id: newInvoice.id,
            invoice_number: newInvoice.invoiceNumber,
            customer_id: customer.id,
            customer_name: customer.name,
            total: newInvoice.total,
            subtotal: newInvoice.subtotal,
            payment_method: newInvoice.paymentMethod,
            status: newInvoice.status,
            type: newInvoice.type,
            date: newInvoice.date,
            notes: newInvoice.notes,
          }, invoiceItems.map(it => ({
            product_id: it.productId,
            product_name: it.productName,
            quantity: it.quantity,
            price: it.price,
            total: it.total,
          })));
        } catch (err) {
          console.error("DB upsertInvoice error:", err);
        }

        createdList.push(newInvoice);

        // Update each note to converted
        for (const n of slotNotes) {
          const updatedNote: ClientNote = {
            ...n,
            status: "converted",
            convertedAt: new Date().toISOString(),
            invoiceIds: Array.from(new Set([...(n.invoiceIds || []), newInvoice.id])),
            updatedAt: new Date().toISOString(),
          };
          await upsertClientNote(updatedNote);
        }
      }

      setCreatedInvoices(createdList);
      onSuccess(createdList);
    } catch (err) {
      console.error("Error creating split invoices:", err);
      alert("حدث خطأ أثناء إنشاء الفواتير.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If already created, show completion screen with print buttons
  if (createdInvoices) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden text-right">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 text-center">
            <CheckCircle2 size={48} className="mx-auto mb-2 text-white" />
            <h3 className="text-2xl font-bold">تم تقسيم الملاحظات وإنشاء الفواتير بنجاح!</h3>
            <p className="text-emerald-100 text-sm mt-1">
              تم إنشاء {createdInvoices.length} فواتير وحفظها تلقائياً في ملف العميل.
            </p>
          </div>

          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <h4 className="font-bold text-gray-800 text-base mb-2">الفواتير المنشأة:</h4>
            {createdInvoices.map((inv, idx) => (
              <div
                key={inv.id}
                className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between hover:border-arab-blue transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-base">#{inv.invoiceNumber}</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                      فاتورة {inv.batchIndex} من {inv.batchTotal}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {inv.items.length} بنود • التاريخ: {inv.date}
                  </p>
                </div>
                <div className="text-left">
                  <span className="font-black text-emerald-600 text-lg block">
                    {formatCurrency(inv.total)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 p-4 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={() => {
                window.print();
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all"
            >
              <Printer size={18} />
              <span>طباعة الكل دفعة واحدة</span>
            </button>

            <button
              onClick={onClose}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2.5 rounded-xl font-medium transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden text-right border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-arab-blue to-arab-blue-dark text-white p-5 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <ArrowRightLeft size={24} className="text-blue-200" />
              <h2 className="text-xl font-bold">{t("splitInvoicesTitle") || "تقسيم الملاحظات على عدة فواتير"}</h2>
            </div>
            <p className="text-blue-100 text-xs mt-1">
              العميل: <span className="font-bold text-white">{customer.name}</span> • عدد الملاحظات المحددة: {selectedNotes.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        {/* Control Toolbar */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddSlot}
              className="bg-white hover:bg-blue-50 text-arab-blue border border-arab-blue/30 px-3.5 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus size={16} />
              <span>{t("addInvoiceSlot") || "إضافة فاتورة جديدة"}</span>
            </button>

            <button
              type="button"
              onClick={handleAutoDistribute}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3.5 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all"
              title="توزيع الملاحظات بحيث لا يتجاوز عدد بنود الفاتورة سعة الصفحة"
            >
              <Sparkles size={16} />
              <span>{t("autoDistribute") || "تقسيم تلقائي حسب سعة الصفحة"}</span>
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <span>أقصى بنود للورقة:</span>
              <input
                type="number"
                min="5"
                max="50"
                value={maxItemsPerPage}
                onChange={(e) => setMaxItemsPerPage(Number(e.target.value) || 20)}
                className="w-16 p-1 border border-gray-300 rounded text-center font-bold bg-white"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span>تاريخ الفواتير:</span>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="p-1 border border-gray-300 rounded text-xs bg-white font-sans"
              />
            </div>
          </div>
        </div>

        {/* Content: Invoices Slots Columns */}
        <div className="flex-1 overflow-x-auto p-4 md:p-6 bg-gray-100/70">
          <div className="flex gap-5 min-w-full items-start h-full">
            {slotSummaries.map((slot) => (
              <div
                key={slot.slotId}
                className="w-80 md:w-96 bg-white rounded-xl shadow-md border border-gray-200 flex flex-col max-h-full shrink-0 overflow-hidden"
              >
                {/* Slot Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-arab-blue text-base">
                      فاتورة {slot.index + 1}
                    </span>
                    {slots.length > 1 && (
                      <button
                        onClick={() => handleRemoveSlot(slot.slotId)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                        title={t("removeInvoiceSlot") || "حذف هذه الفاتورة"}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-gray-500 font-mono">#{slot.invoiceNumber}</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                      {slot.totalItemsCount} بند
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-blue-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500">مجموع الفاتورة:</span>
                    <span className="font-black text-emerald-600 text-base">
                      {formatCurrency(slot.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Slot Notes List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[160px]">
                  {slot.notes.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded-lg">
                      اسحب أو انقل ملاحظات إلى هذه الفاتورة
                    </div>
                  ) : (
                    slot.notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-arab-blue/50 transition-all text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-800 text-sm">{note.title}</span>
                          <span className="text-gray-400 font-sans">{formatShortDate(note.date)}</span>
                        </div>

                        <div className="text-gray-600 space-y-1 bg-white p-2 rounded border border-gray-100">
                          {note.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[11px]">
                              <span>
                                {it.productName} ({it.quantity} {it.unit || "وحدة"})
                              </span>
                              <span className="font-semibold text-gray-700">
                                {formatCurrency(it.total)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="font-bold text-emerald-600 text-xs">
                            المجموع: {formatCurrency(note.total)}
                          </span>

                          {/* Move to another slot selector */}
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400">نقل إلى:</span>
                            <select
                              value={slot.slotId}
                              onChange={(e) => handleMoveNote(note.id, e.target.value)}
                              className="text-[11px] p-1 border border-gray-300 rounded bg-white text-gray-700 font-semibold focus:ring-1 focus:ring-arab-blue"
                            >
                              {slots.map((s, sIdx) => (
                                <option key={s.slotId} value={s.slotId}>
                                  فاتورة {sIdx + 1}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-500">
            سيتم إنشاء <span className="font-bold text-gray-800">{slots.filter((s) => s.noteIds.length > 0).length}</span> فواتير متتالية وترقيمها تلقائياً.
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-medium text-sm transition-colors"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleConfirmSplit}
              disabled={isSubmitting || slots.every((s) => s.noteIds.length === 0)}
              className="bg-arab-blue hover:bg-arab-blue-dark disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري الإنشاء...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>{t("confirmCreateInvoices") || "تأكيد وإنشاء الفواتير"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
