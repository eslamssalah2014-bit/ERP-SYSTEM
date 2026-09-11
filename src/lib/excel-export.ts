import * as XLSX from "xlsx";

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExcelExportOptions {
  filename: string;
  sheetName?: string;
  title?: string;
  columns: ExcelColumn[];
  data: Record<string, any>[];
  organizationName?: string;
}

/**
 * Generates and triggers download of a genuine multi-column Excel (.xlsx) file.
 * Supports either:
 * 1. An HTML table ID string: exportTableToExcel("table-id", "filename")
 * 2. An options object: exportTableToExcel({ filename, columns, data, ... })
 * Preserves Arabic UTF-8, proper cell types (numeric, dates, strings), and RTL layout.
 */
export function exportTableToExcel(
  tableIdOrOptions: string | ExcelExportOptions,
  optionalFilenameOrOptions?: string | Partial<ExcelExportOptions>
) {
  // Mode 1: Export directly from an HTML table element by ID
  if (typeof tableIdOrOptions === "string") {
    const tableId = tableIdOrOptions;
    const filename = typeof optionalFilenameOrOptions === "string"
      ? optionalFilenameOrOptions
      : (optionalFilenameOrOptions?.filename || "report");

    if (typeof document === "undefined") return;
    const tableElement = document.getElementById(tableId);
    if (!tableElement) {
      console.warn(`Table element with id "${tableId}" not found`);
      return;
    }

    const wb = XLSX.utils.table_to_book(tableElement, { raw: false });
    const firstSheetName = wb.SheetNames[0];
    if (firstSheetName && wb.Sheets[firstSheetName]) {
      // Set right-to-left view for Arabic table export
      wb.Sheets[firstSheetName]["!views"] = [{ rightToLeft: true }];
    }

    const cleanFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
    XLSX.writeFile(wb, cleanFilename, { bookType: "xlsx" });
    return;
  }

  // Mode 2: Export from structured JSON columns & data
  const {
    filename,
    sheetName = "Sheet1",
    title,
    columns,
    data,
    organizationName,
  } = tableIdOrOptions;

  // Build rows array: title block + headers + data rows
  const rows: any[][] = [];

  if (organizationName) {
    rows.push([organizationName]);
  }
  if (title) {
    rows.push([title]);
  }
  if (organizationName || title) {
    rows.push([`تاريخ التصدير: ${new Date().toLocaleDateString("ar-EG")} ${new Date().toLocaleTimeString("ar-EG")}`]);
    rows.push([]); // blank separator line
  }

  // Header Row
  const headerRow = columns.map(col => col.header);
  rows.push(headerRow);

  // Data Rows
  data.forEach(item => {
    const row = columns.map(col => {
      const val = item[col.key];
      if (val === null || val === undefined) return "";
      // Keep pure numbers numeric for Excel calculations
      if (typeof val === "number") return val;
      return String(val);
    });
    rows.push(row);
  });

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  ws["!cols"] = columns.map(col => ({
    wch: col.width || Math.max(col.header.length * 2, 14),
  }));

  // Set RTL direction for Arabic worksheet
  ws["!views"] = [{ rightToLeft: true }];

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

  // Trigger browser download
  const cleanFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, cleanFilename, { bookType: "xlsx" });
}
