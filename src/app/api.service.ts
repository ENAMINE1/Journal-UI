import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

export type AccessType = 'PRIVATE' | 'PUBLIC';

export interface JournalResponse {
  id: string;
  userId: string;
  title: string;
  content: string;
  accessType: AccessType;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://escape-around-amanda-costumes.trycloudflare.com';

  login(username: string, password: string): Observable<{ accessToken: string }> {
    return this.http.post<{ accessToken: string }>(`${this.baseUrl}/api/auth/login`, { username, password }).pipe(catchError(this.handleError));
  }

  register(username: string, email: string, password: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/api/auth/register`, { username, email, password }).pipe(catchError(this.handleError));
  }

  getJournals(): Observable<JournalResponse[]> {
    return this.authenticatedRequest<JournalResponse[]>('GET', '/api/journals');
  }

  createJournal(title: string, content: string, accessType: AccessType): Observable<JournalResponse> {
    return this.authenticatedRequest<JournalResponse>('POST', '/api/journals', { title, content, accessType });
  }

  updateJournal(id: string, title: string, content: string, accessType: AccessType): Observable<JournalResponse> {
    return this.authenticatedRequest<JournalResponse>('PUT', `/api/journals/${id}`, { title, content, accessType });
  }

  deleteJournal(id: string): Observable<void> {
    return this.authenticatedRequest<void>('DELETE', `/api/journals/${id}`);
  }

  private authenticatedRequest<T>(method: string, path: string, body?: object): Observable<T> {
    const token = localStorage.getItem('field-notes-token');
    return this.http.request<T>(method, `${this.baseUrl}${path}`, {
      body,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    }).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    const message = error.status === 0
      ? 'The API is unavailable. Start Spring Boot on port 8081.'
      : error.error?.message || error.error?.error || 'The request could not be completed.';
    return throwError(() => new Error(message));
  }
}
