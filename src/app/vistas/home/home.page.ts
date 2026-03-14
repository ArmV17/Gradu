import { Component, OnInit, inject } from '@angular/core';
import { IonicModule, Platform, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Firestore, collection, collectionData, doc, updateDoc } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import * as CryptoJS from 'crypto-js';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class HomePage implements OnInit {
  private firestore = inject(Firestore);
  private router = inject(Router);
  private platform = inject(Platform);
  private toastCtrl = inject(ToastController);
  private readonly secretKey = environment.cryptoKey;

  escuelas$!: Observable<any[]>;
  isPC: boolean = false;
  miNumeroEmpleado: string = '0001'; 

  ngOnInit() {
    // Detección estricta de dispositivo
    const ancho = window.innerWidth;
    this.isPC = (ancho > 768) && !this.platform.is('mobile');
    this.cargarEventos();
  }

  cargarEventos() {
    const ref = collection(this.firestore, 'medidas');
    this.escuelas$ = collectionData(ref, { idField: 'id' }).pipe(
      map((items: any[]) => {
        const datos = items.map(m => ({
          ...m,
          escuelaNombre: this.decrypt(m.escuela),
          numEmpleadoAsignado: m.numEmpleadoAsignado ? String(m.numEmpleadoAsignado).trim() : ''
        }));

        // Si es PC, ve todo. Si es celular, solo su ID asignado.
        if (this.isPC) return datos;
        return datos.filter(e => e.numEmpleadoAsignado === this.miNumeroEmpleado);
      }),
      // Evitar duplicados de escuela en el Home
      map(items => {
        return items.filter((v, i, a) => a.findIndex(t => t.escuelaNombre === v.escuelaNombre) === i);
      })
    );
  }

  async guardarCambiosLogistica(evento: any) {
    if (!this.isPC) return;
    try {
      const docRef = doc(this.firestore, `medidas/${evento.id}`);
      await updateDoc(docRef, {
        lugarEvento: evento.lugarEvento || '',
        numEmpleadoAsignado: String(evento.numEmpleadoAsignado).trim() 
      });
      this.presentToast('Logística actualizada', 'success');
    } catch (e) {
      this.presentToast('Error al guardar', 'danger');
    }
  }

  irAMedicion() {
    this.router.navigate(['/medicion']);
  }

  verDetalleEscuela(nombre: string) {
    this.router.navigate(['/detalle', { nombre: nombre }]);
  }

  private decrypt(text: string): string {
    if (!text) return '';
    try {
      const bytes = CryptoJS.AES.decrypt(text, this.secretKey);
      return bytes.toString(CryptoJS.enc.Utf8) || text;
    } catch (e) { return text; }
  }

  async presentToast(msg: string, color: string) {
    const t = await this.toastCtrl.create({ message: msg, duration: 2000, color });
    t.present();
  }
}