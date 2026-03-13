import { Component } from '@angular/core';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule],
})
export class HomePage {
  numEmpleado: string = '';
  password: string = '';

  constructor(
    private navCtrl: NavController,
    private toastController: ToastController
  ) {}

  async login() {
    // Validación básica
    if (this.numEmpleado === '123' && this.password === 'admin') {
      // Navegar a la siguiente pantalla (ej. lista de eventos)
      // this.navCtrl.navigateForward('/eventos'); 
      console.log('Acceso concedido');
    } else {
      const toast = await this.toastController.create({
        message: 'Credenciales incorrectas',
        duration: 2000,
        color: 'danger',
        position: 'bottom'
      });
      toast.present();
    }
  }
}