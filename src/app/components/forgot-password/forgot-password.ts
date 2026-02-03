import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterModule, CommonModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  email = '';
  message = '';
  resetLink = '';
  loading = false;

  constructor(private auth: AuthService, private cd: ChangeDetectorRef) {}

  submit() {
    this.message = '';
    this.resetLink = '';
    this.loading = true;
    this.cd.detectChanges();

    this.auth.forgotPassword(this.email).subscribe({
      next: () => {
  this.loading = false;
  this.message = 'Un email de réinitialisation a été envoyé.';
  this.resetLink = ''
  this.cd.detectChanges();
},
      error: (err) => {
        this.loading = false;
        this.message = err?.error || 'An error occurred';
        this.cd.detectChanges();
      },
    });
  }
}
