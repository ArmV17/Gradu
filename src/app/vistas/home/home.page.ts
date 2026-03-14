import { Component, OnInit, inject } from '@angular/core';
import { IonicModule, Platform, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Firebase
import { 
  Firestore, 
  collection, 
  collectionData, 
  doc, 
  updateDoc 
} from '@angular/fire/firestore';

// Utilidades
import { Observable, map } from 'rxjs';
import * as CryptoJS from 'crypto-js';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  // IMPORTANTE: Estos imports resuelven los errores de ion-header, *ngIf y ngModel
  imports: [IonicModule, CommonModule, FormsModule]
})
export class HomePage implements OnInit {
  // Inyecciones de dependencias
  private firestore = inject(Firestore);
  private router = inject(Router);
  private platform = inject(Platform);
  private toastCtrl = inject(ToastController);
  
  private readonly secretKey = environment.cryptoKey;

  // Variables de control de vista
  escuelas$!: Observable<any[]>;
  isPC: boolean = false;
  
  // ID que se usará para filtrar en el celular
  miNumeroEmpleado: string = '0001'; 

  constructor() {}

  ngOnInit() {
    // Determinamos si es PC basado en plataforma o ancho de ventana
    this.isPC = this.platform.is('desktop') || window.innerWidth > 768;
    this.cargarEventos();
  }

  /**
   * Carga los eventos de Firestore, los descifra y aplica el filtro por empleado
   */
  cargarEventos() {
    const medicionesRef = collection(this.firestore, 'medidas');
    
    // Obtenemos los datos incluyendo el ID del documento para poder editar
    this.escuelas$ = collectionData(medicionesRef, { idField: 'id' }).pipe(
      map((items: any[]) => {
        // 1. Desciframos los nombres y normalizamos los campos de texto
        const datosDescifrados = items.map(m => ({
          ...m,
          escuelaNombre: this.decrypt(m.escuela),
          lugarEvento: m.lugarEvento || '',
          fechaEvento: m.fechaEvento || '',
          horaEvento: m.horaEvento || '',
          direccionLugar: m.direccionLugar || '',
          numEmpleadoAsignado: m.numEmpleadoAsignado ? String(m.numEmpleadoAsignado).trim() : ''
        }));

        // 2. Agrupamos para mostrar solo una tarjeta por escuela en el Home
        const unicas = datosDescifrados.reduce((acc: any[], current) => {
          const existe = acc.find(item => item.escuelaNombre === current.escuelaNombre);
          if (!existe) {
            // Si es celular, solo agregamos si el empleado coincide
            if (!this.isPC) {
              if (current.numEmpleadoAsignado === this.miNumeroEmpleado) {
                acc.push(current);
              }
            } else {
              acc.push(current); // En PC van todas
            }
          }
          return acc;
        }, []);

        return unicas;
      })
    );
  }

  /**
   * Guarda los cambios de logística realizados en la PC
   */
  async guardarCambiosLogistica(evento: any) {
    if (!this.isPC) return;

    try {
      const docRef = doc(this.firestore, `medidas/${evento.id}`);
      await updateDoc(docRef, {
        lugarEvento: evento.lugarEvento || '',
        fechaEvento: evento.fechaEvento || '',
        horaEvento: evento.horaEvento || '',
        direccionLugar: evento.direccionLugar || '',
        numEmpleadoAsignado: String(evento.numEmpleadoAsignado).trim()
      });
      
      this.presentToast(`Logística de ${evento.escuelaNombre} actualizada`, 'success');
    } catch (error) {
      console.error(error);
      this.presentToast('Error al actualizar datos', 'danger');
    }
  }

  // --- Navegación ---

  irAMedicion() {
    this.router.navigate(['/medicion']);
  }

  verDetalleEscuela(nombre: string) {
    this.router.navigate(['/detalle', { nombre: nombre }]);
  }

  // --- Herramientas auxiliares ---

  private decrypt(ciphertext: string): string {
    if (!ciphertext) return '';
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, this.secretKey);
      return bytes.toString(CryptoJS.enc.Utf8) || ciphertext;
    } catch (e) {
      return ciphertext;
    }
  }

  async presentToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2000,
      color: color
    });
    toast.present();
  }
}