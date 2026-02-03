import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HotelService } from '../../services/hotel.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Hotel, Room } from '../../models/hotel';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuthService } from '../../services/auth.service';
import { InvoiceService } from '../../services/invoice.service';

type MealPlan = 'ROOM_ONLY' | 'BB' | 'HB' | 'FB' | 'AI' | 'UAI';

@Component({
  selector: 'app-hotel-detail',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './hotel-detail.html',
  styleUrl: './hotel-detail.css',
})
export class HotelDetail implements OnInit, OnDestroy {
  hotel!: Hotel;
  mapUrl?: SafeResourceUrl;
  relatedHotels: Hotel[] = [];
  bookingRooms: { room: Room; adults: number; children: number; babies: number }[] = [];
  selectedRoomToAdd: Room | null = null;
  bookingError: string = '';
  booking = { checkin: '', checkout: '', guests: 1, mealPlan: 'ROOM_ONLY' as MealPlan };
  showRoomModal = false;
  today!: string;
  
  selectedImageIndex = 0;
  autoSlideInterval: any;
  
  bookingMessage = '';          // message under button
  bookingMessageType: 'error' | 'success' = 'error';

  constructor(
    private route: ActivatedRoute,
    private hotelService: HotelService,
    private router: Router,
    private sanitizer: DomSanitizer,
    private cd: ChangeDetectorRef,
    private authService: AuthService,
    private invoiceService: InvoiceService
  ) { }

  ngOnInit(): void {
    this.today = new Date().toISOString().split('T')[0];
    this.route.paramMap.subscribe(async params => {
      const id = Number(params.get('id'));
      if (!id) return;

      try {
        const allHotels = await this.hotelService.getHotels();

        this.hotel = await this.hotelService.getHotelById(id);
        const raw = this.hotel.map; // string like "https://www.google.com/maps/embed?..."
        this.mapUrl = raw
          ? this.sanitizer.bypassSecurityTrustResourceUrl(raw)
          : undefined;
        if (!this.hotel) {
          this.router.navigate(['/hotel']);
          return;
        }

        this.relatedHotels = allHotels.filter(h => h.id !== id);

        this.hotel.rooms ??= [];
        this.hotel.highlights ??= [];
        this.hotel.images ??= [];
        this.hotel.nearby ??= [];
        this.hotel.faq ??= [];
        this.hotel.reviews ??= [];
        this.hotel.programme ??= [];
        this.bookingRooms = this.hotel.rooms.map(r => ({
          room: r,
          adults: Math.min(r.capacity, 2),
          children: 0,
          babies: 0
        }));


        this.selectedImageIndex = 0;
        if (this.hotel.images.length > 1) {
          this.startAutoSlide();
        }

        window.scrollTo(0, 0);
        this.cd.detectChanges();

      } catch (err) {
        console.error(err);
        this.router.navigate(['/hotel']);
      }
    });
  }


  ngOnDestroy() {
    if (this.autoSlideInterval) clearInterval(this.autoSlideInterval);
    document.body.style.overflow = 'auto';
  }

  get selectedImage(): string {
    if (!this.hotel?.images?.length) return '';
    return 'images/' + this.hotel.images[this.selectedImageIndex];
  }


  nextImage() {
    this.selectedImageIndex =
      (this.selectedImageIndex + 1) % this.hotel.images.length;

    this.cd.detectChanges();
  }

  prevImage() {
    this.selectedImageIndex =
      (this.selectedImageIndex - 1 + this.hotel.images.length) %
      this.hotel.images.length;

    this.cd.detectChanges();
  }

  selectImage(index: number) {
    if (index === this.selectedImageIndex) return;
    this.selectedImageIndex = index;
    this.restartAutoSlide();
    this.cd.detectChanges();
  }

  startAutoSlide() {
    if (this.autoSlideInterval) clearInterval(this.autoSlideInterval);

    this.autoSlideInterval = setInterval(() => {
      this.nextImage();
    }, 4000);
  }
  restartAutoSlide() {
    if (this.autoSlideInterval) clearInterval(this.autoSlideInterval);
    this.startAutoSlide();
  }

  pauseAutoSlide() {
    if (this.autoSlideInterval) clearInterval(this.autoSlideInterval);
  }

  resumeAutoSlide() {
    if (this.hotel.images.length <= 1) return;
    this.startAutoSlide();
  }


  toggleFaq(index: number) {
    if (this.hotel.faq) this.hotel.faq[index].open = !this.hotel.faq[index].open;
  }

  getTotalReservationAmount(): number {
  const nights = this.daysBetween(this.booking.checkin, this.booking.checkout);

  // per night = rooms base + meal plan extra (both exclude babies)
  const basePerNight = this.bookingRooms.reduce((sum, br) => sum + this.getRoomBasePerNight(br), 0);
  const mealPerNight = this.bookingRooms.reduce((sum, br) => sum + this.getRoomMealExtraPerNight(br), 0);

  return (basePerNight + mealPerNight) * nights;
}


 async bookHotel(event: Event) {
  event.preventDefault();

  if (!this.authService.isLoggedIn()) {
    this.bookingMessageType = 'error';
    this.bookingMessage = "Vous devez être connecté pour réserver.";
    const returnUrl = this.router.url;
    this.router.navigate(['/login'], { queryParams: { returnUrl } });
    return;
  }

  this.bookingError = '';
  this.bookingMessage = '';

  if (!this.booking.checkin || !this.booking.checkout) {
    this.bookingError = "Veuillez sélectionner les dates d’arrivée et de départ.";
    return;
  }

  const nights = this.daysBetween(this.booking.checkin, this.booking.checkout);
  if (nights <= 0) {
    this.bookingError = "La date de départ doit être après la date d’arrivée.";
    return;
  }

  if (this.getTotalGuests() === 0) {
    this.bookingError = "Veuillez sélectionner au moins un adulte ou un enfant.";
    return;
  }

  const payload = {
    hotelId: this.hotel.id,
    checkIn: this.booking.checkin,
    checkOut: this.booking.checkout,
    mealPlan: this.booking.mealPlan,
    totalAmount: this.getTotalReservationAmount(),
    rooms: this.bookingRooms.map(br => ({
      roomId: br.room.id,
      roomName: br.room.name,
      adults: br.adults,
      children: br.children,
      babies: br.babies,
      pricePerPerson: br.room.price,
      totalLine: this.getRoomBasePerNight(br) + this.getRoomMealExtraPerNight(br),
    })),
  };

  try {
    const created = await this.hotelService.reserveHotel(payload);

    if (!created?.id) {
      this.bookingMessageType = 'error';
      this.bookingMessage = "Réservation OK mais ID manquant (backend response).";
      return;
    }

    this.bookingMessageType = 'success';
    this.lastReservationId = created.id;
    this.bookingMessage = "Réservation enregistrée ✅";


  } catch (err: any) {
    console.error("RESERVE ERROR:", err);
    this.bookingMessageType = 'error';
    this.bookingMessage = err?.error?.message || "Erreur lors de l'enregistrement de la réservation.";
  }
}




  getStars(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i + 1);
  }


  getFacilityIcon(facility: string): string {
    const f = facility.toLowerCase();
    if (f.includes('beach')) return 'flaticon-sun-umbrella';
    if (f.includes('dining') || f.includes('restaurant')) return 'fa fa-cutlery';
    if (f.includes('pool')) return 'fa fa-tint';
    if (f.includes('wifi')) return 'fa fa-wifi';
    if (f.includes('gym')) return 'fa fa-bicycle';
    if (f.includes('spa') || f.includes('wellness')) return 'fa fa-heart';
    if (f.includes('mountain')) return 'fa fa-tree';
    if (f.includes('hiking')) return 'fa fa-compass';
    if (f.includes('fireplace')) return 'fa fa-fire';
    if (f.includes('parking')) return 'fa fa-car';
    if (f.includes('king')) return 'flaticon-king-size';
    if (f.includes('shower') || f.includes('bath')) return 'flaticon-shower';
    return 'fa fa-check';
  }

  shortFacility(facility: string): string {
    const f = facility.toLowerCase();
    if (f.includes('beach')) return 'Beachfront';
    if (f.includes('dining') || f.includes('restaurant')) return 'All-inclusive';
    if (f.includes('pool')) return 'Pool';
    if (f.includes('wifi')) return 'Free Wi-Fi';
    if (f.includes('gym')) return 'Gym';
    if (f.includes('spa') || f.includes('wellness')) return 'Spa';
    if (f.includes('mountain')) return 'Mountain';
    if (f.includes('hiking')) return 'Hiking-Trails';
    if (f.includes('fireplace')) return 'Fireplace';
    if (f.includes('parking')) return 'Parking';
    if (f.includes('king')) return 'Bed';
    if (f.includes('shower') || f.includes('bath')) return 'Bathroom';
    return facility;
  }

  addRoom(selectedRoom: Room | null) {
    if (!selectedRoom) return;
    this.bookingRooms.push({
      room: selectedRoom,
      adults: Math.min(selectedRoom.capacity, 2),
      children: 0,
      babies: 0
    });

    this.selectedRoomToAdd = null;
  }


  removeRoom(index: number) {
    this.bookingRooms.splice(index, 1);
  }

  openRoomModal() {
    this.showRoomModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeRoomModal() {
    this.showRoomModal = false;
    document.body.style.overflow = 'auto';
  }

  accordionOpen: {[key: string]: boolean} = {};

toggleAccordion(section: string) {
  this.accordionOpen[section] = !this.accordionOpen[section];
}

mealPlanLabel(plan: MealPlan) {
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

mealPlanExtra(plan: MealPlan): number {
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
get totalAdults(): number {
  return this.bookingRooms.reduce((sum, r) => sum + r.adults, 0);
}

get totalChildren(): number {
  return this.bookingRooms.reduce((sum, r) => sum + r.children, 0);
}

get totalPeople(): number {
  // babies are usually free
  return this.totalAdults + this.totalChildren;
}

get nights(): number {
  if (!this.booking.checkin || !this.booking.checkout) return 0;

  const inDate = new Date(this.booking.checkin);
  const outDate = new Date(this.booking.checkout);
  const diff = outDate.getTime() - inDate.getTime();

  return diff > 0 ? diff / (1000 * 60 * 60 * 24) : 0;
}

get mealPlanTotal(): number {
  return this.mealPlanExtra(this.booking.mealPlan)
    * this.totalPeople
    * this.nights;
}
normalizeOccupancy(br: { room: Room; adults: number; children: number; babies: number }) {
  const cap = br.room.capacity || 0;

  br.adults = Number(br.adults || 0);
  br.children = Number(br.children || 0);
  br.babies = Number(br.babies || 0);

  // adults min = 1 
  if (br.adults < 1) br.adults = 1;
  if (br.children < 0) br.children = 0;
  if (br.babies < 0) br.babies = 0;

  // Capacity rule: adults + children <= capacity (babies ignored)
  const total = br.adults + br.children;

  if (total > cap) {
    // reduce children first
    const overflow = total - cap;
    br.children = Math.max(0, br.children - overflow);

    // if still overflow, reduce adults
    const total2 = br.adults + br.children;
    if (total2 > cap) {
      br.adults = Math.max(1, br.adults - (total2 - cap));
    }
  }
}

getRoomGuests(br: { adults: number; children: number; babies: number }) {
  // babies not counted
  return (br.adults || 0) + (br.children || 0);
}

getRoomTotalPerNight(br: { room: Room; adults: number; children: number; babies: number }) {
  // babies not counted in price
  const guests = this.getRoomGuests(br);
  const pricePerPerson = br.room.price || 0;
  return guests * pricePerPerson;
}

getTotalGuests() {
  return this.bookingRooms.reduce((sum, br) => sum + this.getRoomGuests(br), 0);
}

getTotalPerNight() {
  return this.bookingRooms.reduce((sum, br) => sum + this.getRoomTotalPerNight(br), 0);
}

daysBetween(checkin: string, checkout: string): number {
  if (!checkin || !checkout) return 0;
  const a = new Date(checkin);
  const b = new Date(checkout);
  const diff = Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 0);
}

getRoomBasePerNight(br: { room: Room; adults: number; children: number; babies: number }) {
  // room price is PER PERSON / NIGHT
  const guests = this.getRoomGuests(br); // adults + children only
  const pricePerPerson = br.room.price || 0;
  return guests * pricePerPerson;
}

getRoomMealExtraPerNight(br: { room: Room; adults: number; children: number; babies: number }) {
  const guests = this.getRoomGuests(br); // adults + children only
  return guests * this.mealPlanExtra(this.booking.mealPlan);
}

// downloadFacturePdf() {
//   const doc = new jsPDF();
//   const now = new Date();
//   const factureNumber = `FAC-${now.getTime()}`;

//   const nights = this.daysBetween(this.booking.checkin, this.booking.checkout);
//   const planExtra = this.mealPlanExtra(this.booking.mealPlan);

//   const totalRoomsPerNight = this.bookingRooms.reduce((sum, br) => sum + this.getRoomBasePerNight(br), 0);
//   const totalMealPerNight = this.bookingRooms.reduce((sum, br) => sum + this.getRoomMealExtraPerNight(br), 0);

//   const totalPerNight = totalRoomsPerNight + totalMealPerNight;
//   const total = totalPerNight * nights;

//   // Header
//   doc.setFontSize(16);
//   doc.text('FACTURE - Réservation Hôtel', 14, 18);

//   doc.setFontSize(10);
//   doc.text(`N° Facture: ${factureNumber}`, 14, 26);
//   doc.text(`Date: ${now.toLocaleDateString()}`, 14, 32);

//   // Hotel info
//   doc.setFontSize(12);
//   doc.text(`Hôtel: ${this.hotel?.name || '-'}`, 14, 44);
//   doc.setFontSize(10);
//   doc.text(`Lieu: ${this.hotel?.city || '-'} - ${this.hotel?.country || '-'}`, 14, 50);

//   // Booking info
//   doc.text(`Arrivée: ${this.booking.checkin}`, 14, 60);
//   doc.text(`Départ: ${this.booking.checkout}`, 14, 66);
//   doc.text(`Nuits: ${nights}`, 14, 72);

//   doc.text(`Formule: ${this.mealPlanLabel(this.booking.mealPlan)}`, 14, 80);
//   doc.text(`Supplément formule: ${planExtra} TND / personne / nuit`, 14, 86);

//   // Table
//   const rows = this.bookingRooms.map((br, i) => {
//     const guests = this.getRoomGuests(br); // adults + children
//     const roomBase = this.getRoomBasePerNight(br);
//     const meal = this.getRoomMealExtraPerNight(br);
//     const perNight = roomBase + meal;

//     return [
//       `${i + 1}`,
//       br.room?.name || 'Chambre',
//       `${br.adults || 0}`,
//       `${br.children || 0}`,
//       `${br.babies || 0}`,
//       `${guests}`,
//       `${(br.room.price || 0).toFixed(2)} TND`,
//       `${roomBase.toFixed(2)} TND`,
//       `${meal.toFixed(2)} TND`,
//       `${perNight.toFixed(2)} TND`,
//     ];
//   });

//   autoTable(doc, {
//     startY: 96,
//     head: [[
//       '#', 'Chambre', 'Adultes', 'Enfants', 'Bébés', 'Payants',
//       'Prix/pers', 'Chambre/nuit', 'Formule/nuit', 'Total/nuit'
//     ]],
//     body: rows,
//     styles: { fontSize: 8 },
//   });

//   const finalY = (doc as any).lastAutoTable?.finalY || 96;

//   doc.setFontSize(12);
//   doc.text(`Total / nuit: ${totalPerNight.toFixed(2)} TND`, 14, finalY + 14);
//   doc.text(`Total (${nights} nuits): ${total.toFixed(2)} TND`, 14, finalY + 22);

//   doc.setFontSize(9);
//   doc.text(`Note: Les bébés (0-2 ans) ne sont pas inclus dans la capacité ni dans le prix.`, 14, finalY + 32);

//   doc.save(`${factureNumber}.pdf`);
// }

onCheckinChange() {
  if (this.booking.checkout && this.booking.checkout < this.booking.checkin) {
    this.booking.checkout = '';
  }
}


lastReservationId: number | null = null;
async downloadLatestFacture() {
  if (!this.lastReservationId) return;
  try {
    await this.invoiceService.downloadInvoicePdf(this.lastReservationId);
  } catch (e) {
    this.bookingMessageType = 'error';
    this.bookingMessage = "Impossible de télécharger la facture.";
  }
}

imageUrl(img: string | null | undefined): string {
  if (!img) return 'images/default.jpg';

  if (img.startsWith('http://') || img.startsWith('https://')) return img;

  return 'images/' + img;
}
}
