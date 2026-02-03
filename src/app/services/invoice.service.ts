import { Injectable } from '@angular/core';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type MealPlan = 'ROOM_ONLY' | 'BB' | 'HB' | 'FB' | 'AI' | 'UAI';

@Injectable({
  providedIn: 'root',
})
export class InvoiceService {
  private RES_URL = 'http://localhost:9090/api/reservations';

  private authHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private split(v: any): string[] {
    return String(v ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  private daysBetween(checkIn?: string, checkOut?: string): number {
    if (!checkIn || !checkOut) return 0;
    const a = new Date(checkIn);
    const b = new Date(checkOut);
    const diff = Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(diff, 0);
  }

  private mealPlanLabel(plan?: MealPlan) {
    switch (plan) {
      case 'ROOM_ONLY': return 'Hébergement seul (chambre)';
      case 'BB': return 'Petit-déjeuner inclus';
      case 'HB': return 'Demi-pension (petit-déjeuner + 1 repas)';
      case 'FB': return 'Pension complète (petit-déjeuner + déjeuner + dîner)';
      case 'AI': return 'Tout compris (repas + boissons locales + snacks)';
      case 'UAI': return 'Ultra tout compris (extras inclus)';
      default: return '—';
    }
  }

  private mealPlanExtra(plan?: MealPlan): number {
    switch (plan) {
      case 'ROOM_ONLY': return 0;
      case 'BB': return 25;
      case 'HB': return 60;
      case 'FB': return 90;
      case 'AI': return 130;
      case 'UAI': return 170;
      default: return 0;
    }
  }

  async downloadInvoicePdf(reservationId: number): Promise<void> {
    // 1) Fetch invoice JSON
    const res = await axios.get(`${this.RES_URL}/${reservationId}/invoice`, {
      headers: this.authHeaders(),
    });
    const inv = res.data;

    // 2) Compute values
    const nights = this.daysBetween(inv.checkIn, inv.checkOut);

    const plan = inv.mealPlan as MealPlan | undefined;
    const planLabel = this.mealPlanLabel(plan);
    const planExtra = this.mealPlanExtra(plan);

    const roomNames = this.split(inv.roomNames);
    const roomPrices = this.split(inv.roomPrices).map(Number);
    const roomAdults = this.split(inv.roomAdults).map(Number);
    const roomChildren = this.split(inv.roomChildren).map(Number);
    const roomBabies = this.split(inv.roomBabies).map(Number);

    // 3) Build PDF
    const doc = new jsPDF();
    const now = new Date();

    let y = 18;

    // ---- TITLE ----
    doc.setTextColor(0);
    doc.setFontSize(16);
    doc.text('FACTURE - Réservation Hôtel', 14, y);

    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`N° Facture: FAC-${inv.id}`, 14, y);

    y += 6;
    doc.text(`Date: ${now.toLocaleDateString()}`, 14, y);

    y += 10;

    // ---- HOTEL ----
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text('Hôtel', 14, y);

    y += 6;
    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.text(inv.hotelName || '-', 14, y);

    if (inv.hotelCity || inv.hotelCountry) {
      y += 6;
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        `${[inv.hotelCity, inv.hotelCountry].filter(Boolean).join(' – ')}`,
        14,
        y
      );
    }

    y += 10;

    // ---- CLIENT ----
    if (inv.userName || inv.userEmail) {
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text('Client', 14, y);

      y += 6;
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text(`${inv.userName || '-'} (${inv.userEmail || '-'})`, 14, y);

      y += 10;
    }

    // ---- DATES ----
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Arrivée: ${inv.checkIn || '-'}`, 14, y);

    y += 6;
    doc.text(`Départ: ${inv.checkOut || '-'}`, 14, y);

    y += 6;
    doc.text(`Nuits: ${nights}`, 14, y);

    y += 10;

    // ---- FORMULA ----
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Formule: ${planLabel}`, 14, y);

    y += 6;
    doc.text(`Supplément formule: ${planExtra} TND / personne / nuit`, 14, y);

    y += 10;

    // ---- TABLE ----
    let totalPerNightNum = 0;

    const body = roomNames.map((name: string, i: number) => {
      const a = roomAdults[i] ?? 0;
      const c = roomChildren[i] ?? 0;
      const b = roomBabies[i] ?? 0;

      const paying = a + c; // babies free
      const pricePerPerson = roomPrices[i] ?? 0;

      const roomPerNight = paying * pricePerPerson;
      const formulaPerNight = paying * planExtra;
      const totalPerNight = roomPerNight + formulaPerNight;

      totalPerNightNum += totalPerNight;

      return [
        `${i + 1}`,
        name,
        `${a}`,
        `${c}`,
        `${b}`,
        `${paying}`,
        `${pricePerPerson.toFixed(2)} TND`,
        `${roomPerNight.toFixed(2)} TND`,
        `${formulaPerNight.toFixed(2)} TND`,
        `${totalPerNight.toFixed(2)} TND`,
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [[
        '#', 'Chambre', 'Adultes', 'Enfants', 'Bébés', 'Payants',
        'Prix/pers', 'Chambre/nuit', 'Formule/nuit', 'Total/nuit'
      ]],
      body,
      styles: { fontSize: 8 },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || y;

    // Totals
    const totalAllNum =
      inv.totalAmount != null ? Number(inv.totalAmount) : totalPerNightNum * nights;

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total / nuit: ${totalPerNightNum.toFixed(2)} TND`, 14, finalY + 14);
    doc.text(`Total (${nights} nuits): ${totalAllNum.toFixed(2)} TND`, 14, finalY + 22);

    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(
      `Note: Les bébés (0-2 ans) ne sont pas inclus dans la capacité ni dans le prix.`,
      14,
      finalY + 32
    );

    doc.save(`FAC-${inv.id}.pdf`);
  }
}
