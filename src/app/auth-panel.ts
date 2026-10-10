import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-auth-panel',
  standalone: true,
  templateUrl: './auth-panel.html',
  styleUrl: './auth-panel.scss'
})
export class AuthPanelComponent {
  @Input() mode: 'login' | 'register' = 'login';
  @Input() loading = false;
  @Input() error = '';
  @Output() modeChange = new EventEmitter<'login' | 'register'>();
  @Output() submitForm = new EventEmitter<Event>();
}
