import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonItem, IonInput, IonButton, IonIcon, 
  NavController, ToastController, LoadingController 
} from '@ionic/angular/standalone';

// Firebase Auth & Firestore
import { 
  Auth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged
} from '@angular/fire/auth';
import { 
  Firestore, 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc,
  doc 
} from '@angular/fire/firestore';

import { addIcons } from 'ionicons';
import { personOutline, lockClosedOutline, logInOutline } from 'ionicons/icons';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonItem, IonInput, IonButton, IonIcon
  ]
})
export class LoginPage implements OnInit {
  numEmpleado: string = '';
  password: string = '';

  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private navCtrl = inject(NavController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  constructor() {
    addIcons({ personOutline, lockClosedOutline, logInOutline });
  }

  ngOnInit() {
    // --- ESTA ES LA MAGIA DE LA PERSISTENCIA ---
    // Escucha si ya hay un usuario logueado en el teléfono
    onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(this.firestore, `usuarios/${user.uid}`));
          
          if (userDoc.exists()) {
            const rol = userDoc.data()['rol'];
            if (rol === 'admin') {
              this.navCtrl.navigateRoot('/admin-home');
            } else {
              this.navCtrl.navigateRoot('/tabs/home');
            }
          } else {
            this.navCtrl.navigateRoot('/tabs/home');
          }
        } catch (e) {
          // (Firebase entrará en modo offline automáticamente)
          this.navCtrl.navigateRoot('/tabs/home');
        }
      }
    });
  }

  async login() {
    if (!this.numEmpleado || !this.password) {
      this.presentToast('Por favor, ingresa tus credenciales', 'warning');
      return;
    }

    // BLOQUEO: Si no hay internet y no hay sesión previa, no podemos loguear de cero
    if (!navigator.onLine) {
      this.presentToast('No hay internet. Debes haber iniciado sesión previamente para trabajar offline.', 'danger');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Iniciando sesión...',
      spinner: 'crescent',
      mode: 'ios'
    });
    await loading.present();

    try {
      const email = `${this.numEmpleado.trim()}@estudio.com`;
      const userCredential = await signInWithEmailAndPassword(this.auth, email, this.password);
      
      // Una vez logueado, buscamos el rol
      const usuariosRef = collection(this.firestore, 'usuarios');
      const q = query(usuariosRef, where("numEmpleado", "==", this.numEmpleado.trim()));
      const querySnapshot = await getDocs(q);

      await loading.dismiss();

      if (!querySnapshot.empty) {
        const rol = querySnapshot.docs[0].data()['rol'];
        if (rol === 'admin') {
          this.navCtrl.navigateRoot('/admin-home');
        } else {
          this.navCtrl.navigateRoot('/tabs/home');
        }
      } else {
        this.navCtrl.navigateRoot('/tabs/home');
      }

    } catch (error: any) {
      await loading.dismiss();
      this.presentToast('Error al ingresar. Revisa tu conexión o datos.', 'danger');
    }
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color: color as any,
      position: 'bottom'
    });
    await toast.present();
  }
}