import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// IMPORTANTE: Componentes específicos para Standalone
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, 
  IonLabel, IonButton, IonIcon, IonSearchbar, IonButtons, 
  IonBackButton, IonAccordion, IonAccordionGroup, IonBadge,
  AlertController 
} from '@ionic/angular/standalone';

import { Firestore, collection, collectionData, doc, updateDoc, addDoc } from '@angular/fire/firestore';
import { Auth, authState } from '@angular/fire/auth';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import * as CryptoJS from 'crypto-js';
import { environment } from 'src/environments/environment';
import { addIcons } from 'ionicons';
import { 
  businessOutline, personAddOutline, checkmarkCircle, 
  ellipseOutline, searchOutline, timeOutline, 
  schoolOutline, chatbubbleEllipsesOutline 
} from 'ionicons/icons';

@Component({
  selector: 'app-entrega',
  templateUrl: './entrega.page.html',
  styleUrls: ['./entrega.page.scss'],
  standalone: true,
  // Lista de componentes registrados para el HTML
  imports: [
    CommonModule, 
    FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, 
    IonLabel, IonButton, IonIcon, IonSearchbar, IonButtons, 
    IonBackButton, IonAccordion, IonAccordionGroup, IonBadge
  ]
})
export class EntregaPage implements OnInit {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private alertCtrl = inject(AlertController);
  private readonly secretKey = environment.cryptoKey;
  
  public grupos$!: Observable<any[]>;

  constructor() {
    addIcons({ 
      businessOutline, personAddOutline, checkmarkCircle, 
      ellipseOutline, searchOutline, timeOutline, 
      schoolOutline, chatbubbleEllipsesOutline 
    });
  }

  ngOnInit() {
    this.grupos$ = authState(this.auth).pipe(
      switchMap(user => {
        if (!user) return of([]);
        const numLogueado = user.email?.split('@')[0].trim() || '';
        
        const ref = collection(this.firestore, 'medidas');
        return collectionData(ref, { idField: 'id' }).pipe(
          map(alumnos => {
            const filtrados = alumnos.filter((a: any) => 
              String(a['asignadoA'] || '').trim() === numLogueado
            );

            const descifrados = filtrados.map((a: any) => ({
              ...a,
              nombreCompleto: this.decrypt(a['nombreCompleto']),
              escuela: this.decrypt(a['escuela']),
              profesor: this.decrypt(a['profesor'] || 'Sin asignar'),
              turno: a['turno'] || 'Único',
              grado: a['grado'] || 'S/N',
              entregado: a['entregado'] || false
            }));

            const gruposMap: any = {};
            descifrados.forEach(a => {
              const key = `${a.escuela}-${a.turno}-${a.grado}`;
              if (!gruposMap[key]) {
                gruposMap[key] = { 
                  id_grupo: key, 
                  escuela: a.escuela, 
                  turno: a.turno, 
                  grado: a.grado, 
                  alumnos: [], 
                  total: 0, 
                  entregados: 0, 
                  asignadoA: numLogueado 
                };
              }
              gruposMap[key].alumnos.push(a);
              gruposMap[key].total++;
              if (a.entregado) gruposMap[key].entregados++;
            });
            return Object.values(gruposMap);
          })
        );
      }),
      catchError(() => of([]))
    );
  }

  trackByGrupo(index: number, grupo: any) { return grupo.id_grupo; }
  trackByAlumno(index: number, alumno: any) { return alumno.id; }
  getAlumnos(grupo: any) { return grupo.alumnosFiltrados || grupo.alumnos || []; }

  async agregarEmergencia(grupo: any) {
    const alert = await this.alertCtrl.create({
      header: 'Alumno Extra',
      subHeader: grupo.escuela,
      inputs: [
        { name: 'nombre', type: 'text', placeholder: 'Nombre Completo' },
        { name: 'toga', type: 'text', placeholder: 'Talla Toga' },
        { name: 'birrete', type: 'text', placeholder: 'Talla Birrete' },
        { name: 'notas', type: 'textarea', placeholder: 'Notas adicionales' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Guardar', 
          handler: (data) => {
            if(!data.nombre) return false;
            addDoc(collection(this.firestore, 'medidas'), {
              nombreCompleto: CryptoJS.AES.encrypt(data.nombre.trim().toUpperCase(), this.secretKey).toString(),
              escuela: CryptoJS.AES.encrypt(grupo.escuela, this.secretKey).toString(),
              notas: CryptoJS.AES.encrypt(data.notas || '', this.secretKey).toString(),
              grado: grupo.grado,
              turno: grupo.turno,
              tallaToga: data.toga || 'N/A',
              tallaBirrete: data.birrete || 'N/A',
              entregado: true,
              asignadoA: grupo.asignadoA, 
              fechaRegistro: new Date().getTime()
            });
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  private decrypt(text: string): string {
    if (!text) return '';
    try {
      const bytes = CryptoJS.AES.decrypt(text, this.secretKey);
      const dec = bytes.toString(CryptoJS.enc.Utf8);
      return dec || text;
    } catch { return text; }
  }

  async toggleEntrega(alumno: any) {
    const docRef = doc(this.firestore, `medidas/${alumno.id}`);
    await updateDoc(docRef, { entregado: !alumno.entregado });
  }

  buscarInterno(ev: any, grupo: any) {
    const texto = ev.target.value?.toLowerCase().trim();
    grupo.alumnosFiltrados = !texto ? null : grupo.alumnos.filter((a: any) => 
      a.nombreCompleto.toLowerCase().includes(texto)
    );
  }
}