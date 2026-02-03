import { RouterModule, Routes } from '@angular/router';
import { Home } from './components/home/home';
import { About } from './components/about/about';
import { Destination } from './components/destination/destination';
import { HotelList } from './components/hotel/hotelList';
import { Contact } from './components/contact/contact';
import { HotelDetail } from './components/hotel-detail/hotel-detail';
import { RouteReuseStrategy, ActivatedRouteSnapshot } from '@angular/router';
import { DestinationDetail } from './components/destination-detail/destination-detail';
import { Packs } from './components/packs/packs';
import { PacksDetail } from './components/packs-detail/packs-detail';
import { Signup } from './components/signup/signup';
import { Login } from './components/login/login';
import { Profil } from './components/profil/profil';
import { AuthGuard } from './services/auth-guard';
import { ForgotPassword } from './components/forgot-password/forgot-password';
import { ResetPassword } from './components/reset-password/reset-password';

export const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'home', component: Home },
    { path: 'about', component: About },
    { path: 'destination/:id', component: DestinationDetail },
    { path: 'destination', component: Destination },
    { path: 'hotel/:id', component: HotelDetail },
    { path: 'hotel', component: HotelList },
    { path: 'packs/:id', component: PacksDetail },
    { path: 'packs', component: Packs },
    { path: 'contact', component: Contact },
    { path: 'signup', component: Signup },
    { path: 'login', component: Login },
    { path: 'profil', component: Profil, canActivate: [AuthGuard] },
    { path: 'forgot-password', component: ForgotPassword },
    { path: 'reset-password', component: ResetPassword },

];


export class CustomReuseStrategy implements RouteReuseStrategy {
  shouldDetach(route: ActivatedRouteSnapshot): boolean { return false; }
  store(route: ActivatedRouteSnapshot, handle: any): void {}
  shouldAttach(route: ActivatedRouteSnapshot): boolean { return false; }
  retrieve(route: ActivatedRouteSnapshot): any { return null; }
  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === curr.routeConfig && JSON.stringify(future.params) === JSON.stringify(curr.params);
  }
}

