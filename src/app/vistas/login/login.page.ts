import { Component, inject } from '@angular/core';
import { IonicModule, NavController, ToastController, LoadingController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router'; // IMPORTANTE: Agregar esto

// Importaciones de Firebase
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class LoginPage {
  // Variables de formulario
  numEmpleado: string = '';
  password: string = '';

  // Inyección de servicios
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router); // Usamos router para navegar
  private toastController = inject(ToastController);
  private loadingController = inject(LoadingController);

  constructor() {}

  async login() {
    // 1. Validación de campos vacíos
    if (!this.numEmpleado || !this.password) {
      this.presentToast('Por favor, completa todos los campos', 'warning');
      return;
    }

    // 2. Mostrar indicador de carga
    const loading = await this.loadingController.create({
      message: 'Verificando credenciales...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // 3. Intento de Login (Formato: numero@estudio.com)
      const email = `${this.numEmpleado.trim()}@estudio.com`;
      
      const userCredential = await signInWithEmailAndPassword(
        this.auth, 
        email, 
        this.password
      );

      // 4. Éxito: Navegación al HOME
      await loading.dismiss();
      this.router.navigate(['/home']); // CAMBIADO: Ahora va a /home

    } catch (error: any) {
      await loading.dismiss();
      console.error('Error de login:', error);

      let mensaje = 'Error al iniciar sesión';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        mensaje = 'Número de empleado o contraseña incorrectos';
      } else if (error.code === 'auth/network-request-failed') {
        mensaje = 'Sin conexión a internet';
      }

      this.presentToast(mensaje, 'danger');
    }
  }

  async presentToast(message: string, color: 'danger' | 'success' | 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}