import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DestinationService } from '../../services/destination.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Destinations } from '../../models/destinations';
import { forkJoin, map, Subject, switchMap, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-destination-detail',
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './destination-detail.html',
  styleUrl: './destination-detail.css',
})
export class DestinationDetail implements OnInit, OnDestroy {
  destination!: Destinations;
  relatedDestinations: Destinations[] = [];
  mapUrl?: SafeResourceUrl;

  selectedImageIndex = 0;
  autoSlideInterval: any;

  selectedPackage = { adults: 1, children: 0, checkIn: '', checkOut: '' };

  today!: string;
  bookingMessage = '';
  bookingMessageType: 'error' | 'success' = 'error';

  // ✅ used for "Download facture" button after success
  lastReservation: any | null = null;

  // ✅ inline errors
  bookingError = '';
  bookingErrors = {
    checkIn: '',
    checkOut: '',
    people: '',
  };
  showErrors = false;
  // Used to stop RxJS subscriptions when leaving the page.
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private destinationService: DestinationService,
    private router: Router,
    private cd: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.today = new Date().toISOString().split('T')[0];

    this.route.paramMap
      .pipe(
        map(params => Number(params.get('id'))),
        switchMap(id => {
          if (!id) {
            this.router.navigate(['/destination']);
            throw new Error('Invalid id');
          }

          return forkJoin({
            dest: this.destinationService.getdestinationById(id),
            all: this.destinationService.getdestinations(),
          });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: ({ dest, all }) => {
          this.destination = dest;
          this.relatedDestinations = all.filter(d => d.id !== dest.id);
          const raw = this.destination.map; // string like "https://www.google.com/maps/embed?..."
          this.mapUrl = raw
            ? this.sanitizer.bypassSecurityTrustResourceUrl(raw)
            : undefined;

          this.selectedImageIndex = 0;
          if (this.destination.images?.length > 1) this.startAutoSlide();
          else this.pauseAutoSlide();

          window.scrollTo(0, 0);
          this.cd.detectChanges();
        },
        error: () => this.router.navigate(['/destination']),
      });
  }

  ngOnDestroy() {
    if (this.autoSlideInterval) clearInterval(this.autoSlideInterval);
    document.body.style.overflow = 'auto';

    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------- Carousel ----------------
  get selectedImage(): string {
    if (!this.destination?.images?.length) return '';
    return 'images/' + this.destination.images[this.selectedImageIndex];
  }
  // loop back to 0 when reaching last image.
  nextImage() {
    this.selectedImageIndex =
      (this.selectedImageIndex + 1) % this.destination.images.length;
    this.cd.detectChanges();
  }
  // Adds length to avoid negative index.
  prevImage() {
    this.selectedImageIndex =
      (this.selectedImageIndex - 1 + this.destination.images.length) %
      this.destination.images.length;
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
    if (this.destination.images.length <= 1) return;
    this.startAutoSlide();
  }
  // open/close FAQ 
  toggleFaq(index: number) {
    if (this.destination.faq)
      this.destination.faq[index].open = !this.destination.faq[index].open;
  }

  // ---------------- Validation helpers ----------------
  private clearErrors() {
    this.bookingError = '';
    this.bookingErrors = { checkIn: '', checkOut: '', people: '' };
  }

  private validateBooking(): boolean {
    this.clearErrors();
    this.showErrors = true;

    const { checkIn, checkOut, adults, children } = this.selectedPackage;

    if (!checkIn) this.bookingErrors.checkIn = "Veuillez choisir la date d'arrivée.";
    if (!checkOut) this.bookingErrors.checkOut = "Veuillez choisir la date de départ.";

    if (checkIn && checkOut) {
      const nights = this.daysBetween(checkIn, checkOut);
      if (nights <= 0) {
        this.bookingErrors.checkOut =
          "La date de départ doit être après la date d’arrivée.";
      }
    }

    const people = (adults || 0) + (children || 0);
    if (people <= 0) {
      this.bookingErrors.people = 'Veuillez sélectionner au moins 1 voyageur.';
    }

    if (
      this.bookingErrors.checkIn ||
      this.bookingErrors.checkOut ||
      this.bookingErrors.people
    ) {
      this.bookingError = 'Veuillez corriger les champs en rouge.';
      return false;
    }

    return true;
  }

  // optional: disable button
  get canBook(): boolean {
    const { checkIn, checkOut, adults, children } = this.selectedPackage;
    const people = (adults || 0) + (children || 0);
    return (
      !!checkIn &&
      !!checkOut &&
      people > 0 &&
      this.daysBetween(checkIn, checkOut) > 0
    );
  }

  // ---------------- Booking ----------------
  bookTrip(event?: Event) {
    // Prevent default form refresh
    event?.preventDefault();

    // reset messages + reservation
    this.bookingMessage = '';
    this.bookingMessageType = 'error';
    this.lastReservation = null;

    // reset validation display
    this.showErrors = false;
    this.clearErrors();

    // ✅ validate first (so user sees field errors)
    if (!this.validateBooking()) return;

    // 1) auth check
    if (!this.authService.isLoggedIn()) {
      this.bookingMessage = 'Vous devez être connecté pour réserver.';
      const returnUrl = this.router.url;
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
      return;
    }

    const { checkIn, checkOut, adults, children } = this.selectedPackage;

    const nights = this.daysBetween(checkIn, checkOut);
    const totalPeople = (adults || 0) + (children || 0);
    const totalAmount = totalPeople * (this.destination.price || 0) * nights;

    const payload = {
      destinationId: this.destination.id,
      checkIn,
      checkOut,
      adults,
      children,
      totalAmount,
    };

    this.destinationService.reserveDestination(payload).subscribe({
      next: (saved: any) => {
        this.bookingMessageType = 'success';
        this.bookingMessage = 'Réservation enregistrée ✅';
        this.lastReservation = saved;

        // hide errors after success
        this.showErrors = false;
        this.clearErrors();

        this.cd.detectChanges();
      },
      error: (err) => {
        console.error(err);

        if (err?.status === 401) {
          this.bookingMessage = 'Session expirée. Veuillez vous reconnecter.';
          const returnUrl = this.router.url;
          this.router.navigate(['/login'], { queryParams: { returnUrl } });
          return;
        }

        this.bookingMessage = "Erreur lors de l'enregistrement de la réservation.";
      },
    });
  }

  downloadLatestFacture() {
    if (!this.lastReservation) return;
    this.downloadDestinationFacturePdf(this.lastReservation);
  }

  // ---------------- Utils ----------------
  daysBetween(a: string, b: string): number {
    if (!a || !b) return 0;
    const [y1, m1, d1] = a.split('-').map(Number);
    const [y2, m2, d2] = b.split('-').map(Number);
    const dIn = new Date(y1, (m1 || 1) - 1, d1 || 1);
    const dOut = new Date(y2, (m2 || 1) - 1, d2 || 1);
    const diff = Math.ceil((dOut.getTime() - dIn.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(diff, 0);
  }
  // ---------------- Handlers ----------------
  // if checkout is earlier than checkin → reset checkout.
  onCheckInChange() {
    if (
      this.selectedPackage.checkOut &&
      this.selectedPackage.checkOut < this.selectedPackage.checkIn
    ) {
      this.selectedPackage.checkOut = '';
    }
    this.showErrors = false;
    this.clearErrors();
  }
  // clear error display when user edits inputs
  onCheckOutChange() {
    this.showErrors = false;
    this.clearErrors();
  }
  // clear error display when user edits inputs
  onPeopleChange() {
    this.showErrors = false;
    this.clearErrors();
  }

  getStars(n: number): number[] {
    return Array.from({ length: Math.round(n) }, (_, i) => i + 1);
  }

  get averageRating(): number {
    if (!this.destination?.reviews?.length) return 0;
    const total = this.destination.reviews.reduce((sum, r) => sum + r.stars, 0);
    return total / this.destination.reviews.length;
  }

  getAverageRating(dest: Destinations): number {
    if (!dest?.reviews?.length) return 0;
    const total = dest.reviews.reduce((sum, r) => sum + r.stars, 0);
    return total / dest.reviews.length;
  }

  // ---------------- PDF ----------------
  downloadDestinationFacturePdf(saved: any) {
    const doc = new jsPDF();
    const now = new Date(saved?.createdAt || Date.now());

    const factureNumber = `DEST-${saved?.id ?? now.getTime()}`;

    const checkIn = saved?.checkIn || this.selectedPackage.checkIn;
    const checkOut = saved?.checkOut || this.selectedPackage.checkOut;

    const nights = this.daysBetween(checkIn, checkOut);

    const adults = Number(saved?.adults ?? this.selectedPackage.adults ?? 0);
    const children = Number(saved?.children ?? this.selectedPackage.children ?? 0);
    const people = adults + children;

    const pricePerPerson = Number(this.destination?.price ?? 0);

    const totalAmount =
      saved?.totalAmount != null
        ? Number(saved.totalAmount)
        : pricePerPerson * people * nights;

    doc.setFontSize(16);
    doc.text('FACTURE - Réservation Destination', 14, 18);

    doc.setFontSize(10);
    doc.text(`N° Facture: ${factureNumber}`, 14, 26);
    doc.text(`Date: ${now.toLocaleDateString()}`, 14, 32);

    doc.setFontSize(12);
    doc.text(`Destination: ${this.destination?.name || '-'}`, 14, 44);

    doc.setFontSize(10);
    doc.text(`Pays: ${this.destination?.country || '-'}`, 14, 50);
    doc.text(`Lieu: ${this.destination?.location || '-'}`, 14, 56);

    doc.text(`Arrivée: ${checkIn}`, 14, 66);
    doc.text(`Départ: ${checkOut}`, 14, 72);
    doc.text(`Nuits: ${nights}`, 14, 78);

    doc.text(`Voyageurs: ${adults} adulte(s), ${children} enfant(s)`, 14, 86);
    doc.text(`Prix: ${pricePerPerson.toFixed(2)} TND / personne / nuit`, 14, 92);

    autoTable(doc, {
      startY: 102,
      head: [['Type', 'Nombre', 'Prix (TND)', 'Nuits', 'Total (TND)']],
      body: [
        ['Adultes', `${adults}`, `${pricePerPerson.toFixed(2)}`, `${nights}`, `${(adults * pricePerPerson * nights).toFixed(2)}`],
        ['Enfants', `${children}`, `${pricePerPerson.toFixed(2)}`, `${nights}`, `${(children * pricePerPerson * nights).toFixed(2)}`],
      ],
      styles: { fontSize: 9 },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 102;

    doc.setFontSize(12);
    doc.text(`TOTAL: ${totalAmount.toFixed(2)} TND`, 14, finalY + 14);

    doc.save(`${factureNumber}.pdf`);
  }

  scrollToBooking() {
    document.getElementById('bookingPanel')?.scrollIntoView({ behavior: 'smooth' });
  }
}
