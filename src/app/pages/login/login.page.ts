import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// IMPORTANTE: Importar componentes específicos para Standalone
import { 
  IonContent, 
  IonItem, 
  IonInput, 
  IonButton, 
  IonIcon, 
  NavController, 
  ToastController, 
  LoadingController 
} from '@ionic/angular/standalone';

// Firebase Auth & Firestore
import { Auth, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';

// Iconos
import { addIcons } from 'ionicons';
import { personOutline, lockClosedOutline, logInOutline } from 'ionicons/icons';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  // Agregamos los componentes de Ionic uno por uno aquí
  imports: [
    CommonModule, 
    FormsModule, 
    IonContent, 
    IonItem, 
    IonInput, 
    IonButton, 
    IonIcon
  ]
})
export class LoginPage implements OnInit {
  numEmpleado: string = '';
  password: string = '';

  // Inyección de dependencias moderna
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private navCtrl = inject(NavController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  constructor() {
    // Registramos los iconos para que Ionic los reconozca
    addIcons({ personOutline, lockClosedOutline, logInOutline });
  }

  ngOnInit() {}

  async login() {
    // Validar campos vacíos
    if (!this.numEmpleado || !this.password) {
      this.presentToast('Por favor, ingresa tus credenciales', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Iniciando sesión...',
      spinner: 'crescent',
      mode: 'ios'
    });
    await loading.present();

    try {
      // Limpiar rastro de usuario previo
      await signOut(this.auth);

      // Crear correo ficticio basado en número de empleado
      const email = `${this.numEmpleado.trim()}@estudio.com`;
      await signInWithEmailAndPassword(this.auth, email, this.password);

      // Buscar datos extra (rol) en Firestore
      const usuariosRef = collection(this.firestore, 'usuarios');
      const q = query(usuariosRef, where("numEmpleado", "==", this.numEmpleado.trim()));
      const querySnapshot = await getDocs(q);

      await loading.dismiss();

      if (!querySnapshot.empty) {
        const rol = querySnapshot.docs[0].data()['rol'];
        // Navegar según el rol
        if (rol === 'admin') {
          this.navCtrl.navigateRoot('/admin-home');
        } else {
          this.navCtrl.navigateRoot('/tabs/home');
        }
      } else {
        // Si no hay documento en Firestore, mandarlo a home por defecto
        this.navCtrl.navigateRoot('/tabs/home');
      }

    } catch (error: any) {
      await loading.dismiss();
      console.error('Error de login:', error);
      this.presentToast('Número de empleado o contraseña incorrectos', 'danger');
    }
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      color: color as any,
      position: 'bottom'
    });
    await toast.present();
  }
}