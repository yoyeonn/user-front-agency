import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterModule, CommonModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword implements OnInit {
token = '';
  newPassword = '';
  confirmPassword = '';
  message = '';
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.message = 'Token manquant. Veuillez utiliser le lien reçu.';
      this.cd.detectChanges();
    }
  }

  submit() {
    this.message = '';

    if (!this.token) {
      this.message = 'Token manquant.';
      this.cd.detectChanges();
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.message = 'Les mots de passe ne correspondent pas.';
      this.cd.detectChanges();
      return;
    }

    this.loading = true;
    this.cd.detectChanges();

    this.auth.resetPassword(this.token, this.newPassword).subscribe({
      next: (res) => {
        this.loading = false;
        this.message = res || 'Mot de passe réinitialisé.';

        this.cd.detectChanges();

        setTimeout(() => this.router.navigate(['/login']), 800);
      },
      error: (err) => {
        this.loading = false;
        this.message = err?.error || 'An error occurred';
        this.cd.detectChanges();
      },
    });
  }
}
