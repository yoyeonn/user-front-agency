import { ChangeDetectorRef, Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

declare var $: any;

@Component({
  selector: 'app-signup',
  imports: [FormsModule,RouterModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class Signup {
  ngAfterViewInit(): void {
    this.contentWayPoint();
    this.initOwlCarousel();

    this.cd.detectChanges();
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
            this.cd.detectChanges();
          }, 100);
        }
      }, { offset: '95%' });
    });
    
    setTimeout(() => {
      $(window).trigger('resize').trigger('scroll');
      this.cd.detectChanges();
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
    this.cd.detectChanges();
  }
name = '';
email = '';
password = '';
message = '';

constructor(private authService: AuthService, private router: Router, private cd: ChangeDetectorRef) {}

signup() {
  this.authService.signup({
    name: this.name,
    email: this.email,
    password: this.password
  }).subscribe({
    next: (res) => {
      this.message = res;
      this.cd.detectChanges();
      this.router.navigate(['/login']);
    },
    error: (err) => {
      this.message = err?.error || 'An error occurred';
      this.cd.detectChanges();
    }
  });
}

}
