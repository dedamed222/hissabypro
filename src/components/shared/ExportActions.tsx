import React from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import { formatCurrency } from "@/utils/formatters";
import { useLocale } from "@/hooks/useLocale";

interface ExportActionsProps {
  data: any[];
  filename: string;
  title: string;
  columns: {
    key: string;
    header: string;
    render?: (item: any) => string;
  }[];
  customerInfo?: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  totals?: {
    totalQuantity?: number;
    totalDebit: number;
    totalCredit: number;
    finalBalance: number;
  };
  showOnlyTotals?: boolean;
  hideBalanceStatus?: boolean;
}

const ExportActions = ({ data, filename, title, columns, customerInfo, totals, showOnlyTotals = false, hideBalanceStatus = false }: ExportActionsProps) => {
  const { t, isRTL, formatDate, locale } = useLocale();

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const alignment = isRTL ? 'right' : 'left';
    const direction = isRTL ? 'rtl' : 'ltr';

    const tableHeaders = columns.map(col => `<th style="padding: 12px; text-align: ${alignment}; border: 1px solid #ddd; background-color: #f5f5f5;">${col.header}</th>`).join('');
    
    const tableRows = data.map(item => {
      const cells = columns.map(col => {
        const value = col.render ? col.render(item) : item[col.key] || '';
        return `<td style="padding: 12px; text-align: ${alignment}; border: 1px solid #ddd;">${value}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    const customerInfoSection = customerInfo ? `
      <div style="background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #dee2e6;">
        <h2 style="color: #495057; margin-bottom: 15px; font-size: 18px;">${t('customerInfo')}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
          <div><strong>${t('customerName')}:</strong> ${customerInfo.name}</div>
          ${customerInfo.phone ? `<div><strong>${t('phone')}:</strong> ${customerInfo.phone}</div>` : ''}
          ${customerInfo.email ? `<div><strong>${t('email')}:</strong> ${customerInfo.email}</div>` : ''}
          ${customerInfo.address ? `<div style="grid-column: 1 / -1;"><strong>${t('address')}:</strong> ${customerInfo.address}</div>` : ''}
        </div>
      </div>
    ` : '';

    const totalsSection = totals ? `
      <div style="background-color: #f1f5f9; padding: 20px; margin: 20px 0; border-radius: 8px; border: 2px solid #3b82f6;">
        <h2 style="color: #1e40af; margin-bottom: 15px; font-size: 18px; text-align: center;">${t('accountSummary')}</h2>
        <div style="display: grid; grid-template-columns: ${totals.totalQuantity !== undefined ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr'}; gap: 20px; font-size: 16px; font-weight: bold;">
          ${totals.totalQuantity !== undefined ? `
            <div style="text-align: center; color: #3b82f6;">
              <div style="margin-bottom: 5px;">${t('totalQuantity')}</div>
              <div style="background-color: #dbeafe; padding: 10px; border-radius: 5px;">${totals.totalQuantity}</div>
            </div>
          ` : ''}
          <div style="text-align: center; color: #dc2626;">
            <div style="margin-bottom: 5px;">${t('totalDebit')}</div>
            <div style="background-color: #fee2e2; padding: 10px; border-radius: 5px;">${formatCurrency(totals.totalDebit)}</div>
          </div>
          <div style="text-align: center; color: #059669;">
            <div style="margin-bottom: 5px;">${t('totalCredit')}</div>
            <div style="background-color: #d1fae5; padding: 10px; border-radius: 5px;">${formatCurrency(totals.totalCredit)}</div>
          </div>
          <div style="text-align: center; color: ${totals.finalBalance > 0 ? '#dc2626' : '#059669'};">
            <div style="margin-bottom: 5px;">${t('finalBalance')}</div>
            <div style="background-color: ${totals.finalBalance > 0 ? '#fee2e2' : '#d1fae5'}; padding: 10px; border-radius: 5px;">
              ${formatCurrency(Math.abs(totals.finalBalance))}
              ${hideBalanceStatus ? '' : (totals.finalBalance > 0 ? (locale === 'ar' ? ' (عليه)' : ` (${t('debtorLabel') || t('debtorStatus')})`) : (locale === 'ar' ? ' (له)' : ` (${t('creditorLabel') || t('creditorStatus')})`))}
            </div>
          </div>
        </div>
      </div>
    ` : '';

    const printContent = `
      <!DOCTYPE html>
      <html dir="${direction}">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          body { font-family: ${isRTL ? "'Cairo', sans-serif" : "Arial, sans-serif"}; margin: 20px; direction: ${direction}; text-align: ${alignment}; }
          h1 { text-align: center; color: #333; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .print-date { text-align: center; margin-bottom: 20px; color: #666; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="print-date">${t('printDate')}: ${formatDate(new Date().toISOString())}</div>
        ${showOnlyTotals ? '' : customerInfoSection}
        ${showOnlyTotals ? '' : `
        <table>
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        `}
        ${totalsSection}
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleExportExcel = () => {
    const excelData = data.map(item => {
      const row: any = {};
      columns.forEach(col => {
        row[col.header] = col.render ? col.render(item) : item[col.key] || '';
      });
      return row;
    });

    if (customerInfo) {
      const customerData = [
        { [columns[0].header]: t('customerInfo') },
        { [columns[0].header]: `${t('customerName')}: ${customerInfo.name}` },
      ];
      
      if (customerInfo.phone) {
        customerData.push({ [columns[0].header]: `${t('phone')}: ${customerInfo.phone}` });
      }
      if (customerInfo.email) {
        customerData.push({ [columns[0].header]: `${t('email')}: ${customerInfo.email}` });
      }
      if (customerInfo.address) {
        customerData.push({ [columns[0].header]: `${t('address')}: ${customerInfo.address}` });
      }
      
      customerData.push({ [columns[0].header]: '' });
      excelData.unshift(...customerData);
    }

    if (totals) {
      excelData.push({ [columns[0].header]: '' });
      excelData.push({ [columns[0].header]: t('accountSummary') });
      
      if (totals.totalQuantity !== undefined) {
        excelData.push({ [columns[0].header]: `${t('totalQuantity')}: ${totals.totalQuantity}` });
      }
      
      excelData.push({ [columns[0].header]: `${t('totalDebit')}: ${formatCurrency(totals.totalDebit)}` });
      excelData.push({ [columns[0].header]: `${t('totalCredit')}: ${formatCurrency(totals.totalCredit)}` });
      excelData.push({ 
        [columns[0].header]: `${t('finalBalance')}: ${formatCurrency(Math.abs(totals.finalBalance))}${hideBalanceStatus ? '' : ` ${totals.finalBalance > 0 ? (locale === 'ar' ? '(عليه)' : `(${t('debtorLabel') || t('debtorStatus')})`) : (locale === 'ar' ? '(له)' : `(${t('creditorLabel') || t('creditorStatus')})`)}`}` 
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, title);
    
    // Auto-size columns
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const colWidths = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxWidth = 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          const cellLength = cell.v.toString().length;
          if (cellLength > maxWidth) {
            maxWidth = cellLength;
          }
        }
      }
      colWidths.push({ width: Math.min(maxWidth + 2, 50) });
    }
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className={`flex gap-2 ${locale === 'ar' ? 'font-arabic' : 'font-sans'}`} dir={isRTL ? "rtl" : "ltr"}>
      <Button
        variant="outline"
        onClick={handlePrint}
        className="flex items-center gap-2"
        title={t('print')}
      >
        <Printer className="w-4 h-4" />
        {t('print')}
      </Button>
      <Button
        variant="outline"
        onClick={handleExportExcel}
        className="flex items-center gap-2"
        title={t('exportExcel')}
      >
        <FileSpreadsheet className="w-4 h-4" />
        {t('exportExcel')}
      </Button>
    </div>
  );
};

export default ExportActions;
