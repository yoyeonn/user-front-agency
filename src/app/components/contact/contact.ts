import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ContactService } from '../../services/contact.service';

declare var $: any;

@Component({
  selector: 'app-contact',
  imports: [RouterModule,FormsModule,ReactiveFormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact {
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

   loading = false;
  successMsg = '';
  errorMsg = '';
  form!: FormGroup;
 

  constructor(
    private fb: FormBuilder,
    private contactService: ContactService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', [Validators.required, Validators.minLength(3)]],
      message: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  submit() {
  this.successMsg = '';
  this.errorMsg = '';
    console.log('Form Data:', this.form.value);
  if (this.form.invalid) {
    Object.entries(this.form.controls).forEach(([key, control]) => {
    console.log(key, control.value, control.errors);
  });
    this.form.markAllAsTouched();
    return;
  }

  this.loading = true;

  this.contactService.sendMessage(this.form.value).subscribe({
    next: (res: any) => {
      this.successMsg = res?.message || 'Votre message a été envoyé avec succès ✅';
      this.form.reset();
      this.loading = false;

      // force UI refresh
      this.cdr.detectChanges();
    },
    error: (err: HttpErrorResponse) => {
      console.error(err);
      this.errorMsg = err?.error?.message || "Échec de l'envoi. Réessayez plus tard ❌";
      this.loading = false;

      // force UI refresh
      this.cdr.detectChanges();
    }
  });
}


  // helper for template
  hasError(controlName: string, error: string) {
    const c = this.form.get(controlName);
    return !!(c && c.touched && c.hasError(error));
  }
}
