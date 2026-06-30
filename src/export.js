import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const todayStr = () => new Date().toISOString().split("T")[0];

export function exportExcel(filename, columns, rows) {
  const data = rows.map(row => {
    const obj = {};
    columns.forEach(col => { obj[col.label] = col.get(row); });
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = columns.map(c => ({ wch: Math.max(12, c.label.length + 4) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  XLSX.writeFile(wb, `${filename}-${todayStr()}.xlsx`);
}

export function exportPDF(filename, title, columns, rows) {
  const doc = new jsPDF({ orientation: columns.length > 5 ? "landscape" : "portrait" });
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 95);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")} · ERP Industrial`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [columns.map(c => c.label)],
    body: rows.map(row => columns.map(c => String(c.get(row) ?? "—"))),
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [247, 248, 250] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${filename}-${todayStr()}.pdf`);
}
