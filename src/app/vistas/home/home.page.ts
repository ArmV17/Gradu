import { Component, inject } from '@angular/core';
import { IonicModule, NavController, ToastController, LoadingController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// Importaciones de Firebase
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule],
})
export class HomePage {
  // Variables de formulario
  numEmpleado: string = '';
  password: string = '';

  // Inyección de servicios usando la nueva sintaxis 'inject' (más limpia para Standalone)
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private navCtrl = inject(NavController);
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
      spinner: 'crescent',
      cssClass: 'custom-loading' // Puedes darle estilo en global.scss
    });
    await loading.present();

    try {
      /**
       * 3. Intento de Login
       * Firebase requiere un email. Usaremos el formato: numero@estudio.com
       * Esto permite que tus empleados solo ingresen su número.
       */
      const email = `${this.numEmpleado.trim()}@estudio.com`;
      
      const userCredential = await signInWithEmailAndPassword(
        this.auth, 
        email, 
        this.password
      );

      const user = userCredential.user;

      /**
       * 4. (Opcional) Verificar datos extra en Firestore
       * Podrías tener una colección 'empleados' donde guardas su nombre real o puesto.
       */
      const userDoc = await getDoc(doc(this.firestore, `empleados/${user.uid}`));
      
      if (userDoc.exists()) {
        console.log('Datos del empleado:', userDoc.data());
      }

      // 5. Navegación al éxito
      await loading.dismiss();
      this.navCtrl.navigateForward('/eventos'); // Asegúrate de tener esta ruta creada

    } catch (error: any) {
      await loading.dismiss();
      console.error('Error de login:', error);

      // Manejo de errores específicos de Firebase
      let mensaje = 'Error al iniciar sesión';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        mensaje = 'Número de empleado o contraseña incorrectos';
      } else if (error.code === 'auth/network-request-failed') {
        mensaje = 'Sin conexión a internet';
      }

      this.presentToast(mensaje, 'danger');
    }
  }

  // Función auxiliar para mensajes rápidos
  async presentToast(message: string, color: 'danger' | 'success' | 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
      buttons: [{ text: 'OK', role: 'cancel' }]
    });
    await toast.present();
  }
}