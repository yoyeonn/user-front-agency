import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type ReservationRow = {
  id: number;
  createdAt: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  amount: number;
  mealPlan: string;
  roomNames: string;
};

@Injectable({
  providedIn: 'root',
})
export class ReservationService {
  private RES_URL = 'http://localhost:9090/api/reservations';

  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  async getMyReservations(): Promise<ReservationRow[]> {
    return await firstValueFrom(
      this.http.get<ReservationRow[]>(`${this.RES_URL}/me`, {
        headers: this.authHeaders(),
      })
    );
  }

  async getInvoiceJson(reservationId: number): Promise<any> {
    return await firstValueFrom(
      this.http.get<any>(`${this.RES_URL}/${reservationId}/invoice`, {
        headers: this.authHeaders(),
      })
    );
  }

  async downloadInvoicePdf(reservationId: number): Promise<Blob> {
    return await firstValueFrom(
      this.http.get(`${this.RES_URL}/${reservationId}/invoice.pdf`, {
        headers: this.authHeaders(),
        responseType: 'blob',
      })
    );
  }
}
