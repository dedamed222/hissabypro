import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  StickyNote, Plus, Search, FileText, ArrowRightLeft,
  Calendar, User, Trash2, Edit, CheckCircle, Clock,
  Archive, X, AlertCircle, FileCheck, Folder, FolderOpen,
  ChevronRight, ArrowLeft, Eye, Printer, Layers
} from "lucide-react";
import { ClientNote, ClientNoteItem, Customer, Product, Invoice, InvoiceItem, CustomerFile, StoreInfo } from "@/types";
import { formatCurrency, formatShortDate } from "@/utils/formatters";
import {
  getClientNotes, upsertClientNote, deleteClientNote,
  updateProductDefaultPrice, getCustomers, getProducts,
  upsertCustomer, upsertInvoice, getInvoices, deleteInvoice,
} from "@/lib/database";
import {
  generateId, generateInvoiceNumber, loadStoreData,
  saveStoreData, saveCustomerFile, getCustomerFiles,
} from "@/utils/localStorage";
import { useLocale } from "@/hooks/useLocale";
import { PriceChangeDialog } from "@/components/shared/PriceChangeDialog";
import { SplitInvoicesModal } from "@/components/clientNotes/SplitInvoicesModal";
import ProfessionalInvoice from "@/components/invoice/ProfessionalInvoice";
import { recordInvoiceMovements, updateInvoiceMovements, revertInvoiceMovements } from "@/utils/productMovements";

const COMMON_UNITS_AR = ["قطعة", "كغ", "متر", "علبة", "كرتونة", "لتر", "حزمة", "وحدة"];
const COMMON_UNITS_FR = ["Pièce", "Kg", "Mètre", "Boîte", "Carton", "Litre", "Paquet", "Unité"];

export default function ClientNotes() {
  const { t, isRTL, locale } = useLocale();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const COMMON_UNITS = locale === "fr" ? COMMON_UNITS_FR : COMMON_UNITS_AR;

  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerFiles, setCustomerFiles] = useState<CustomerFile[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // View mode: "folders" (view each client as a file/folder) or "all" (flat list)
  const initialCustomerId = searchParams.get("customerId") || "all";
  const [viewMode, setViewMode] = useState<"folders" | "detail" | "all">(
    initialCustomerId !== "all" ? "detail" : "folders"
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId);
  const [detailTab, setDetailTab] = useState<"notes" | "files">("notes");
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);

  // Edit / Delete invoice inside client file
  const [isInvoiceEditOpen, setIsInvoiceEditOpen] = useState(false);
  const [editingInvoiceObj, setEditingInvoiceObj] = useState<Invoice | null>(null);
  const [editInvCustName, setEditInvCustName] = useState("");
  const [editInvDate, setEditInvDate] = useState("");
  const [editInvStatus, setEditInvStatus] = useState<"pending" | "paid" | "partial" | "cancelled">("pending");
  const [editInvPaymentMethod, setEditInvPaymentMethod] = useState("cash");
  const [editInvType, setEditInvType] = useState<"sales" | "quotation" | "debt">("sales");
  const [editInvNotes, setEditInvNotes] = useState("");
  const [editInvItems, setEditInvItems] = useState<Array<{ productName: string; quantity: number; price: number; total: number; productId?: string }>>([]);

  const [isInvoiceDeleteOpen, setIsInvoiceDeleteOpen] = useState(false);
  const [invoiceObjToDelete, setInvoiceObjToDelete] = useState<{ id?: string; invoiceNumber?: string; customerName?: string; fileName?: string } | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "converted" | "archived">("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);

  // Modals
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ClientNote | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<ClientNote | null>(null);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState("");
  const [quickCustomerPhone, setQuickCustomerPhone] = useState("");

  const [priceChangeInfo, setPriceChangeInfo] = useState<{
    isOpen: boolean; productId: string; productName: string;
    oldPrice: number; newPrice: number; costPrice?: number; itemIndex: number;
  }>({ isOpen: false, productId: "", productName: "", oldPrice: 0, newPrice: 0, costPrice: 0, itemIndex: -1 });

  // Form state
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formItems, setFormItems] = useState<ClientNoteItem[]>([]);
  const [isManualItem, setIsManualItem] = useState(false);
  const [selectedInventoryProduct, setSelectedInventoryProduct] = useState<Product | null>(null);
  const [manualName, setManualName] = useState("");
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemUnit, setItemUnit] = useState<string>(COMMON_UNITS[0]);
  const [itemPrice, setItemPrice] = useState<number>(0);
  const [saveManualToInventory, setSaveManualToInventory] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const localStore = loadStoreData();
      setStoreInfo(localStore.storeInfo);

      const [notesData, customersData, productsData] = await Promise.all([
        getClientNotes(), getCustomers(), getProducts(),
      ]);
      setNotes(notesData);
      setCustomers(customersData as any);
      setProducts(productsData as any);

      // Load local customer files & invoices
      const localFiles = localStore.customerFiles || [];
      const localInvoices = localStore.invoices || [];
      setCustomerFiles(localFiles);
      setInvoices(localInvoices);
    } catch (err) {
      console.error("Error loading:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (selectedCustomerId !== "all" && note.customerId !== selectedCustomerId) return false;
      if (statusFilter !== "all" && note.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!note.title?.toLowerCase().includes(q) &&
            !note.customerName?.toLowerCase().includes(q) &&
            !note.content?.toLowerCase().includes(q) &&
            !note.items?.some((it) => it.productName.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [notes, selectedCustomerId, statusFilter, searchQuery]);

  const selectedNotesList = useMemo(() => notes.filter((n) => selectedNoteIds.includes(n.id)), [notes, selectedNoteIds]);
  const selectedTotalSum = useMemo(() => selectedNotesList.reduce((acc, n) => acc + (n.total || 0), 0), [selectedNotesList]);

  const handleToggleSelectNote = (noteId: string) =>
    setSelectedNoteIds((prev) => prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]);
  const handleSelectAll = () => setSelectedNoteIds(filteredNotes.map((n) => n.id));
  const handleDeselectAll = () => setSelectedNoteIds([]);

  const handleOpenCreateNote = () => {
    setEditingNote(null);
    setFormCustomerId(selectedCustomerId !== "all" ? selectedCustomerId : (customers[0]?.id || ""));
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormTitle(locale === "fr" ? "Nouvelle note" : "ملاحظة جديدة");
    setFormContent(""); setFormItems([]); resetItemRow();
    setIsNoteModalOpen(true);
  };

  const handleOpenEditNote = (note: ClientNote) => {
    setEditingNote(note);
    setFormCustomerId(note.customerId); setFormDate(note.date);
    setFormTitle(note.title); setFormContent(note.content || "");
    setFormItems([...note.items]); resetItemRow();
    setIsNoteModalOpen(true);
  };

  const resetItemRow = () => {
    setIsManualItem(false); setSelectedInventoryProduct(null);
    setManualName(""); setItemQty(1); setItemUnit(COMMON_UNITS[0]);
    setItemPrice(0); setSaveManualToInventory(false);
  };

  const handleQuickAddCustomer = async () => {
    if (!quickCustomerName.trim()) return;
    try {
      const newCust = await upsertCustomer({ name: quickCustomerName.trim(), phone: quickCustomerPhone.trim() });
      if (newCust) { setCustomers((prev) => [newCust as any, ...prev]); setFormCustomerId(newCust.id); }
      setIsQuickCustomerOpen(false); setQuickCustomerName(""); setQuickCustomerPhone("");
    } catch (err) { console.error(err); }
  };

  const handleAddItemToNote = () => {
    const itemName = isManualItem ? manualName.trim() : selectedInventoryProduct?.name;
    if (!itemName || itemQty <= 0) {
      alert(locale === "fr" ? "Veuillez saisir un article avec une quantité valide" : "يرجى إدخال اسم الصنف وكمية صحيحة");
      return;
    }
    if (!isManualItem && selectedInventoryProduct && itemPrice !== selectedInventoryProduct.price) {
      setPriceChangeInfo({ isOpen: true, productId: selectedInventoryProduct.id, productName: selectedInventoryProduct.name, oldPrice: selectedInventoryProduct.price, newPrice: itemPrice, costPrice: selectedInventoryProduct.cost, itemIndex: formItems.length });
    }
    if (isManualItem && saveManualToInventory) {
      const newProd: Product = { id: generateId(), code: `PRD-${Date.now().toString().slice(-4)}`, name: itemName, price: itemPrice, cost: 0, quantity: itemQty, lowStockThreshold: 5, createdAt: new Date().toISOString() };
      const storeData = loadStoreData(); storeData.products.push(newProd); saveStoreData(storeData);
      setProducts((prev) => [...prev, newProd]);
    }
    setFormItems((prev) => [...prev, {
      id: generateId(),
      productId: isManualItem ? undefined : selectedInventoryProduct?.id,
      productName: itemName,
      productCode: isManualItem ? undefined : selectedInventoryProduct?.code,
      quantity: itemQty, unit: itemUnit, unitPrice: itemPrice,
      total: itemQty * itemPrice, isManual: isManualItem,
    }]);
    resetItemRow();
  };

  const handlePriceChoice = async (updateOriginal: boolean) => {
    if (updateOriginal && priceChangeInfo.productId) {
      await updateProductDefaultPrice(priceChangeInfo.productId, priceChangeInfo.newPrice, "note", editingNote?.id);
      setProducts((prev) => prev.map((p) => p.id === priceChangeInfo.productId ? { ...p, price: priceChangeInfo.newPrice } : p));
    }
    setPriceChangeInfo((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSaveNote = async () => {
    const cust = customers.find((c) => c.id === formCustomerId);
    if (!cust) { alert(locale === "fr" ? "Veuillez sélectionner un client" : "يرجى اختيار العميل"); return; }
    if (formItems.length === 0) { alert(locale === "fr" ? "Ajoutez au moins un article" : "أضف بنداً واحداً على الأقل"); return; }
    const noteTotal = formItems.reduce((acc, it) => acc + it.total, 0);
    const notePayload: ClientNote = {
      id: editingNote?.id || generateId(), customerId: cust.id, customerName: cust.name,
      title: formTitle.trim() || `${locale === "fr" ? "Note" : "ملاحظة"} - ${formatShortDate(formDate)}`,
      content: formContent.trim(), date: formDate, status: editingNote?.status || "open",
      items: formItems, total: noteTotal, invoiceIds: editingNote?.invoiceIds || [],
      createdAt: editingNote?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    try { await upsertClientNote(notePayload); setIsNoteModalOpen(false); loadAll(); }
    catch (err) { console.error(err); }
  };

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;
    try {
      await deleteClientNote(noteToDelete.id);
      setIsDeleteModalOpen(false); setNoteToDelete(null);
      setSelectedNoteIds((prev) => prev.filter((id) => id !== noteToDelete.id));
      loadAll();
    } catch (err) { console.error(err); }
  };

  const handleMergeToSingleInvoice = async () => {
    if (selectedNotesList.length === 0) return;
    const uniqueCustomerIds = Array.from(new Set(selectedNotesList.map((n) => n.customerId)));
    if (uniqueCustomerIds.length > 1) { alert(t("multiCustomerWarning")); return; }
    if (selectedNotesList.some((n) => n.status === "converted") && !confirm(t("alreadyConvertedWarning"))) return;
    const targetCustomer = customers.find((c) => c.id === uniqueCustomerIds[0]) || { id: uniqueCustomerIds[0], name: selectedNotesList[0].customerName, phone: "" };
    const sortedNotes = [...selectedNotesList].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const mergedItems: InvoiceItem[] = [];
    sortedNotes.forEach((note) => note.items.forEach((item) => mergedItems.push({ productId: item.productId || "", productName: item.productName, productCode: item.productCode || "", quantity: item.quantity, price: item.unitPrice, total: item.total, unit: item.unit, isManual: item.isManual, originalNoteId: note.id, originalNoteDate: note.date })));
    const subtotal = mergedItems.reduce((acc, it) => acc + it.total, 0);
    const invoiceNumber = generateInvoiceNumber("INV");
    const todayStr = new Date().toISOString().split("T")[0];
    const newInvoice: Invoice = { id: generateId(), invoiceNumber, customerId: targetCustomer.id, customerName: targetCustomer.name, date: todayStr, dueDate: todayStr, status: "pending", type: "sales", paymentMethod: "cash", items: mergedItems, products: mergedItems.map((it) => ({ productId: it.productId, name: it.productName, price: it.price, quantity: it.quantity })), subtotal, total: subtotal, discount: 0, tax: 0, notes: `${t("mergedInvoiceNotes")} ${sortedNotes.length} ${t("mergedInvoiceNotesCount")}`, clientNoteIds: sortedNotes.map((n) => n.id), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    try {
      const storeData = loadStoreData();
      if (!storeData.invoices) storeData.invoices = [];
      storeData.invoices.unshift(newInvoice);
      saveStoreData(storeData);
      recordInvoiceMovements(newInvoice);
      saveCustomerFile({
        customerId: targetCustomer.id,
        customerName: targetCustomer.name,
        invoiceId: newInvoice.id,
        invoiceNumber: newInvoice.invoiceNumber,
        fileName: `${locale === "fr" ? "Facture" : "فاتورة"}-${newInvoice.invoiceNumber}-${targetCustomer.name.replace(/[\/\\?%*:|"<>]/g, "_")}-${todayStr}.pdf`,
        fileType: "pdf",
        date: todayStr,
        total: newInvoice.total
      });
      try {
        await upsertInvoice({
          id: newInvoice.id,
          invoice_number: newInvoice.invoiceNumber,
          customer_id: targetCustomer.id,
          customer_name: targetCustomer.name,
          total: newInvoice.total,
          subtotal: newInvoice.subtotal,
          payment_method: newInvoice.paymentMethod,
          status: newInvoice.status,
          type: newInvoice.type,
          date: newInvoice.date,
          notes: newInvoice.notes,
        }, mergedItems.map(it => ({
          product_id: it.productId,
          product_name: it.productName,
          quantity: it.quantity,
          price: it.price,
          total: it.total,
        })));
      } catch (err) {
        console.error("DB upsertInvoice error:", err);
      }
      for (const n of sortedNotes) await upsertClientNote({ ...n, status: "converted", convertedAt: new Date().toISOString(), invoiceIds: Array.from(new Set([...(n.invoiceIds || []), newInvoice.id])) });
      setSelectedNoteIds([]); loadAll();
      alert(`${t("mergedInvoiceSuccess")} #${newInvoice.invoiceNumber} ${t("mergedInvoiceAmount")} ${formatCurrency(newInvoice.total)} ${t("mergedInvoiceSaved")}`);
      navigate("/archive");
    } catch (err) { console.error(err); }
  };

  const handleOpenSplitModal = () => {
    if (selectedNotesList.length === 0) return;
    if (Array.from(new Set(selectedNotesList.map((n) => n.customerId))).length > 1) { alert(t("multiCustomerSplitWarning")); return; }
    setIsSplitModalOpen(true);
  };

  const selectedCustomerName = useMemo(() => customers.find((c) => c.id === selectedCustomerId)?.name, [customers, selectedCustomerId]);
  const currentCustomerObj = useMemo(() => customers.find((c) => c.id === selectedCustomerId), [customers, selectedCustomerId]);
  const openNotesCount = useMemo(() => notes.filter((n) => (selectedCustomerId === "all" || n.customerId === selectedCustomerId) && n.status === "open").length, [notes, selectedCustomerId]);

  const targetCustomerForSplit = useMemo(() => {
    if (!selectedNotesList.length) return null;
    const custId = selectedNotesList[0].customerId;
    return customers.find((c) => c.id === custId) || { id: custId, name: selectedNotesList[0].customerName, phone: "" };
  }, [selectedNotesList, customers]);

  // Aggregate stats per customer for the Folder/File view
  const customerFolderCards = useMemo(() => {
    return customers.map((c) => {
      const custNotes = notes.filter((n) => n.customerId === c.id);
      const custFiles = customerFiles.filter((f) => f.customerId === c.id);
      const openNotes = custNotes.filter((n) => n.status === "open");
      const convertedNotes = custNotes.filter((n) => n.status === "converted");
      const openTotal = openNotes.reduce((acc, n) => acc + (n.total || 0), 0);
      const allNotesTotal = custNotes.reduce((acc, n) => acc + (n.total || 0), 0);

      // Latest activity date
      const dates = [
        ...custNotes.map((n) => n.date || n.createdAt),
        ...custFiles.map((f) => f.date || f.createdAt),
      ].filter(Boolean);
      const latestDate = dates.length ? dates.sort().reverse()[0] : null;

      return {
        customer: c,
        totalNotes: custNotes.length,
        openNotesCount: openNotes.length,
        convertedCount: convertedNotes.length,
        totalFiles: custFiles.length,
        openTotal,
        allNotesTotal,
        latestDate,
      };
    }).filter((folder) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        folder.customer.name.toLowerCase().includes(q) ||
        (folder.customer.phone && folder.customer.phone.includes(q)) ||
        (folder.customer.company && folder.customer.company.toLowerCase().includes(q))
      );
    });
  }, [customers, notes, customerFiles, searchQuery]);

  const currentClientFiles = useMemo(() => {
    if (selectedCustomerId === "all") return customerFiles;
    return customerFiles.filter((f) => f.customerId === selectedCustomerId);
  }, [customerFiles, selectedCustomerId]);

  const handleOpenClientFolder = (custId: string) => {
    setSelectedCustomerId(custId);
    setViewMode("detail");
    setDetailTab("notes");
    setSearchParams({ customerId: custId });
  };

  const handleBackToFolders = () => {
    setSelectedCustomerId("all");
    setViewMode("folders");
    setSelectedNoteIds([]);
    setSearchParams({});
  };

  const handlePrintInvoice = (invId?: string, invNum?: string) => {
    const inv = invoices.find((i) => (invId && i.id === invId) || (invNum && i.invoiceNumber === invNum));
    if (inv) {
      setSelectedInvoiceForPrint(inv);
      setTimeout(() => window.print(), 150);
    } else {
      navigate(`/archive?search=${invNum || ""}`);
    }
  };

  // ── Invoice Edit / Delete handlers (inside client files tab) ──
  const handleOpenInvoiceEdit = (file: CustomerFile) => {
    const inv = invoices.find((i) => i.id === file.invoiceId || i.invoiceNumber === file.invoiceNumber);
    if (!inv) {
      alert(locale === "fr" ? "Facture introuvable localement" : "لم يتم العثور على الفاتورة محلياً");
      return;
    }
    setEditingInvoiceObj(inv);
    setEditInvCustName(inv.customerName || "");

    // Extract YYYY-MM-DD from inv.date or inv.createdAt
    const rawDate = inv.date || inv.createdAt || "";
    let dStr = "";
    if (rawDate) {
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          dStr = d.toISOString().split("T")[0];
        } else if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
          dStr = rawDate.slice(0, 10);
        }
      } catch {
        dStr = "";
      }
    }
    setEditInvDate(dStr || new Date().toISOString().split("T")[0]);

    setEditInvStatus(inv.status || "pending");
    setEditInvPaymentMethod(inv.paymentMethod || "cash");
    setEditInvType(inv.type || "sales");
    setEditInvNotes(inv.notes || "");
    setEditInvItems((inv.items || []).map((it) => ({
      productName: it.productName,
      quantity: it.quantity,
      price: it.price,
      total: it.total,
      productId: it.productId,
    })));
    setIsInvoiceEditOpen(true);
  };

  const handleSaveInvoiceEdit = async () => {
    if (!editingInvoiceObj) return;
    const computedTotal = editInvItems.reduce((acc, it) => acc + (it.total || 0), 0);

    let finalCreatedAt = editingInvoiceObj.createdAt;
    const finalDate = editInvDate || editingInvoiceObj.date || new Date().toISOString().split("T")[0];
    if (editInvDate) {
      try {
        const oldTime = editingInvoiceObj.createdAt && editingInvoiceObj.createdAt.includes("T")
          ? editingInvoiceObj.createdAt.split("T")[1]
          : "12:00:00.000Z";
        const timePart = oldTime.split(".")[0] || "12:00:00";
        finalCreatedAt = new Date(`${editInvDate}T${timePart}`).toISOString();
      } catch {
        finalCreatedAt = new Date(editInvDate).toISOString();
      }
    }

    const updatedInvoice: Invoice = {
      ...editingInvoiceObj,
      customerName: editInvCustName.trim() || editingInvoiceObj.customerName,
      status: editInvStatus,
      paymentMethod: editInvPaymentMethod,
      type: editInvType,
      date: finalDate,
      createdAt: finalCreatedAt,
      notes: editInvNotes,
      subtotal: computedTotal,
      total: computedTotal,
      items: editInvItems.map((it) => ({
        productId: it.productId || "",
        productName: it.productName,
        productCode: "",
        quantity: it.quantity,
        price: it.price,
        total: it.total,
      })),
      products: editInvItems.map((it) => ({
        productId: it.productId || "",
        quantity: it.quantity,
        price: it.price,
        name: it.productName,
      })),
      updatedAt: new Date().toISOString(),
    };

    // Update locally
    const store = loadStoreData();
    if (!store.invoices) store.invoices = [];
    const idx = store.invoices.findIndex((i) => i.id === updatedInvoice.id || i.invoiceNumber === updatedInvoice.invoiceNumber);
    if (idx >= 0) {
      store.invoices[idx] = updatedInvoice;
    } else {
      store.invoices.unshift(updatedInvoice);
    }
    if (store.customerFiles) {
      store.customerFiles = store.customerFiles.map((f) =>
        (f.invoiceId === updatedInvoice.id || f.invoiceNumber === updatedInvoice.invoiceNumber)
          ? { ...f, customerName: updatedInvoice.customerName, total: updatedInvoice.total, date: finalDate }
          : f
      );
    }
    saveStoreData(store);

    // Update product movement records for this edited invoice
    updateInvoiceMovements(updatedInvoice);

    // Update in Supabase
    try {
      await upsertInvoice({
        id: updatedInvoice.id,
        invoice_number: updatedInvoice.invoiceNumber,
        customer_id: updatedInvoice.customerId,
        customer_name: updatedInvoice.customerName,
        total: updatedInvoice.total,
        subtotal: updatedInvoice.subtotal,
        payment_method: updatedInvoice.paymentMethod,
        status: updatedInvoice.status,
        type: updatedInvoice.type,
        date: updatedInvoice.date,
        created_at: updatedInvoice.createdAt,
        notes: updatedInvoice.notes,
      }, editInvItems.map((it) => ({
        product_id: it.productId,
        product_name: it.productName,
        quantity: it.quantity,
        price: it.price,
        total: it.total,
      })));
    } catch (err) {
      console.error("Error updating invoice in DB:", err);
    }

    setIsInvoiceEditOpen(false);
    setEditingInvoiceObj(null);
    loadAll();
    alert(t("invoiceUpdatedSuccess"));
  };

  const handleDeleteInvoiceFile = async () => {
    if (!invoiceObjToDelete) return;
    const invId = invoiceObjToDelete.id;
    const invNum = invoiceObjToDelete.invoiceNumber;

    // Remove locally
    const store = loadStoreData();
    if (store.invoices) {
      store.invoices = store.invoices.filter((i) => i.id !== invId && i.invoiceNumber !== invNum);
    }
    if (store.customerFiles) {
      store.customerFiles = store.customerFiles.filter((f) => f.invoiceId !== invId && f.invoiceNumber !== invNum);
    }
    saveStoreData(store);

    // Revert/cancel movements associated with this deleted invoice
    revertInvoiceMovements(invId, invNum);

    // Remove from Supabase
    try {
      if (invId) await deleteInvoice(invId);
    } catch (err) {
      console.error("Error deleting invoice from DB:", err);
    }

    setIsInvoiceDeleteOpen(false);
    setInvoiceObjToDelete(null);
    loadAll();
    alert(t("invoiceDeletedSuccess"));
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50" dir={isRTL ? "rtl" : "ltr"}>

      {/* ── PAGE HEADER ─────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-3 space-y-3 sticky top-0 z-30">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {viewMode === "detail" ? (
              <button
                onClick={handleBackToFolders}
                className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors flex items-center gap-1 text-xs font-bold"
                title={t("backToFolders")}
              >
                <ArrowLeft size={18} className={isRTL ? "rotate-180" : ""} />
                <span className="hidden sm:inline">{t("backToFolders")}</span>
              </button>
            ) : (
              <div className="p-2 bg-arab-blue/10 rounded-xl">
                <FolderOpen size={22} className="text-arab-blue" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-gray-900 text-lg leading-tight">
                {viewMode === "detail" && currentCustomerObj ? (
                  <span className="flex items-center gap-2">
                    <span className="text-gray-500 font-medium text-sm hidden sm:inline">{t("clientNotes")} /</span>
                    <span className="text-arab-blue">{currentCustomerObj.name}</span>
                  </span>
                ) : (
                  t("clientNotes")
                )}
              </h1>
              {viewMode === "detail" && currentCustomerObj ? (
                <p className="text-xs text-gray-500">
                  {currentCustomerObj.phone ? `${currentCustomerObj.phone} · ` : ""}
                  <span className="text-emerald-600 font-bold">{openNotesCount} {t("openNotesCount")}</span>
                </p>
              ) : (
                <p className="text-gray-400 text-xs">{t("clientNotesDesc")}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCreateNote}
              className="flex items-center gap-1.5 bg-arab-blue hover:bg-arab-blue-dark text-white px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all"
            >
              <Plus size={16} /> {t("newNote")}
            </button>
          </div>
        </div>

        {/* View Switcher: Folders vs All Notes */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => { setViewMode("folders"); setSelectedCustomerId("all"); setSearchParams({}); }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "folders" ? "bg-white text-arab-blue shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Folder size={15} />
              <span>{t("foldersView")}</span>
              <span className="bg-blue-100 text-arab-blue px-1.5 py-0.2 rounded-full text-[10px]">
                {customers.length}
              </span>
            </button>
            <button
              onClick={() => { setViewMode("all"); setSelectedCustomerId("all"); setSearchParams({}); }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "all" ? "bg-white text-arab-blue shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Layers size={15} />
              <span>{t("allNotesView")}</span>
              <span className="bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded-full text-[10px]">
                {notes.length}
              </span>
            </button>
          </div>

          {/* Quick client select dropdown for quick jumping */}
          <div className="hidden sm:block w-56">
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "all") {
                  handleBackToFolders();
                } else {
                  handleOpenClientFolder(val);
                }
              }}
              className="w-full p-2 text-xs border border-gray-200 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-arab-blue"
            >
              <option value="all">📂 {t("allCustomers")} ({customers.length})</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>👤 {c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* In detail view: Tabs for Notes vs Files */}
        {viewMode === "detail" && (
          <div className="flex gap-2 border-b border-gray-100 pt-1">
            <button
              onClick={() => setDetailTab("notes")}
              className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                detailTab === "notes"
                  ? "border-arab-blue text-arab-blue"
                  : "border-transparent text-gray-400 hover:text-gray-700"
              }`}
            >
              <StickyNote size={14} />
              <span>{t("viewCustomerNotes")}</span>
              <span className="text-[10px] bg-blue-50 text-arab-blue px-2 py-0.5 rounded-full font-sans">
                {filteredNotes.length}
              </span>
            </button>
            <button
              onClick={() => setDetailTab("files")}
              className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                detailTab === "files"
                  ? "border-arab-blue text-arab-blue"
                  : "border-transparent text-gray-400 hover:text-gray-700"
              }`}
            >
              <FileText size={14} />
              <span>{t("viewCustomerFiles")}</span>
              <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-sans">
                {currentClientFiles.length}
              </span>
            </button>
          </div>
        )}

        {/* Filter controls row */}
        {(viewMode === "all" || (viewMode === "detail" && detailTab === "notes")) && (
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {(["open", "converted", "all"] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === s ? "bg-white text-arab-blue shadow-sm" : "text-gray-500"
                }`}>
                {s === "open" ? t("openStatus") : s === "converted" ? t("convertedStatus") : t("all")}
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={15} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRTL ? "right-3" : "left-3"}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              viewMode === "folders"
                ? (locale === "fr" ? "Rechercher un dossier client..." : "ابحث عن ملف عميل بالاسم أو الهاتف...")
                : t("searchNotesPlaceholder")
            }
            className={`w-full py-2.5 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-arab-blue ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"}`}
          />
        </div>
      </div>

      {/* ── CONTENT BODY ───────────────────────────── */}
      <div className="flex-1 px-3 py-3 space-y-3 pb-44">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-9 h-9 border-4 border-arab-blue border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">{t("loadingNotes")}</p>
          </div>
        ) : viewMode === "folders" ? (
          /* ── FOLDERS VIEW: A file/folder for each client ── */
          customerFolderCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <Folder size={52} className="text-gray-300" />
              <p className="text-gray-600 font-semibold">{t("noMatchingNotes")}</p>
              <button
                onClick={() => setIsQuickCustomerOpen(true)}
                className="flex items-center gap-2 bg-arab-blue text-white px-5 py-2.5 rounded-xl font-bold text-sm mt-1"
              >
                <Plus size={16} /> {t("quickAddCustomer")}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {customerFolderCards.map(({ customer, totalNotes, openNotesCount: oCount, convertedCount, totalFiles, openTotal, latestDate }) => (
                <div
                  key={customer.id}
                  onClick={() => handleOpenClientFolder(customer.id)}
                  className="bg-white border border-gray-200 hover:border-arab-blue rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between gap-3 relative overflow-hidden"
                >
                  {/* Accent Top Bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${oCount > 0 ? "bg-amber-400" : "bg-emerald-400"}`} />

                  {/* Top info */}
                  <div className="flex items-start justify-between gap-2 pt-1">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/15 text-arab-blue flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Folder size={22} className="text-arab-blue fill-blue-50" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-base truncate group-hover:text-arab-blue transition-colors">
                          {customer.name}
                        </h3>
                        <p className="text-xs text-gray-400 truncate font-sans">
                          {customer.phone || customer.company || (locale === "fr" ? "Dossier client" : "ملف العميل")}
                        </p>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <span className="font-black text-lg text-emerald-600 font-sans block leading-tight">
                        {formatCurrency(openTotal)}
                      </span>
                      <span className="text-[10px] text-gray-400">{t("folderOpenTotal")}</span>
                    </div>
                  </div>

                  {/* Badges / Stats */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
                    <div className="flex items-center gap-1 text-xs bg-amber-50 text-amber-800 px-2.5 py-1 rounded-xl font-bold">
                      <Clock size={12} />
                      <span className="font-sans">{oCount}</span>
                      <span className="text-[11px] font-normal">{t("openStatus")}</span>
                    </div>

                    {convertedCount > 0 && (
                      <div className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-xl font-medium">
                        <FileCheck size={12} />
                        <span className="font-sans">{convertedCount}</span>
                      </div>
                    )}

                    {totalFiles > 0 && (
                      <div className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-xl font-medium">
                        <FileText size={12} />
                        <span className="font-sans">{totalFiles}</span>
                        <span className="text-[10px]">{locale === "fr" ? "factures" : "فواتير"}</span>
                      </div>
                    )}

                    <div className={`mr-auto ${isRTL ? "mr-auto" : "ml-auto"} flex items-center gap-1 text-arab-blue font-bold text-xs group-hover:translate-x-0.5 transition-transform`}>
                      <span>{t("openFolder")}</span>
                      <ChevronRight size={14} className={isRTL ? "rotate-180" : ""} />
                    </div>
                  </div>

                  {/* Footer note */}
                  {latestDate && (
                    <div className="text-[10px] text-gray-400 flex items-center justify-between">
                      <span>{locale === "fr" ? "Dernière activité:" : "آخر حركة:"}</span>
                      <span className="font-sans">{formatShortDate(latestDate)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : viewMode === "detail" && detailTab === "files" ? (
          /* ── DETAIL VIEW - SAVED FILES & INVOICES TAB ── */
          currentClientFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <FileText size={48} className="text-gray-300" />
              <p className="text-gray-600 font-semibold">{t("noCustomerFilesYet")}</p>
              <p className="text-gray-400 text-xs max-w-sm">
                {locale === "fr"
                  ? "Lorsque vous fusionnez ou divisez les notes de ce client en factures, elles apparaîtront automatiquement ici dans son dossier."
                  : "عند دمج أو تقسيم ملاحظات هذا العميل إلى فواتير، ستظهر وتُحفظ تلقائياً هنا في ملفه الخاص."}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {currentClientFiles.map((file) => (
                <div
                  key={file.id}
                  className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 truncate font-sans">
                          {file.invoiceNumber ? `#${file.invoiceNumber}` : file.fileName}
                        </span>
                        <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          {locale === "fr" ? "PDF / Facture" : "PDF / فاتورة"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 font-sans">
                        {formatShortDate(file.date)} · <span className="font-bold text-gray-700">{formatCurrency(file.total)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handlePrintInvoice(file.invoiceId, file.invoiceNumber)}
                      className="flex items-center gap-1.5 bg-gray-100 hover:bg-arab-blue hover:text-white text-gray-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    >
                      <Printer size={14} />
                      <span className="hidden sm:inline">{locale === "fr" ? "Imprimer" : "طباعة"}</span>
                    </button>
                    <button
                      onClick={() => handleOpenInvoiceEdit(file)}
                      className="p-2 text-gray-400 hover:text-arab-blue hover:bg-blue-50 rounded-xl transition-colors"
                      title={t("editInvoice")}
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      onClick={() => {
                        setInvoiceObjToDelete({ id: file.invoiceId, invoiceNumber: file.invoiceNumber, customerName: file.customerName, fileName: file.fileName });
                        setIsInvoiceDeleteOpen(true);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      title={t("deleteInvoice")}
                    >
                      <Trash2 size={15} />
                    </button>
                    <button
                      onClick={() => navigate(`/archive?search=${file.invoiceNumber || ""}`)}
                      className="p-2 text-gray-400 hover:text-arab-blue hover:bg-blue-50 rounded-xl transition-colors"
                      title={locale === "fr" ? "Voir dans l'archive" : "عرض في الأرشيف"}
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* ── NOTES LIST (FOR SPECIFIC CLIENT OR ALL NOTES) ── */
          filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <StickyNote size={52} className="text-gray-300" />
              <p className="text-gray-600 font-semibold">{t("noMatchingNotes")}</p>
              <p className="text-gray-400 text-sm max-w-xs">{t("noMatchingNotesDesc")}</p>
              <button onClick={handleOpenCreateNote}
                className="flex items-center gap-2 bg-arab-blue text-white px-5 py-2.5 rounded-xl font-bold text-sm mt-1">
                <Plus size={16} /> {t("addNoteNow")}
              </button>
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isSelected = selectedNoteIds.includes(note.id);
              return (
                <div
                  key={note.id}
                  onClick={() => handleToggleSelectNote(note.id)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer transition-all select-none border-2 ${
                    isSelected
                      ? "bg-blue-50 border-arab-blue shadow-sm"
                      : "bg-white border-transparent shadow-sm hover:border-gray-200"
                  }`}
                >
                  {/* LEFT: Total amount */}
                  <div className="shrink-0 min-w-[80px]">
                    <span className={`font-black text-xl font-sans ${isSelected ? "text-arab-blue" : "text-gray-800"}`}>
                      {formatCurrency(note.total)}
                    </span>
                  </div>

                  {/* CENTER: Note info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${isSelected ? "text-arab-blue" : "text-gray-900"}`}>
                      {note.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                      <span className="font-sans">{formatShortDate(note.date)}</span>
                      <span>·</span>
                      <span>{note.items.length} {locale === "fr" ? "articles" : "بنود"}</span>
                      {selectedCustomerId === "all" && (
                        <><span>·</span><span className="text-arab-blue font-medium truncate">{note.customerName}</span></>
                      )}
                    </div>
                    {/* Status */}
                    {note.status === "converted" && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        <FileCheck size={9} /> {t("convertedStatus")}
                      </span>
                    )}
                    {note.status === "archived" && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        <Archive size={9} /> {t("archivedStatus")}
                      </span>
                    )}
                  </div>

                  {/* RIGHT: Checkbox circle + action buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Edit / Delete - stop propagation */}
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleOpenEditNote(note)}
                        className="p-1.5 text-gray-400 hover:text-arab-blue hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => { setNoteToDelete(note); setIsDeleteModalOpen(true); }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Circle checkbox */}
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? "bg-arab-blue border-arab-blue" : "border-gray-300"
                    }`}>
                      {isSelected && <CheckCircle size={16} className="text-white fill-white" />}
                    </div>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>

      {/* ── BOTTOM ACTION BAR (When notes selected) ───── */}
      {selectedNoteIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-arab-blue shadow-xl transition-all duration-300">
          <div className="px-4 py-3 space-y-3">
            {/* Total + count row */}
            <div className="flex items-center justify-between">
              <span className="font-black text-2xl text-gray-900 font-sans">{formatCurrency(selectedTotalSum)}</span>
              <span className="text-sm text-gray-500">
                {locale === "fr" ? "Sélectionné:" : "محدد:"}{" "}
                <span className="font-bold text-arab-blue">{selectedNoteIds.length} {t("selectedNotesCount")}</span>
              </span>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              {/* Merge button */}
              <button onClick={handleMergeToSingleInvoice}
                className="flex items-center justify-center gap-2 bg-arab-blue hover:bg-arab-blue-dark text-white py-3 rounded-2xl font-bold text-sm shadow-md transition-all">
                <FileText size={18} />
                {t("mergeToInvoice")}
              </button>
              {/* Split button */}
              <button onClick={handleOpenSplitModal}
                className="flex items-center justify-center gap-2 border-2 border-gray-300 text-gray-700 hover:border-arab-blue hover:text-arab-blue bg-white py-3 rounded-2xl font-bold text-sm transition-all">
                <ArrowRightLeft size={18} />
                {t("splitToInvoices")}
              </button>
            </div>

            {/* Select all / deselect */}
            <div className="flex items-center justify-between pt-1">
              <button onClick={handleDeselectAll} className="text-sm font-semibold text-arab-blue hover:underline">
                {t("deselectAll")}
              </button>
              <button onClick={handleSelectAll} className="text-sm font-semibold text-arab-blue hover:underline">
                {t("selectAll")} ({filteredNotes.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTE FORM MODAL ────────────────────────── */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className={`bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col max-h-[95vh] ${isRTL ? "text-right" : "text-left"}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-gray-900 text-base">
                {editingNote ? t("editNote") : t("createNote")}
              </h3>
              <button onClick={() => setIsNoteModalOpen(false)}
                className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Customer + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-gray-700">{t("customer")} <span className="text-red-500">*</span></label>
                    <button onClick={() => setIsQuickCustomerOpen(true)} className="text-[11px] text-arab-blue font-bold hover:underline flex items-center gap-0.5">
                      <Plus size={11} /> {locale === "fr" ? "Nouveau" : "جديد"}
                    </button>
                  </div>
                  <select value={formCustomerId} onChange={(e) => setFormCustomerId(e.target.value)}
                    className="w-full p-2.5 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-arab-blue">
                    <option value="">-- {t("customer")} --</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ""}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">{t("date")}</label>
                  <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                    className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-arab-blue font-sans" />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">{t("noteTitle")}</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={t("noteTitlePlaceholder")}
                  className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-arab-blue" />
              </div>

              {/* Items Section */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                {/* Items header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <h4 className="font-bold text-gray-800 text-sm">{t("noteItems")}</h4>
                  <div className="flex gap-1 bg-white border border-gray-200 p-0.5 rounded-lg">
                    <button type="button"
                      onClick={() => { setIsManualItem(false); resetItemRow(); }}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${!isManualItem ? "bg-arab-blue text-white" : "text-gray-500"}`}>
                      {t("fromInventory")}
                    </button>
                    <button type="button"
                      onClick={() => { setIsManualItem(true); resetItemRow(); setIsManualItem(true); }}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${isManualItem ? "bg-arab-blue text-white" : "text-gray-500"}`}>
                      {t("manualEntry")}
                    </button>
                  </div>
                </div>

                {/* Input row */}
                <div className="p-3 bg-blue-50/40 border-b border-gray-100">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <label className="block text-[11px] text-gray-500 mb-1">
                        {isManualItem ? t("manualItemName") : t("inventoryItemName")}
                      </label>
                      {isManualItem ? (
                        <input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)}
                          placeholder={t("manualItemPlaceholder")}
                          className="w-full p-2 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-arab-blue" />
                      ) : (
                        <select value={selectedInventoryProduct?.id || ""}
                          onChange={(e) => { const p = products.find((prod) => prod.id === e.target.value); setSelectedInventoryProduct(p || null); if (p) setItemPrice(p.price); }}
                          className="w-full p-2 text-xs border border-gray-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-arab-blue">
                          <option value="">{t("chooseFromInventory")}</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.price)}) [{locale === "fr" ? "Disp." : "المتاح"}: {p.quantity}]</option>)}
                        </select>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] text-gray-500 mb-1">{t("productQuantity")}</label>
                      <input type="number" min="0.01" step="any" value={itemQty} onChange={(e) => setItemQty(Number(e.target.value))}
                        className="w-full p-2 text-xs border border-gray-200 rounded-lg text-center font-bold font-sans outline-none focus:ring-1 focus:ring-arab-blue" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] text-gray-500 mb-1">{t("unit")}</label>
                      <select value={itemUnit} onChange={(e) => setItemUnit(e.target.value)}
                        className="w-full p-2 text-xs border border-gray-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-arab-blue">
                        {COMMON_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] text-gray-500 mb-1">{t("unitPrice")}</label>
                      <input type="number" min="0" step="any" value={itemPrice} onChange={(e) => setItemPrice(Number(e.target.value))}
                        className="w-full p-2 text-xs border border-gray-200 rounded-lg text-center font-bold font-sans outline-none focus:ring-1 focus:ring-arab-blue" />
                    </div>
                    <div className="col-span-1">
                      <button type="button" onClick={handleAddItemToNote}
                        className="w-full bg-arab-blue hover:bg-arab-blue-dark text-white p-2 rounded-lg font-bold flex items-center justify-center">
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                  {isManualItem && (
                    <label className="flex items-center gap-2 mt-2 cursor-pointer text-xs text-gray-600">
                      <input type="checkbox" checked={saveManualToInventory} onChange={(e) => setSaveManualToInventory(e.target.checked)} className="rounded text-arab-blue" />
                      {t("saveToProducts")}
                    </label>
                  )}
                </div>

                {/* Items table */}
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className={`py-2 px-3 font-semibold ${isRTL ? "text-right" : "text-left"}`}>{t("itemName")}</th>
                      <th className="py-2 px-2 text-center font-semibold">{t("productQuantity")}</th>
                      <th className="py-2 px-2 text-center font-semibold">{t("unit")}</th>
                      <th className={`py-2 px-3 font-semibold ${isRTL ? "text-left" : "text-right"}`}>{t("total")}</th>
                      <th className="py-2 px-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {formItems.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-5 text-gray-400">{t("noItemsAdded")}</td></tr>
                    ) : formItems.map((it, idx) => (
                      <tr key={it.id || idx} className="hover:bg-gray-50">
                        <td className="py-2 px-3 font-semibold text-gray-800">
                          {it.productName}
                          {it.isManual && <span className="mx-1 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">{t("manualBadge")}</span>}
                        </td>
                        <td className="py-2 px-2 text-center text-gray-600 font-sans">{it.quantity}</td>
                        <td className="py-2 px-2 text-center text-gray-500">{it.unit}</td>
                        <td className={`py-2 px-3 font-bold text-emerald-600 font-sans ${isRTL ? "text-left" : "text-right"}`}>{formatCurrency(it.total)}</td>
                        <td className="py-2 px-2 text-center">
                          <button onClick={() => setFormItems((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Total */}
                {formItems.length > 0 && (
                  <div className="flex justify-between items-center px-4 py-2.5 bg-emerald-50 border-t border-emerald-100">
                    <span className="text-xs font-bold text-emerald-800">{t("noteTotal")}:</span>
                    <span className="font-black text-emerald-700 text-base font-sans">
                      {formatCurrency(formItems.reduce((acc, it) => acc + it.total, 0))}
                    </span>
                  </div>
                )}
              </div>

              {/* Free text */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">{t("noteContent")}</label>
                <textarea rows={2} value={formContent} onChange={(e) => setFormContent(e.target.value)}
                  placeholder={t("noteContentPlaceholder")}
                  className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-arab-blue resize-none" />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
              <button onClick={() => setIsNoteModalOpen(false)}
                className="flex-1 py-3 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 font-medium text-sm transition-colors">
                {t("cancel")}
              </button>
              <button onClick={handleSaveNote}
                className="flex-1 py-3 rounded-xl bg-arab-blue hover:bg-arab-blue-dark text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2">
                <CheckCircle size={18} />
                {editingNote ? t("saveEdits") : t("saveNote")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QUICK ADD CUSTOMER MODAL ── */}
      {isQuickCustomerOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4 ${isRTL ? "text-right" : "text-left"}`}>
            <h3 className="font-bold text-gray-900">{t("quickAddCustomerTitle")}</h3>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t("name")}:</label>
              <input type="text" value={quickCustomerName} onChange={(e) => setQuickCustomerName(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-arab-blue" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t("phone")}:</label>
              <input type="text" dir="ltr" value={quickCustomerPhone} onChange={(e) => setQuickCustomerPhone(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-arab-blue text-left" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsQuickCustomerOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm">
                {t("cancel")}
              </button>
              <button onClick={handleQuickAddCustomer}
                className="flex-1 py-2.5 rounded-xl bg-arab-blue text-white font-bold text-sm">
                {t("addAndSelect")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION ── */}
      {isDeleteModalOpen && noteToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 text-center ${isRTL ? "text-right" : "text-left"}`}>
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">{t("confirmDeleteNote")}</h3>
            <p className="text-sm text-gray-500">
              {t("confirmDeleteNoteMsg")} "<span className="font-bold text-gray-800">{noteToDelete.title}</span>" {t("forCustomer")} {noteToDelete.customerName}؟
            </p>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm">
                {t("cancel")}
              </button>
              <button onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm">
                {t("yesDelete")}
              </button>
            </div>
          </div>
        </div>
      )}

      <PriceChangeDialog
        isOpen={priceChangeInfo.isOpen}
        productName={priceChangeInfo.productName}
        oldPrice={priceChangeInfo.oldPrice}
        newPrice={priceChangeInfo.newPrice}
        costPrice={priceChangeInfo.costPrice}
        onChoice={handlePriceChoice}
        onCancel={() => setPriceChangeInfo((prev) => ({ ...prev, isOpen: false }))}
      />

      {isSplitModalOpen && targetCustomerForSplit && (
        <SplitInvoicesModal
          isOpen={isSplitModalOpen}
          onClose={() => setIsSplitModalOpen(false)}
          selectedNotes={selectedNotesList}
          customer={targetCustomerForSplit as Customer}
          onSuccess={() => { loadAll(); setSelectedNoteIds([]); }}
        />
      )}

      {/* ── EDIT INVOICE MODAL (Client Files Tab) ── */}
      {isInvoiceEditOpen && editingInvoiceObj && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className={`bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col max-h-[95vh] ${isRTL ? "text-right" : "text-left"}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-gray-900 text-base">
                {t("editInvoice")} #{editingInvoiceObj.invoiceNumber}
              </h3>
              <button onClick={() => { setIsInvoiceEditOpen(false); setEditingInvoiceObj(null); }}
                className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Customer Name & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">{t("customer")}</label>
                  <input type="text" value={editInvCustName} onChange={(e) => setEditInvCustName(e.target.value)}
                    className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-arab-blue" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">{t("date") || "تاريخ الفاتورة"}</label>
                  <input type="date" value={editInvDate} onChange={(e) => setEditInvDate(e.target.value)}
                    className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-arab-blue bg-white font-sans" />
                </div>
              </div>

              {/* Status + Payment + Type */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">{t("invoiceStatus")}</label>
                  <select value={editInvStatus} onChange={(e) => setEditInvStatus(e.target.value as any)}
                    className="w-full p-2.5 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-arab-blue">
                    <option value="pending">{locale === "fr" ? "En attente" : "معلقة"}</option>
                    <option value="paid">{locale === "fr" ? "Payée" : "مدفوعة"}</option>
                    <option value="partial">{locale === "fr" ? "Partiel" : "جزئي"}</option>
                    <option value="cancelled">{locale === "fr" ? "Annulée" : "ملغاة"}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">{locale === "fr" ? "Paiement" : "الدفع"}</label>
                  <select value={editInvPaymentMethod} onChange={(e) => setEditInvPaymentMethod(e.target.value)}
                    className="w-full p-2.5 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-arab-blue">
                    <option value="cash">{locale === "fr" ? "Espèces" : "نقدي"}</option>
                    <option value="card">{locale === "fr" ? "Carte" : "بطاقة"}</option>
                    <option value="bank">{locale === "fr" ? "Virement" : "تحويل"}</option>
                    <option value="check">{locale === "fr" ? "Chèque" : "شيك"}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">{locale === "fr" ? "Type" : "النوع"}</label>
                  <select value={editInvType} onChange={(e) => setEditInvType(e.target.value as any)}
                    className="w-full p-2.5 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-arab-blue">
                    <option value="sales">{locale === "fr" ? "Vente" : "بيع"}</option>
                    <option value="quotation">{locale === "fr" ? "Devis" : "عرض سعر"}</option>
                    <option value="debt">{locale === "fr" ? "Créance" : "دين"}</option>
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <h4 className="font-bold text-gray-800 text-sm">{t("noteItems")}</h4>
                  <button type="button" onClick={() => setEditInvItems(prev => [...prev, { productName: "", quantity: 1, price: 0, total: 0 }])}
                    className="flex items-center gap-1 text-arab-blue hover:underline text-xs font-bold">
                    <Plus size={13} /> {locale === "fr" ? "Ajouter" : "إضافة"}
                  </button>
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className={`py-2 px-3 font-semibold ${isRTL ? "text-right" : "text-left"}`}>{t("itemName")}</th>
                      <th className="py-2 px-2 text-center font-semibold">{t("productQuantity")}</th>
                      <th className={`py-2 px-2 text-center font-semibold`}>{t("unitPrice")}</th>
                      <th className={`py-2 px-3 font-semibold ${isRTL ? "text-left" : "text-right"}`}>{t("total")}</th>
                      <th className="py-2 px-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {editInvItems.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-5 text-gray-400">{t("noItemsAdded")}</td></tr>
                    ) : editInvItems.map((it, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="py-2 px-3">
                          <input type="text" value={it.productName}
                            onChange={(e) => setEditInvItems(prev => prev.map((item, i) => i === idx ? { ...item, productName: e.target.value } : item))}
                            className="w-full p-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-arab-blue" />
                        </td>
                        <td className="py-2 px-2">
                          <input type="number" min="0.01" step="any" value={it.quantity}
                            onChange={(e) => {
                              const q = Number(e.target.value);
                              setEditInvItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: q, total: q * item.price } : item));
                            }}
                            className="w-full p-1.5 text-xs border border-gray-200 rounded-lg text-center font-bold font-sans outline-none focus:ring-1 focus:ring-arab-blue" />
                        </td>
                        <td className="py-2 px-2">
                          <input type="number" min="0" step="any" value={it.price}
                            onChange={(e) => {
                              const p = Number(e.target.value);
                              setEditInvItems(prev => prev.map((item, i) => i === idx ? { ...item, price: p, total: item.quantity * p } : item));
                            }}
                            className="w-full p-1.5 text-xs border border-gray-200 rounded-lg text-center font-bold font-sans outline-none focus:ring-1 focus:ring-arab-blue" />
                        </td>
                        <td className={`py-2 px-3 font-bold text-emerald-600 font-sans ${isRTL ? "text-left" : "text-right"}`}>
                          {formatCurrency(it.total)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button onClick={() => setEditInvItems(prev => prev.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {editInvItems.length > 0 && (
                  <div className="flex justify-between items-center px-4 py-2.5 bg-emerald-50 border-t border-emerald-100">
                    <span className="text-xs font-bold text-emerald-800">{t("total")}:</span>
                    <span className="font-black text-emerald-700 text-base font-sans">
                      {formatCurrency(editInvItems.reduce((acc, it) => acc + it.total, 0))}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">{t("noteContent")}</label>
                <textarea rows={2} value={editInvNotes} onChange={(e) => setEditInvNotes(e.target.value)}
                  className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-arab-blue resize-none" />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
              <button onClick={() => { setIsInvoiceEditOpen(false); setEditingInvoiceObj(null); }}
                className="flex-1 py-3 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 font-medium text-sm transition-colors">
                {t("cancel")}
              </button>
              <button onClick={handleSaveInvoiceEdit}
                className="flex-1 py-3 rounded-xl bg-arab-blue hover:bg-arab-blue-dark text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2">
                <CheckCircle size={18} />
                {t("saveEdits")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE INVOICE CONFIRMATION MODAL (Client Files Tab) ── */}
      {isInvoiceDeleteOpen && invoiceObjToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 text-center ${isRTL ? "text-right" : "text-left"}`}>
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">{t("confirmDeleteInvoice")}</h3>
            <p className="text-sm text-gray-500">
              {t("confirmDeleteInvoiceMsg")} "<span className="font-bold text-gray-800">#{invoiceObjToDelete.invoiceNumber}</span>"  
              {invoiceObjToDelete.customerName && (<> {t("forCustomer")} {invoiceObjToDelete.customerName}</>)}؟
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setIsInvoiceDeleteOpen(false); setInvoiceObjToDelete(null); }}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm">
                {t("cancel")}
              </button>
              <button onClick={handleDeleteInvoiceFile}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm">
                {t("yesDelete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedInvoiceForPrint && storeInfo && (
        <div className="hidden print:block">
          <ProfessionalInvoice
            invoice={selectedInvoiceForPrint}
            storeInfo={storeInfo}
            customerLetterheadUrl={customers.find(c => c.name === selectedInvoiceForPrint.customerName)?.letterheadUrl}
          />
        </div>
      )}
    </div>
  );
}
