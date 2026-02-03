import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PackReservationService } from './pack-reservation.service';

@Injectable({ providedIn: 'root' })
export class PackInvoiceService {
  constructor(private packRes: PackReservationService) {}

  private mealPlanLabel(plan: string) {
    switch (plan) {
      case 'ROOM_ONLY': return "Hébergement seul (chambre)";
      case 'BB': return "Petit-déjeuner inclus";
      case 'HB': return "Demi-pension";
      case 'FB': return "Pension complète";
      case 'AI': return "Tout compris";
      case 'UAI': return "Ultra tout compris";
      default: return plan || '';
    }
  }

  private csvToArr(v: any): string[] {
    if (!v) return [];
    return String(v).split(',').map(s => s.trim());
  }

  private toNumber(v: any): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  async downloadPackInvoicePdf(reservationId: number) {
    const inv = await this.packRes.getInvoiceJson(reservationId);

    const doc = new jsPDF();
    let y = 18;

    // Header
    doc.setFontSize(16);
    doc.text('FACTURE - Réservation Pack', 14, y);
    y += 10;

    doc.setFontSize(10);
    doc.text(`Réservation ID: ${inv.id}`, 14, y); y += 6;
    doc.text(`Date: ${inv.createdAt ? String(inv.createdAt).substring(0, 10) : ''}`, 14, y); y += 8;

    // Client
    doc.setFontSize(12);
    doc.text('Client', 14, y); y += 6;
    doc.setFontSize(10);
    doc.text(`Nom: ${inv.userName || '-'}`, 14, y); y += 6;
    doc.text(`Email: ${inv.userEmail || '-'}`, 14, y); y += 8;

    // Pack info
    doc.setFontSize(12);
    doc.text('Pack', 14, y); y += 6;
    doc.setFontSize(10);
    doc.text(`Nom: ${inv.packName || '-'}`, 14, y); y += 6;
    doc.text(`Destination: ${inv.destinationName || '-'}`, 14, y); y += 6;
    doc.text(`Hôtel: ${inv.hotelName || '-'}`, 14, y); y += 6;
    doc.text(`Lieu: ${inv.location || '-'}`, 14, y); y += 8;

    // Dates
    doc.setFontSize(12);
    doc.text('Séjour', 14, y); y += 6;
    doc.setFontSize(10);
    doc.text(`Arrivée: ${inv.checkIn || '-'}`, 14, y); y += 6;
    doc.text(`Départ: ${inv.checkOut || '-'}`, 14, y); y += 6;

    const nights = this.toNumber(inv.nights);
    const payingPeople = this.toNumber(inv.payingPeople);

    doc.text(`Nuits: ${nights}`, 14, y); y += 6;
    doc.text(`Voyageurs payants (adultes+enfants): ${payingPeople}`, 14, y); y += 8;

    // Formule
    const mealPlan = inv.mealPlan || 'ROOM_ONLY';
    const mealPlanExtra = this.toNumber(inv.mealPlanExtra);
    doc.setFontSize(12);
    doc.text('Formule', 14, y); y += 6;
    doc.setFontSize(10);
    doc.text(`${this.mealPlanLabel(mealPlan)}`, 14, y); y += 6;
    doc.text(`Supplément: ${mealPlanExtra.toFixed(2)} TND / personne / nuit`, 14, y); y += 8;

    // Rooms table (from CSV)
    const roomNames = this.csvToArr(inv.roomNames);
    const roomPrices = this.csvToArr(inv.roomPrices);
    const roomAdults = this.csvToArr(inv.roomAdults);
    const roomChildren = this.csvToArr(inv.roomChildren);
    const roomBabies = this.csvToArr(inv.roomBabies);

    const rows = roomNames.map((name, i) => {
      const a = this.toNumber(roomAdults[i]);
      const c = this.toNumber(roomChildren[i]);
      const b = this.toNumber(roomBabies[i]);
      const payants = a + c;
      const price = this.toNumber(roomPrices[i]);

      return [
        String(i + 1),
        name || 'Chambre',
        String(a),
        String(c),
        String(b),
        String(payants),
        `${price.toFixed(2)} TND`
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [[ '#', 'Chambre', 'Adultes', 'Enfants', 'Bébés', 'Payants', 'Prix/pers' ]],
      body: rows,
      styles: { fontSize: 9 },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || y;
    y = finalY + 10;

    // Totals
    const basePackTotal = this.toNumber(inv.basePackTotal);
    const mealPlanTotal = this.toNumber(inv.mealPlanTotal);
    const totalAmount = this.toNumber(inv.totalAmount);

    doc.setFontSize(12);
    doc.text('Totaux', 14, y); y += 6;
    doc.setFontSize(10);

    doc.text(`Base pack: ${basePackTotal.toFixed(2)} TND`, 14, y); y += 6;
    doc.text(`Formule: ${mealPlanTotal.toFixed(2)} TND`, 14, y); y += 6;

    doc.setFontSize(12);
    doc.text(`TOTAL: ${totalAmount.toFixed(2)} TND`, 14, y); y += 8;

    doc.setFontSize(9);
    doc.text(`Note: Les bébés (0-2 ans) ne sont pas inclus dans le prix.`, 14, y);

    doc.save(`PACK-${inv.id}.pdf`);
  }
}
