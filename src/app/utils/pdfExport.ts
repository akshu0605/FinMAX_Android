import jsPDF from 'jspdf';

export interface PdfExportData {
  userEmail: string;
  currency: string;
  expenses: Array<{
    id: string;
    title: string;
    amount: number;
    category: string;
    date: string;
    note?: string;
  }>;
  incomes?: Array<{
    id: string;
    amount: number;
    source: string;
    month: number;
    year: number;
  }>;
  budgets?: Array<{
    category: string;
    allocatedAmount: number;
  }>;
}

/**
 * Generates and downloads a clean, professional PDF financial report for FinMax.
 */
export function exportFinancialReportToPdf(data: PdfExportData): void {
  const { userEmail, currency, expenses, incomes = [], budgets = [] } = data;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper for safe strings (handles special characters)
  const sanitize = (text: string | null | undefined): string => {
    if (!text) return '';
    return text.replace(/[^\x20-\x7E]/g, ' ').trim();
  };

  const formatDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return sanitize(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return sanitize(dateStr);
    }
  };

  const formatMoney = (val: number): string => {
    const num = isNaN(val) ? 0 : val;
    return `${currency} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      drawHeader();
    }
  };

  const drawHeader = () => {
    doc.setFillColor(10, 15, 20);
    doc.rect(margin, y, contentWidth, 22, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 242, 234); // FinMax Cyan/Teal
    doc.text('FinMax', margin + 6, y + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(180, 190, 200);
    doc.text('Smart Financial Statement & Portfolio Report', margin + 6, y + 16);

    const generatedOn = `Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    doc.setFontSize(8);
    doc.setTextColor(140, 150, 160);
    doc.text(generatedOn, pageWidth - margin - 6, y + 9, { align: 'right' });
    if (userEmail) {
      doc.text(`Account: ${sanitize(userEmail)}`, pageWidth - margin - 6, y + 16, { align: 'right' });
    }

    y += 28;
  };

  // 1. Initial Page Header
  drawHeader();

  // 2. Summary Cards
  const totalExpense = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalIncome = incomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const totalBudget = budgets.reduce((sum, b) => sum + (Number(b.allocatedAmount) || 0), 0);
  const netSavings = totalIncome - totalExpense;

  const cardWidth = (contentWidth - 6) / 3;
  const cardHeight = 18;

  const cards = [
    { label: 'Total Spending', val: formatMoney(totalExpense), color: [248, 113, 113] as [number, number, number] },
    { label: 'Recorded Income', val: formatMoney(totalIncome), color: [52, 211, 153] as [number, number, number] },
    { label: 'Net Savings', val: formatMoney(netSavings), color: [0, 242, 234] as [number, number, number] },
  ];

  cards.forEach((card, idx) => {
    const cardX = margin + idx * (cardWidth + 3);
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(cardX, y, cardWidth, cardHeight, 2, 2, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 110, 120);
    doc.text(card.label, cardX + 4, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...card.color);
    doc.text(card.val, cardX + 4, y + 13);
  });

  y += cardHeight + 8;

  // 3. Category Breakdown Section (if any expenses exist)
  if (expenses.length > 0) {
    const catMap = new Map<string, number>();
    for (const exp of expenses) {
      const cat = exp.category || 'Other';
      catMap.set(cat, (catMap.get(cat) || 0) + Number(exp.amount));
    }

    const sortedCats = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);

    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20, 25, 30);
    doc.text('Category Breakdown', margin, y);
    y += 5;

    doc.setFillColor(235, 240, 245);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(60, 70, 80);
    doc.text('Category', margin + 4, y + 4.5);
    doc.text('Share', margin + contentWidth / 2, y + 4.5);
    doc.text('Total', margin + contentWidth - 4, y + 4.5, { align: 'right' });
    y += 7;

    for (const [cat, amt] of sortedCats.slice(0, 6)) {
      const share = totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(1) : '0';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(40, 50, 60);
      doc.text(sanitize(cat), margin + 4, y + 4.5);
      doc.text(`${share}%`, margin + contentWidth / 2, y + 4.5);
      doc.text(formatMoney(amt), margin + contentWidth - 4, y + 4.5, { align: 'right' });
      y += 6;
    }
    y += 6;
  }

  // 4. Detailed Transactions Section
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 25, 30);
  doc.text(`Transactions (${expenses.length})`, margin, y);
  y += 5;

  // Table Header
  doc.setFillColor(20, 25, 30);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Date', margin + 4, y + 4.5);
  doc.text('Description', margin + 30, y + 4.5);
  doc.text('Category', margin + 115, y + 4.5);
  doc.text('Amount', margin + contentWidth - 4, y + 4.5, { align: 'right' });
  y += 7;

  if (expenses.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(120, 130, 140);
    doc.text('No transactions recorded in this account yet.', margin + 4, y + 7);
    y += 12;
  } else {
    // Sort chronological descending
    const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    sortedExpenses.forEach((exp, idx) => {
      checkPageBreak(8);

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 6.5, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(50, 60, 70);

      // Date
      doc.text(formatDate(exp.date), margin + 4, y + 4.5);

      // Description (truncated if too long)
      const desc = sanitize(exp.title || exp.note || 'Expense');
      const maxDescWidth = 80;
      doc.text(doc.splitTextToSize(desc, maxDescWidth)[0] || '', margin + 30, y + 4.5);

      // Category
      doc.text(sanitize(exp.category || 'General'), margin + 115, y + 4.5);

      // Amount
      doc.setFont('helvetica', 'bold');
      doc.text(formatMoney(Number(exp.amount)), margin + contentWidth - 4, y + 4.5, { align: 'right' });

      y += 6.5;
    });
  }

  // 5. Footer with page numbering
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(160, 170, 180);
    doc.text(`FinMax Statement Report  •  Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
  }

  // Download PDF
  const filename = `finmax-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
