import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private BASE_URL = 'http://localhost:9090/api/auth';

  private isLoggedInSubject = new BehaviorSubject<boolean>(!!localStorage.getItem('token'));
  isLoggedIn$ = this.isLoggedInSubject.asObservable();

  private currentUserSubject = new BehaviorSubject<any>(
    JSON.parse(localStorage.getItem('user') || 'null')
  );
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  signup(data: SignupRequest): Observable<string> {
  return this.http.post(`${this.BASE_URL}/signup`, data, {
    responseType: 'text'
  });
  }

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.BASE_URL}/login`, data);
  }

  getMe(): Observable<any> {
    return this.http.get(`${this.BASE_URL}/me`);
  }

  setSession(token: string, user: any) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.isLoggedInSubject.next(true);
    this.currentUserSubject.next(user);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.isLoggedInSubject.next(false);
    this.currentUserSubject.next(null);
  }

  forgotPassword(email: string) {
  return this.http.post(`${this.BASE_URL}/forgot-password`, { email }, { responseType: 'text' });
}

resetPassword(token: string, newPassword: string) {
  return this.http.post(`${this.BASE_URL}/reset-password`, { token, newPassword }, { responseType: 'text' });
}

}
