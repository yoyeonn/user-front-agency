import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ContactService {
  private BASE_URL = 'http://localhost:9090/api/contact';

  constructor(private http: HttpClient) {}

  sendMessage(payload: any): Observable<any> {
  return this.http.post(this.BASE_URL, payload, {
    headers: { 'Content-Type': 'application/json' }
  });
}
}
