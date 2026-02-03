import { Injectable } from '@angular/core';
import axios from 'axios';
import { Hotel } from '../models/hotel';

@Injectable({
  providedIn: 'root',
})
export class HotelService {
 private BASE_URL = 'http://localhost:9090/api/hotels';
 private RES_URL = 'http://localhost:9090/api/reservations';

  constructor() {}

  async getHotels(): Promise<Hotel[]> {
    try {
      const response = await axios.get(`${this.BASE_URL}`);
      return response.data.data as Hotel[];
    } catch (error: any) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async getHotelById(id: number): Promise<Hotel> {
    try {
      const response = await axios.get(`${this.BASE_URL}/${id}`);
      return response.data.data as Hotel;
    } catch (error: any) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async getHotelsBySearch(keyword: string): Promise<Hotel[]> {
  try {
    const response = await axios.get(`${this.BASE_URL}/search?keyword=${keyword}`);
    return response.data.data as Hotel[];
  } catch (error: any) {
    console.error('API Error:', error);
    throw error;
  }
  }

  async getHotelSuggestions(keyword: string): Promise<string[]> {
  try {
    const response = await axios.get(`${this.BASE_URL}/suggestions?keyword=${keyword}`);
    return response.data as string[];
  } catch (error: any) {
    console.error('API Error:', error);
    return [];
  }
  }

  async reserveHotel(payload: any): Promise<any> {
  const token = localStorage.getItem('token');

  const res = await axios.post(
    'http://localhost:9090/api/reservations',
    payload,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
    }
  );

  const raw = res.data;
  const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;

  console.log("RESERVE OBJ =", obj);
  console.log("RESERVE ID =", obj?.id);

  return obj;
}





}

