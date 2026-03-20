import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// Registro de componentes específicos para evitar pantalla blanca
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, 
  IonInput, IonButton, IonIcon, IonLabel, IonButtons, IonBackButton,
  IonSelect, IonSelectOption, IonSegment, IonSegmentButton,
  ToastController, LoadingController, NavController 
} from '@ionic/angular/standalone';

// Firebase
import { Auth, createUserWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';

// Iconos e Interfaz
import { addIcons } from 'ionicons';
import { 
  personAddOutline, keyOutline, idCardOutline, 
  personOutline, calendarOutline, logOutOutline,
  shieldCheckmarkOutline, schoolOutline 
} from 'ionicons/icons';

// Cifrado
import * as CryptoJS from 'crypto-js';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-usuarios',
  templateUrl: './admin-usuarios.page.html',
  styleUrls: ['./admin-usuarios.page.scss'],
  standalone: true,
  // IMPORTANTE: Lista completa de componentes para el HTML
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, 
    IonInput, IonButton, IonIcon, IonLabel, IonButtons, IonBackButton,
    IonSelect, IonSelectOption, IonSegment, IonSegmentButton
  ]
})
export class AdminUsuariosPage {
  // Variables del formulario
  numEmpleado: string = '';
  password: string = '';
  nombreEmpleado: string = ''; 
  rolSeleccionado: string = 'empleado'; 

  public navCtrl = inject(NavController);
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  private readonly secretKey = environment.cryptoKey;

  constructor() {
    addIcons({ 
      personAddOutline, keyOutline, idCardOutline, 
      personOutline, calendarOutline, logOutOutline,
      shieldCheckmarkOutline, schoolOutline 
    });
  }

  async registrarEmpleado() {
    if (!this.numEmpleado || !this.password || !this.nombreEmpleado || !this.rolSeleccionado) {
      this.presentToast('Por favor, completa todos los campos', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({ 
      message: 'Cifrando y registrando...', 
      spinner: 'crescent',
      mode: 'ios'
    });
    await loading.present();

    try {
      // 1. Cifrar nombre con la llave de Gradu
      const nombreCifrado = CryptoJS.AES.encrypt(this.nombreEmpleado.trim().toUpperCase(), this.secretKey).toString();
      const email = `${this.numEmpleado.trim()}@estudio.com`;

      // 2. Crear en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, this.password);
      const uid = userCredential.user.uid;

      // 3. Guardar perfil en Firestore
      await setDoc(doc(this.firestore, `usuarios/${uid}`), {
        numEmpleado: this.numEmpleado.trim(),
        nombre: nombreCifrado,
        rol: this.rolSeleccionado,
        fechaRegistro: new Date().getTime()
      });

      await loading.dismiss();
      this.presentToast(`Usuario registrado como ${this.rolSeleccionado.toUpperCase()}`, 'success');
      
      // Limpiar campos
      this.numEmpleado = ''; 
      this.password = ''; 
      this.nombreEmpleado = '';
      this.rolSeleccionado = 'empleado';

    } catch (error: any) {
      await loading.dismiss();
      let msg = 'Error en el servidor de Firebase';
      if (error.code === 'auth/email-already-in-use') msg = 'Este número de empleado ya existe';
      if (error.code === 'auth/weak-password') msg = 'La contraseña debe ser de al menos 6 caracteres';
      this.presentToast(msg, 'danger');
    }
  }

  async logout() {
    await signOut(this.auth);
    this.navCtrl.navigateRoot('/login');
  }

  async presentToast(msg: string, color: string) {
    const t = await this.toastCtrl.create({ 
      message: msg, 
      color: color as any, 
      duration: 3000, 
      mode: 'ios',
      position: 'bottom'
    });
    await t.present();
  }
}