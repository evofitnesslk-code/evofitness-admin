import { jsPDF } from 'jspdf';

export interface InvoicePdfData {
  invoiceNumber: string;
  memberName: string;
  phone?: string | null;
  email?: string | null;
  planName: string;
  startDate: string;
  endDate: string;
  totalDue: number;
  amountPaid: number;
  outstandingBalance: number;
  discountAmount?: number;
  trainerFee?: number;
  trainerName?: string | null;
}

export function generateInvoicePdfBuffer(data: InvoicePdfData): Buffer {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });

  // Gold accent top bar
  doc.setFillColor(229, 184, 66); // EVO Gold #E5B842
  doc.rect(15, 12, 180, 2, 'F');

  // Company info (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(9, 9, 11);
  doc.text('EVO FITNESS PVT LTD', 15, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.text('Balapokuna Road, Colombo 5, Sri Lanka', 15, 27);
  doc.text('Tel: 0710509253', 15, 32);

  // Invoice Details (Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(184, 134, 11);
  doc.text('INVOICE / RECEIPT', 195, 22, { align: 'right' });

  doc.setFontSize(18);
  doc.setTextColor(9, 9, 11);
  doc.text(data.invoiceNumber, 195, 30, { align: 'right' });

  const isPaid = (data.outstandingBalance ?? 0) <= 0;
  doc.setFontSize(8);
  if (isPaid) {
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(155, 33, 40, 6, 1, 1, 'F');
    doc.setTextColor(21, 128, 61);
    doc.text('PAID IN FULL', 175, 37.5, { align: 'center' });
  } else {
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(155, 33, 40, 6, 1, 1, 'F');
    doc.setTextColor(180, 83, 9);
    doc.text('PARTIAL PAYMENT', 175, 37.5, { align: 'center' });
  }

  // Divider
  doc.setDrawColor(229, 231, 235);
  doc.line(15, 43, 195, 43);

  // Billed to / Membership info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('BILLED TO (MEMBER)', 15, 50);
  doc.text('MEMBERSHIP TERM', 120, 50);

  doc.setFontSize(11);
  doc.setTextColor(9, 9, 11);
  doc.text(data.memberName, 15, 56);
  doc.text(data.planName, 120, 56);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.text(`Phone: ${data.phone || '-'}`, 15, 62);
  doc.text(`Email: ${data.email || '-'}`, 15, 67);
  doc.text(`Period: ${data.startDate} to ${data.endDate}`, 120, 62);
  if (data.trainerName) {
    doc.text(`Personal Trainer: ${data.trainerName}`, 120, 67);
  }

  // Table header
  let y = 78;
  doc.setFillColor(243, 244, 246);
  doc.rect(15, y, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(55, 65, 81);
  doc.text('ITEM & DESCRIPTION', 20, y + 5.5);
  doc.text('AMOUNT (LKR)', 190, y + 5.5, { align: 'right' });

  // Line items
  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(9, 9, 11);
  doc.text(data.planName, 20, y);
  doc.setFont('helvetica', 'normal');
  const basePlanPrice =
    data.totalDue + (data.discountAmount || 0) - (data.trainerFee || 0);
  doc.text(`LKR ${basePlanPrice.toLocaleString()}`, 190, y, { align: 'right' });

  if (data.trainerFee && data.trainerFee > 0) {
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text(`Personal Training (PT) Add-on (${data.trainerName || 'Trainer'})`, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`LKR ${data.trainerFee.toLocaleString()}`, 190, y, { align: 'right' });
  }

  if (data.discountAmount && data.discountAmount > 0) {
    y += 8;
    doc.setTextColor(220, 38, 38);
    doc.text('Discount Deduction', 20, y);
    doc.text(`- LKR ${data.discountAmount.toLocaleString()}`, 190, y, { align: 'right' });
  }

  // Totals Divider
  y += 10;
  doc.setDrawColor(9, 9, 11);
  doc.setLineWidth(0.5);
  doc.line(15, y, 195, y);

  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(9, 9, 11);
  doc.text('TOTAL AMOUNT DUE:', 120, y);
  doc.text(`LKR ${data.totalDue.toLocaleString()}`, 190, y, { align: 'right' });

  y += 6;
  doc.setTextColor(21, 128, 61);
  doc.text('TOTAL PAID:', 120, y);
  doc.text(`LKR ${data.amountPaid.toLocaleString()}`, 190, y, { align: 'right' });

  y += 7;
  doc.setFillColor(254, 243, 199);
  doc.rect(115, y - 5, 80, 8, 'F');
  doc.setTextColor(180, 83, 9);
  doc.text('OUTSTANDING BALANCE:', 120, y);
  doc.text(`LKR ${data.outstandingBalance.toLocaleString()}`, 190, y, { align: 'right' });

  // Footer / Signatory
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.2);
  doc.line(15, 255, 195, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('1. Memberships are non-transferable unless authorized.', 15, 262);
  doc.text('2. Official digital invoice & receipt issued by EVO Fitness PVT LTD.', 15, 267);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(9, 9, 11);
  doc.text('Authorized Signatory', 195, 262, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('EVO Fitness Management', 195, 267, { align: 'right' });

  return Buffer.from(doc.output('arraybuffer'));
}
