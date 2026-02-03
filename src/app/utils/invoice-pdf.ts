import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type MealPlan = 'ROOM_ONLY' | 'BB' | 'HB' | 'FB' | 'AI' | 'UAI';

export type InvoiceRoom = {
  roomId: number;
  roomName: string;
  adults: number;
  children: number;
  babies: number;
  pricePerPerson: number;
};

export type InvoiceData = {
  id: number;
  createdAt?: string;
  hotelName: string;
  hotelCity?: string;
  hotelCountry?: string;
  checkIn: string;
  checkOut: string;
  mealPlan: MealPlan;
  rooms: InvoiceRoom[];
};

function daysBetween(checkin: string, checkout: string): number {
  const a = new Date(checkin);
  const b = new Date(checkout);
  const diff = Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 0);
}

function mealPlanLabel(plan: MealPlan) {
  switch (plan) {
    case 'ROOM_ONLY': return "Hébergement seul (chambre)";
    case 'BB': return "Petit-déjeuner inclus";
    case 'HB': return "Demi-pension (petit-déjeuner + 1 repas)";
    case 'FB': return "Pension complète (petit-déjeuner + déjeuner + dîner)";
    case 'AI': return "Tout compris (repas + boissons locales + snacks)";
    case 'UAI': return "Ultra tout compris (extras inclus)";
    default: return "";
  }
}

function mealPlanExtra(plan: MealPlan): number {
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

export function generateFacturePdf(data: InvoiceData) {
  const doc = new jsPDF();

  const now = data.createdAt ? new Date(data.createdAt) : new Date();
  const factureNumber = `FAC-${data.id}`;

  const nights = daysBetween(data.checkIn, data.checkOut);
  const planExtra = mealPlanExtra(data.mealPlan);

  const getRoomGuests = (r: InvoiceRoom) => (r.adults || 0) + (r.children || 0);
  const getRoomBasePerNight = (r: InvoiceRoom) => getRoomGuests(r) * (r.pricePerPerson || 0);
  const getRoomMealExtraPerNight = (r: InvoiceRoom) => getRoomGuests(r) * planExtra;

  const totalRoomsPerNight = data.rooms.reduce((sum, r) => sum + getRoomBasePerNight(r), 0);
  const totalMealPerNight = data.rooms.reduce((sum, r) => sum + getRoomMealExtraPerNight(r), 0);

  const totalPerNight = totalRoomsPerNight + totalMealPerNight;
  const total = totalPerNight * nights;

  doc.setFontSize(16);
  doc.text('FACTURE - Réservation Hôtel', 14, 18);

  doc.setFontSize(10);
  doc.text(`N° Facture: ${factureNumber}`, 14, 26);
  doc.text(`Date: ${now.toLocaleDateString()}`, 14, 32);

  doc.setFontSize(12);
  doc.text(`Hôtel: ${data.hotelName || '-'}`, 14, 44);
  doc.setFontSize(10);
  doc.text(`Lieu: ${data.hotelCity || '-'} - ${data.hotelCountry || '-'}`, 14, 50);

  doc.text(`Arrivée: ${data.checkIn}`, 14, 60);
  doc.text(`Départ: ${data.checkOut}`, 14, 66);
  doc.text(`Nuits: ${nights}`, 14, 72);

  doc.text(`Formule: ${mealPlanLabel(data.mealPlan)}`, 14, 80);
  doc.text(`Supplément formule: ${planExtra} TND / personne / nuit`, 14, 86);

  const rows = data.rooms.map((r, i) => {
    const guests = getRoomGuests(r);
    const roomBase = getRoomBasePerNight(r);
    const meal = getRoomMealExtraPerNight(r);
    const perNight = roomBase + meal;

    return [
      `${i + 1}`,
      r.roomName || 'Chambre',
      `${r.adults || 0}`,
      `${r.children || 0}`,
      `${r.babies || 0}`,
      `${guests}`,
      `${(r.pricePerPerson || 0).toFixed(2)} TND`,
      `${roomBase.toFixed(2)} TND`,
      `${meal.toFixed(2)} TND`,
      `${perNight.toFixed(2)} TND`,
    ];
  });

  autoTable(doc, {
    startY: 96,
    head: [[
      '#', 'Chambre', 'Adultes', 'Enfants', 'Bébés', 'Payants',
      'Prix/pers', 'Chambre/nuit', 'Formule/nuit', 'Total/nuit'
    ]],
    body: rows,
    styles: { fontSize: 8 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 96;

  doc.setFontSize(12);
  doc.text(`Total / nuit: ${totalPerNight.toFixed(2)} TND`, 14, finalY + 14);
  doc.text(`Total (${nights} nuits): ${total.toFixed(2)} TND`, 14, finalY + 22);

  doc.setFontSize(9);
  doc.text(`Note: Les bébés (0-2 ans) ne sont pas inclus dans la capacité ni dans le prix.`, 14, finalY + 32);

  doc.save(`${factureNumber}.pdf`);
}
