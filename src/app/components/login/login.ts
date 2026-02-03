import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

declare var $: any;


@Component({
  selector: 'app-login',
  imports: [FormsModule,CommonModule,RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
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
email = '';
password = '';
message = '';

constructor(private authService: AuthService, private router: Router, private route: ActivatedRoute, private cd: ChangeDetectorRef) {}
ngOnInit() {
  if (this.authService.isLoggedIn()) {
    //par example: /hotel/5
      const returnUrl =
        this.route.snapshot.queryParamMap.get('returnUrl') ||
        sessionStorage.getItem('returnUrl') ||
        '/home'; 

      sessionStorage.removeItem('returnUrl');
      this.router.navigateByUrl(returnUrl);
    }
}

login() {
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (data) => {
        this.authService.setSession(data.token, {
          name: data.name,
          email: data.email,
          role: data.role
        });

        this.message = 'Login successful!';
        this.cd.detectChanges();

        const returnUrl =
          this.route.snapshot.queryParamMap.get('returnUrl') ||
          sessionStorage.getItem('returnUrl') ||
          '/home';

        sessionStorage.removeItem('returnUrl');
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.message = err?.error || 'An error occurred';
        this.cd.detectChanges();
      }
    });
  }
}
