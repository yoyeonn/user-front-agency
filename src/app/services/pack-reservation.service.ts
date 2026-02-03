import { Injectable } from '@angular/core';
import axios from 'axios';

export type PackReservationRow = {
  id: number;
  createdAt: string;

  packName: string;
  location: string;
  hotelName?: string;
  destinationName?: string;

  checkIn: string;
  checkOut: string;

  adults: number;
  children: number;
  amount: number;
};

@Injectable({ 
  providedIn: 'root' 
})
export class PackReservationService {
  private BASE = 'http://localhost:9090/api/pack-reservations';

  private authHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async reservePack(payload: any) {
    const res = await axios.post(this.BASE, payload, { headers: this.authHeaders() });
    return res.data;
  }

  async getMyPackReservations(): Promise<PackReservationRow[]> {
    const res = await axios.get(`${this.BASE}/me`, { headers: this.authHeaders() });
    return res.data.data ?? [];
  }

  async getInvoiceJson(id: number) {
    const res = await axios.get(`${this.BASE}/${id}/invoice`, { headers: this.authHeaders() });
    return res.data;
  }
}
