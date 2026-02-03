import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import {FormBuilder,ReactiveFormsModule,Validators,AbstractControl,ValidationErrors,} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ReservationRow, ReservationService } from '../../services/reservation.service';
import { InvoiceService } from '../../services/invoice.service';
import { DestinationReservationRow, DestinationReservationService } from '../../services/destination-reservation.service';
import { DestinationInvoiceService } from '../../services/destination-invoice.service';
import { PackReservationRow, PackReservationService } from '../../services/pack-reservation.service';
import { PackInvoiceService } from '../../services/pack-invoice.service';

declare var $: any;

function matchPasswords(group: AbstractControl): ValidationErrors | null {
  const np = group.get('newPassword')?.value;
  const cp = group.get('confirmPassword')?.value;
  if (!np || !cp) return null;
  return np !== cp ? { mismatch: true } : null;
}

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './profil.html',
  styleUrl: './profil.css',
})
export class Profil implements OnInit {
  ngAfterViewInit(): void {
    this.contentWayPoint();
    this.initOwlCarousel();

    this.cdr.detectChanges();
  }

  private contentWayPoint(): void {
    if ($('.ftco-animate').length === 0) return;

    $('.ftco-animate').toArray().forEach((el: HTMLElement) => {
      const $el = $(el);
      $el.waypoint((direction: string) => {
        if (direction === 'down' && !$el.hasClass('ftco-animated')) {
          $el.addClass('item-animate');
          setTimeout(() => {
            $('body .ftco-animate.item-animate').toArray().forEach((el2: HTMLElement, k: number) => {
              const $el2 = $(el2);
              const effect = $el2.data('animate-effect');
              if (effect === 'fadeIn') $el2.addClass('fadeIn ftco-animated');
              else if (effect === 'fadeInLeft') $el2.addClass('fadeInLeft ftco-animated');
              else if (effect === 'fadeInRight') $el2.addClass('fadeInRight ftco-animated');
              else $el2.addClass('fadeInUp ftco-animated');

              $el2.removeClass('item-animate');
            });
          }, 100);
        }
      }, { offset: '95%' });
    });
    
    setTimeout(() => {
      $(window).trigger('resize').trigger('scroll');
    }, 100);
  }

  private initOwlCarousel(): void {
    // Make sure jQuery and Owl Carousel are loaded
    if ($('.owl-carousel').length === 0) return;

    $('.owl-carousel').owlCarousel({
      loop: true,
      margin: 30,
      nav: true,
      dots: true,
      autoplay: true,
      autoplayTimeout: 3000,
      responsive: {
        0: { items: 1 },
        600: { items: 2 },
        1000: { items: 3 }
      }
    });
  }
  user: any = null;

  reservations: ReservationRow[] = [];
  loading = false;
  error = '';

  pwdMsg = '';
  pwdMsgType: 'success' | 'error' = 'error';

  pwdForm;

  packReservations: PackReservationRow[] = [];

  //show loading per reservation download
  downloadingId: number | null = null;

  destinationReservations: DestinationReservationRow[] = [];

  constructor(
    private auth: AuthService,
    private reservationService: ReservationService,
    private fb: FormBuilder,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private invoiceService: InvoiceService,
    private destResService: DestinationReservationService,
    private destInvoiceService: DestinationInvoiceService,
    private packResService: PackReservationService,
    private packInvoiceService: PackInvoiceService,

  ) {
    this.pwdForm = this.fb.group(
      {
        currentPassword: ['', Validators.required],
        newPassword: ['', Validators.required],
        confirmPassword: ['', Validators.required],
      },
      { validators: matchPasswords }
    );
  }

  ngOnInit(): void {
    this.auth.currentUser$.subscribe(u => (this.user = u));
    this.loadReservations();
  }

  async loadReservations() {
  this.loading = true;
  this.error = '';
  this.cdr.markForCheck();

  try {
    this.reservations = await this.reservationService.getMyReservations();
    this.destinationReservations = await this.destResService.getMyDestinationReservations();
    this.packReservations = await this.packResService.getMyPackReservations();
  } catch (e: any) {
    this.error = e?.error?.message || e?.message || 'Erreur chargement historique.';
  } finally {
    this.loading = false;
    this.cdr.detectChanges();
  }
}

  mealPlanLabel(plan: string) {
    switch (plan) {
      case 'ROOM_ONLY': return 'Chambre';
      case 'BB': return 'Petit-déjeuner';
      case 'HB': return 'Demi-pension';
      case 'FB': return 'Pension complète';
      case 'AI': return 'Tout compris';
      case 'UAI': return 'Ultra tout compris';
      default: return plan;
    }
  }

  // same InvoiceService PDF style
  async onDownload(r: ReservationRow) {
    this.downloadingId = r.id;
    this.cdr.markForCheck();

    try {
      await this.invoiceService.downloadInvoicePdf(r.id);
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.message || e?.message || 'Téléchargement échoué.');
    } finally {
      this.downloadingId = null;
      this.cdr.markForCheck();
    }
  }

  async onChangePassword() {
    this.pwdMsg = '';
    this.pwdForm.markAllAsTouched();
    this.cdr.markForCheck();

    if (this.pwdForm.invalid) {
      this.pwdMsgType = 'error';
      this.pwdMsg = this.pwdForm.errors?.['mismatch']
        ? 'Confirmation incorrecte.'
        : 'Remplir tous les champs.';
        this.cdr.detectChanges();
      return;
    }

    const currentPassword = (this.pwdForm.value.currentPassword || '').trim();
    const newPassword = (this.pwdForm.value.newPassword || '').trim();

    const token = localStorage.getItem('token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();

    try {
      await this.http.post(
  'http://localhost:9090/api/auth/change-password',
  { currentPassword, newPassword },
  { headers, responseType: 'text' }
).toPromise();

      this.pwdMsgType = 'success';
      this.pwdMsg = 'Mot de passe changé ✅';
      this.pwdForm.reset();
    } catch (e: any) {
  this.pwdMsgType = 'error';

  this.pwdMsg =
    typeof e?.error === 'string'
      ? e.error
      : (e?.error?.message || 'Erreur changement mot de passe.');
} finally {
    this.cdr.detectChanges();
  }
  }

  async onDownloadDestination(r: DestinationReservationRow) {
  try {
    await this.destInvoiceService.downloadDestinationInvoicePdf(r.id);
  } catch (e: any) {
    console.error(e);
    alert(e?.error?.message || e?.message || 'Téléchargement échoué (destination).');
  }
}

async onDownloadPack(r: PackReservationRow) {
  try {
    await this.packInvoiceService.downloadPackInvoicePdf(r.id);
  } catch (e: any) {
    console.error(e);
    alert(e?.message || 'Téléchargement échoué (pack).');
  }
}

}
