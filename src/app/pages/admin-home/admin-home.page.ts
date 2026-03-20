import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonButton, 
  IonIcon, 
  IonLabel, 
  IonButtons, 
  IonSegment,
  IonSegmentButton,
  IonInput,
  IonItem,
  NavController, 
  ToastController 
} from '@ionic/angular/standalone';

import { Firestore, collection, collectionData, doc, updateDoc } from '@angular/fire/firestore';
import { Auth, signOut } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as CryptoJS from 'crypto-js';
import { environment } from 'src/environments/environment';

import { addIcons } from 'ionicons';
import { 
  saveOutline, locationOutline, calendarOutline, 
  timeOutline, personOutline, peopleOutline, logOutOutline,
  businessOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-admin-home',
  templateUrl: './admin-home.page.html',
  styleUrls: ['./admin-home.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar, 
    IonButton, 
    IonIcon, 
    IonLabel, 
    IonButtons,
    IonSegment,
    IonSegmentButton,
    IonInput,
    IonItem
  ]
})
export class AdminHomePage implements OnInit {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  public navCtrl = inject(NavController);
  private toastCtrl = inject(ToastController);
  private readonly secretKey = environment.cryptoKey;
  public eventos$!: Observable<any[]>;

  constructor() {
    addIcons({ 
      saveOutline, locationOutline, calendarOutline, 
      timeOutline, personOutline, peopleOutline, logOutOutline,
      businessOutline 
    });
  }

  ngOnInit() {
    const ref = collection(this.firestore, 'medidas');
    this.eventos$ = collectionData(ref, { idField: 'id' }).pipe(
      map(alumnos => {
        const gruposMap: any = {};
        alumnos.forEach((a: any) => {
          const escuela = this.decrypt(a['escuela']);
          const key = `${escuela}-${a.grado}-${a.turno}`;
          if (!gruposMap[key]) {
            gruposMap[key] = {
              escuela, grado: a.grado, turno: a.turno,
              lugar: this.decrypt(a.lugar || ''),
              fechaEvento: a.fechaEvento || '',
              horaEvento: a.horaEvento || '',
              asignadoA: a.asignadoA || '',
              ids: []
            };
          }
          gruposMap[key].ids.push(a.id);
        });
        return Object.values(gruposMap);
      })
    );
  }

  async guardar(g: any) {
    try {
      const lugarCifrado = CryptoJS.AES.encrypt(g.lugar || '', this.secretKey).toString();
      const promesas = g.ids.map((id: string) => 
        updateDoc(doc(this.firestore, `medidas/${id}`), {
          lugar: lugarCifrado,
          fechaEvento: g.fechaEvento || '',
          horaEvento: g.horaEvento || '',
          asignadoA: g.asignadoA || ''
        })
      );
      await Promise.all(promesas);
      this.presentToast('Grupo actualizado', 'success');
    } catch (e) { this.presentToast('Error al guardar', 'danger'); }
  }

  async logout() {
    await signOut(this.auth);
    this.navCtrl.navigateRoot('/login');
  }

  private decrypt(txt: string) {
    if (!txt) return '';
    try { return CryptoJS.AES.decrypt(txt, this.secretKey).toString(CryptoJS.enc.Utf8) || txt; }
    catch { return txt; }
  }

  async presentToast(m: string, c: string) {
    const t = await this.toastCtrl.create({ message: m, color: c as any, duration: 2000 });
    t.present();
  }
}