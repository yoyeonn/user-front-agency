import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type DestinationReservationRow = {
  id: number;
  createdAt: string;
  destinationName: string;
  country: string;
  location: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  amount: number;
};

@Injectable({ 
  providedIn: 'root'
})
export class DestinationReservationService {
  private RES_URL = 'http://localhost:9090/api/destination-reservations';

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders | undefined {
    const token = localStorage.getItem('token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
  }

  async getMyDestinationReservations(): Promise<DestinationReservationRow[]> {
    return await firstValueFrom(
      this.http.get<DestinationReservationRow[]>(`${this.RES_URL}/me`, { headers: this.headers() })
    );
  }

  async getInvoiceJson(id: number): Promise<any> {
    return await firstValueFrom(
      this.http.get<any>(`${this.RES_URL}/${id}/invoice`, { headers: this.headers() })
    );
  }
}
