// src/lib/exportUtils.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Export data as CSV file download
 */
export function exportToCSV(data: Record<string, any>[], columns: { header: string; key: string }[], filename: string): void {
  const headers = columns.map(c => c.header).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key] ?? '';
      // Escape commas and quotes
      const str = String(val);
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',')
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export data as Excel (.xlsx) file download
 */
export function exportToExcel(data: Record<string, any>[], columns: { header: string; key: string }[], filename: string): void {
  const wsData = [
    columns.map(c => c.header),
    ...data.map(row => columns.map(c => row[c.key] ?? ''))
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Auto-size columns
  const colWidths = columns.map((c, i) => {
    const maxLen = Math.max(
      c.header.length,
      ...data.map(row => String(row[c.key] ?? '').length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws['!cols'] = colWidths;
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export data as PDF file download
 */
export function exportToPDF(
  data: Record<string, any>[],
  columns: { header: string; key: string }[],
  filename: string,
  title?: string
): void {
  const doc = new jsPDF({ orientation: 'landscape' });
  
  // Title
  if (title) {
    doc.setFontSize(16);
    doc.setTextColor(40);
    doc.text(title, 14, 15);
  }
  
  // Date stamp
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}`, 14, title ? 22 : 15);
  
  autoTable(doc, {
    startY: title ? 28 : 20,
    head: [columns.map(c => c.header)],
    body: data.map(row => columns.map(c => String(row[c.key] ?? ''))),
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],   // #1e293b
      textColor: [226, 232, 240], // #e2e8f0
      fontSize: 9,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85]     // #334155
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]  // #f8fafc
    },
    styles: {
      cellPadding: 3,
      lineColor: [203, 213, 225], // #cbd5e1
      lineWidth: 0.2
    },
    margin: { left: 14, right: 14 }
  });
  
  doc.save(`${filename}.pdf`);
}

/** Helper to trigger a blob download */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
