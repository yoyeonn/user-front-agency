import { Component, AfterViewInit, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { Destinations } from '../../models/destinations';
import { DestinationService } from '../../services/destination.service';
import { CommonModule } from '@angular/common';
declare var $: any;

@Component({
  selector: 'app-home',
  imports: [RouterModule,CommonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class Home implements AfterViewInit,OnInit {

  ngAfterViewInit(): void {
    this.contentWayPoint();
    this.initOwlCarousel();
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

    // Trigger reflow to fix initial layout
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

  destinations: Destinations[] = [];
  loading = false;

  constructor(private destinationService: DestinationService,private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.fetchDestinations();
    this.cd.detectChanges();
  }

  fetchDestinations() {
    this.loading = true;
    this.destinationService.getdestinations().subscribe({
      next: (data) => {
        this.destinations = data ?? [];
        this.loading = false;
        setTimeout(() => {
        this.contentWayPoint();
        this.initOwlCarousel();
      });
      this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load destinations', err);
        this.loading = false;
      },
    });
  }

  // Use the first image from DB, otherwise fallback
  coverImage(d: Destinations): string {
    const img = d?.images?.length ? d.images[0] : 'assets/images/destination-placeholder.jpg';
    return img;
  }

  trackById(_index: number, item: Destinations) {
    return item.id;
  }
}
