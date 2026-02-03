import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HotelService } from '../../services/hotel.service';
import { CommonModule } from '@angular/common';
import { Hotel } from '../../models/hotel';
import { FormsModule } from '@angular/forms';

declare var $: any;

@Component({
  selector: 'app-hotel',
  imports: [RouterModule,CommonModule,FormsModule],
  templateUrl: './hotelList.html',
  styleUrl: './hotelList.css',
})
export class HotelList implements OnInit {
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

  hotels: Hotel[] = [];

  constructor(private hotelService: HotelService, private cd: ChangeDetectorRef) {}


  ngOnInit(): void {
    this.loadHotels();
    document.addEventListener('click', () => this.showSuggestions = false);
  }

  async loadHotels() {
  try {
    this.hotels = await this.hotelService.getHotels();
    setTimeout(() => {
      this.contentWayPoint();
      this.initOwlCarousel();
    });
    this.cd.detectChanges();
  } catch (err) {
    console.error('Failed to load hotels', err);
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
  return 'fa fa-check'; // default
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


observeCards() {
  const cards = document.querySelectorAll('.ftco-animate');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  cards.forEach(card => observer.observe(card));
}

searchKey: string = '';
async search() {
  try {
    this.hotels = await this.hotelService.getHotelsBySearch(this.searchKey);
    this.cd.detectChanges();
    this.observeCards();
  } catch (e) {
    console.error('Search failed', e);
  }
}


suggestions: string[] = [];
showSuggestions: boolean = false;
activeSuggestionIndex: number = -1;

async onInputChange() {
  const keyword = this.searchKey?.trim();

  if (!keyword) {
    this.suggestions = [];
    this.showSuggestions = false;
    await this.loadHotels();
    return;
  }

  try {
    this.suggestions = await this.hotelService.getHotelSuggestions(keyword);

    this.showSuggestions = this.suggestions.length > 0;
    this.activeSuggestionIndex = -1;
  } catch (e) {
    console.error('Failed to get suggestions', e);
  }
}

selectSuggestion(suggestion: string) {
  this.searchKey = suggestion;
  this.showSuggestions = false;
  this.search();
}

onKeyDown(event: KeyboardEvent) {
  if (!this.suggestions.length) return;

  if (event.key === 'ArrowDown') {
    this.activeSuggestionIndex = Math.min(this.activeSuggestionIndex + 1, this.suggestions.length - 1);
    event.preventDefault();
  } else if (event.key === 'ArrowUp') {
    this.activeSuggestionIndex = Math.max(this.activeSuggestionIndex - 1, 0);
    event.preventDefault();
  } else if (event.key === 'Enter') {
    if (this.activeSuggestionIndex >= 0) {
      this.selectSuggestion(this.suggestions[this.activeSuggestionIndex]);
      event.preventDefault();
    } else {
      this.search();
    }
  }
}

imageUrl(img: string | null | undefined): string {
  if (!img) return 'images/default.jpg';

  if (img.startsWith('http://') || img.startsWith('https://')) return img;

  return 'images/' + img;
}

}
