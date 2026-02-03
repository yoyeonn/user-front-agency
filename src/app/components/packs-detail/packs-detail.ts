import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PacksService } from '../../services/packs.service';
import { Pack } from '../../models/pack';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Room } from '../../models/hotel';
import { AuthService } from '../../services/auth.service';
import { PackReservationService } from '../../services/pack-reservation.service';
import { PackInvoiceService } from '../../services/pack-invoice.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

type MealPlan = 'ROOM_ONLY' | 'BB' | 'HB' | 'FB' | 'AI' | 'UAI';

@Component({
  selector: 'app-packs-detail',
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './packs-detail.html',
  styleUrl: './packs-detail.css',
})
export class PacksDetail implements OnInit, OnDestroy {
  pack!: Pack;
  relatedPacks: Pack[] = [];
  mapUrl?: SafeResourceUrl;

  selectedImageIndex: number = 0;
  autoSlideInterval: any;

  bookingRooms: { room: Room; adults: number; children: number; babies: number }[] = [];
  selectedRoomToAdd: Room | null = null;

  booking = {
    checkin: '',
    checkout: '',
    mealPlan: 'ROOM_ONLY' as MealPlan,
  };

  showRoomModal = false;
  today!: string;

  bookingMessage = '';
  bookingMessageType: 'error' | 'success' = 'error';
  lastReservationId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private packsService: PacksService,
    private router: Router,
    private cd: ChangeDetectorRef,
    private auth: AuthService,
    private packRes: PackReservationService,
    private sanitizer: DomSanitizer,
    private packInvoice: PackInvoiceService
  ) {}

  private setMap(raw?: string) {
  this.mapUrl = raw
    ? this.sanitizer.bypassSecurityTrustResourceUrl(raw)
    : undefined;
}

  ngOnInit(): void {
    this.today = new Date().toISOString().split('T')[0];

    this.route.paramMap.subscribe(async (params) => {
      const id = Number(params.get('id'));
      if (!id) return;

      try {
        const allPacks = await this.packsService.getPacks();
        this.pack = await this.packsService.getPacksById(id);

        if (!this.pack) {
          this.router.navigate(['/packs']);
          return;
        }

        this.relatedPacks = allPacks.filter((p) => p.id !== id);
        this.setMap(this.pack?.map);

        // Init rooms from hotel rooms
        if (this.pack.hotel?.rooms?.length) {
          this.bookingRooms = this.pack.hotel.rooms.map((r) => ({
            room: r,
            adults: Math.min(2, r.capacity || 2),
            children: 0,
            babies: 0,
          }));
        } else {
          this.bookingRooms = [];
        }

        this.selectedImageIndex = 0;
        if (this.pack.images?.length > 1) this.startAutoSlide();

        window.scrollTo(0, 0);
        this.cd.detectChanges();
      } catch (err) {
        console.error(err);
        this.router.navigate(['/packs']);
      }
    });
  }

  ngOnDestroy() {
    if (this.autoSlideInterval) clearInterval(this.autoSlideInterval);
    document.body.style.overflow = 'auto';
  }

  // ===== Carousel =====
  get selectedImage(): string {
    if (!this.pack?.images?.length) return '';
    return this.pack.images[this.selectedImageIndex];
  }

  nextImage() {
    this.selectedImageIndex = (this.selectedImageIndex + 1) % this.pack.images.length;
    this.cd.detectChanges();
  }

  prevImage() {
    this.selectedImageIndex =
      (this.selectedImageIndex - 1 + this.pack.images.length) % this.pack.images.length;
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
    this.autoSlideInterval = setInterval(() => this.nextImage(), 4000);
  }

  restartAutoSlide() {
    if (this.autoSlideInterval) clearInterval(this.autoSlideInterval);
    this.startAutoSlide();
  }

  pauseAutoSlide() {
    if (this.autoSlideInterval) clearInterval(this.autoSlideInterval);
  }

  resumeAutoSlide() {
    if (!this.pack?.images || this.pack.images.length <= 1) return;
    this.startAutoSlide();
  }

  // ===== FAQ =====
  toggleFaq(index: number) {
    if (this.pack.faq) this.pack.faq[index].open = !this.pack.faq[index].open;
  }

  // ===== Rooms modal =====
  openRoomModal(e?: Event) {
    e?.preventDefault();
    e?.stopPropagation();
    this.showRoomModal = true;
    document.body.style.overflow = 'hidden';
    this.cd.detectChanges();
  }

  closeRoomModal(e?: Event) {
    e?.preventDefault();
    e?.stopPropagation();
    this.showRoomModal = false;
    document.body.style.overflow = 'auto';
    this.cd.detectChanges();
  }

  addRoom(selectedRoom: Room | null) {
    if (!selectedRoom) return;

    this.bookingRooms.push({
      room: selectedRoom,
      adults: Math.min(2, selectedRoom.capacity || 2),
      children: 0,
      babies: 0,
    });

    this.selectedRoomToAdd = null;
  }

  removeRoom(index: number) {
    this.bookingRooms.splice(index, 1);
  }

  // ===== Formula helpers =====
  mealPlanLabel(plan: MealPlan) {
    switch (plan) {
      case 'ROOM_ONLY': return "Hébergement seul (chambre)";
      case 'BB': return "Petit-déjeuner inclus";
      case 'HB': return "Demi-pension (petit-déjeuner + 1 repas)";
      case 'FB': return "Pension complète (petit-déjeuner + déjeuner + dîner)";
      case 'AI': return "Tout compris";
      case 'UAI': return "Ultra tout compris";
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

  // ===== People are computed from rooms =====
  get totalAdults(): number {
    return this.bookingRooms.reduce((sum, br) => sum + (Number(br.adults) || 0), 0);
  }

  get totalChildren(): number {
    return this.bookingRooms.reduce((sum, br) => sum + (Number(br.children) || 0), 0);
  }

  get totalPeople(): number {
    // babies not counted
    return this.totalAdults + this.totalChildren;
  }

  get nights(): number {
    if (!this.booking.checkin || !this.booking.checkout) return 0;
    const inDate = new Date(this.booking.checkin);
    const outDate = new Date(this.booking.checkout);
    const diff = outDate.getTime() - inDate.getTime();
    return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
  }

  get mealPlanTotal(): number {
    // extra per person per night
    return this.mealPlanExtra(this.booking.mealPlan) * this.totalPeople * this.nights;
  }

  get basePackTotal(): number {
    // pack price per person per night
    const price = this.pack?.price || 0;
    return price * this.totalPeople * this.nights;
  }

  get totalAmount(): number {
    return this.basePackTotal + this.mealPlanTotal;
  }
  

  // ===== Book pack =====
  async bookPack(event?: Event) {
    event?.preventDefault();

    this.bookingMessage = '';
    this.bookingMessageType = 'error';
    this.lastReservationId = null;

    if (!this.auth.isLoggedIn()) {
      this.bookingMessage = 'Vous devez être connecté pour réserver.';
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    const checkIn = this.booking.checkin;
    const checkOut = this.booking.checkout;

    if (!checkIn || !checkOut) {
      this.bookingMessage = "Veuillez choisir les dates d'arrivée et de départ.";
      return;
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      this.bookingMessage = "La date de départ doit être après la date d’arrivée.";
      return;
    }

    if (this.totalPeople <= 0) {
      this.bookingMessage = "Veuillez sélectionner au moins 1 adulte ou enfant dans les chambres.";
      return;
    }

    const nights = this.nights;
    if (nights <= 0) {
      this.bookingMessage = "Nombre de nuits invalide.";
      return;
    }

    // rooms CSV
    const csv = (arr: any[]) => arr.map(x => String(x ?? '')).join(',');

    const payload: any = {
      packId: this.pack.id,
      checkIn,
      checkOut,

      // computed from rooms (frontend removed manual inputs)
      adults: this.totalAdults,
      children: this.totalChildren,

      // formula
      mealPlan: this.booking.mealPlan,
      mealPlanExtra: this.mealPlanExtra(this.booking.mealPlan),

      // total = (pack price + meal extra) * people * nights
      totalAmount: this.totalAmount,

      roomIds: csv(this.bookingRooms.map(br => br.room.id)),
      roomNames: csv(this.bookingRooms.map(br => br.room.name)),
      roomPrices: csv(this.bookingRooms.map(br => br.room.price)),
      roomAdults: csv(this.bookingRooms.map(br => br.adults)),
      roomChildren: csv(this.bookingRooms.map(br => br.children)),
      roomBabies: csv(this.bookingRooms.map(br => br.babies)),
    };

    try {
      const res = await this.packRes.reservePack(payload);

      this.bookingMessageType = 'success';
      this.bookingMessage = 'Réservation enregistrée ✅';
      this.lastReservationId = res?.data ?? null;

      this.cd.detectChanges();
    } catch (e: any) {
      console.error(e);
      this.bookingMessageType = 'error';
      this.bookingMessage =
        e?.response?.data?.message || e?.message || "Erreur lors de l'enregistrement de la réservation.";
    }
  }

  downloadLatestFacture() {
    if (!this.lastReservationId) return;
    this.packInvoice.downloadPackInvoicePdf(this.lastReservationId);
  }

  imageUrl(img: string | null | undefined): string {
  if (!img) return 'images/default.jpg';

  if (img.startsWith('http://') || img.startsWith('https://')) return img;

  return 'images/' + img;
}
}
