import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DestinationReservationService } from './destination-reservation.service';

@Injectable({ 
  providedIn: 'root' 
})
export class DestinationInvoiceService {
  constructor(private destResService: DestinationReservationService) {}

  private daysBetween(a?: string, b?: string): number {
    if (!a || !b) return 0;
    const [y1, m1, d1] = a.split('-').map(Number);
    const [y2, m2, d2] = b.split('-').map(Number);
    const dIn = new Date(y1, (m1 || 1) - 1, d1 || 1);
    const dOut = new Date(y2, (m2 || 1) - 1, d2 || 1);
    const diff = Math.ceil((dOut.getTime() - dIn.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(diff, 0);
  }

  async downloadDestinationInvoicePdf(reservationId: number): Promise<void> {
    const inv = await this.destResService.getInvoiceJson(reservationId);

    const doc = new jsPDF();
    const now = new Date(inv.createdAt || Date.now());
    const nights = this.daysBetween(inv.checkIn, inv.checkOut);

    const adults = Number(inv.adults ?? 0);
    const children = Number(inv.children ?? 0);
    const people = adults + children;

    const pricePerPerson = Number(inv.pricePerPerson ?? 0);
    const totalAmount =
      inv.totalAmount != null ? Number(inv.totalAmount) : pricePerPerson * people * nights;

    // ===== Header =====
    let y = 18;

    doc.setTextColor(0);
    doc.setFontSize(16);
    doc.text('FACTURE - Réservation Destination', 14, y);

    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`N° Facture: DEST-${inv.id}`, 14, y);

    y += 6;
    doc.text(`Date: ${now.toLocaleDateString()}`, 14, y);

    y += 10;

    // Destination block
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text('Destination', 14, y);

    y += 6;
    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.text(inv.destinationName || '-', 14, y);

    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`${[inv.location].filter(Boolean).join(' – ')}`, 14, y);

    // Client block
    if (inv.userName || inv.userEmail) {
      y += 10;
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text('Client', 14, y);

      y += 6;
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text(`${inv.userName || '-'} (${inv.userEmail || '-'})`, 14, y);
    }

    // Dates block
    y += 10;
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Arrivée: ${inv.checkIn || '-'}`, 14, y);

    y += 6;
    doc.text(`Départ: ${inv.checkOut || '-'}`, 14, y);

    y += 6;
    doc.text(`Nuits: ${nights}`, 14, y);

    // Table
    const tableStartY = y + 12;

    autoTable(doc, {
      startY: tableStartY,
      head: [['Type', 'Nombre', 'Prix (TND)', 'Nuits', 'Total (TND)']],
      body: [
        ['Adultes', `${adults}`, `${pricePerPerson.toFixed(2)}`, `${nights}`, `${(adults * pricePerPerson * nights).toFixed(2)}`],
        ['Enfants', `${children}`, `${pricePerPerson.toFixed(2)}`, `${nights}`, `${(children * pricePerPerson * nights).toFixed(2)}`],
      ],
      styles: { fontSize: 9 },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || tableStartY;

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`TOTAL: ${totalAmount.toFixed(2)} TND`, 14, finalY + 14);

    doc.save(`DEST-${inv.id}.pdf`);
  }
}
