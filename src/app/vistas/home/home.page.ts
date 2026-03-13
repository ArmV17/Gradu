import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class HomePage {

  private router = inject(Router);
  private auth = inject(Auth);

  constructor() { }

  // Función genérica para navegar a cualquier vista
  navegar(ruta: string) {
    this.router.navigate([`/${ruta}`]);
  }

  // Cerrar sesión
  async salir() {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }

}