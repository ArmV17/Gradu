import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonButtons, 
  IonButton, 
  IonIcon, 
  IonSearchbar, 
  IonLabel, 
  IonItem, 
  IonAccordionGroup, 
  IonAccordion,
  NavController 
} from '@ionic/angular/standalone';

// Firebase
import { Auth, authState, signOut } from '@angular/fire/auth';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';

// RxJS
import { Observable, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

// Utilidades
import * as CryptoJS from 'crypto-js';
import { environment } from 'src/environments/environment';
import { addIcons } from 'ionicons';
import { 
  calendarOutline, locationOutline, timeOutline, 
  schoolOutline, logOutOutline, personCircleOutline,
  notificationsOutline, searchOutline, businessOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar, 
    IonButtons,
    IonButton, 
    IonIcon, 
    IonSearchbar, 
    IonLabel, 
    IonItem, 
    IonAccordionGroup,
    IonAccordion
  ]
})

export class HomePage implements OnInit {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private navCtrl = inject(NavController);
  private readonly secretKey = environment.cryptoKey;

  public eventos$!: Observable<any[]>;

  constructor() {
    addIcons({ 
      calendarOutline, locationOutline, timeOutline, 
      schoolOutline, logOutOutline, personCircleOutline,
      notificationsOutline, searchOutline, businessOutline
    });
  }

  ngOnInit() {
    this.eventos$ = authState(this.auth).pipe(
      switchMap(user => {
        if (!user) return of([]);

        const numLogueado = user.email?.split('@')[0].trim() || '';
        console.log("Cargando agenda para el empleado:", numLogueado);

        const ref = collection(this.firestore, 'medidas');
        
        return collectionData(ref, { idField: 'id' }).pipe(
          map(alumnos => {
            // 1. Filtrar por empleado asignado
            const misRegistros = alumnos.filter((a: any) => 
              String(a['asignadoA'] || '').trim() === numLogueado
            );

            // 2. Descifrar datos
            const descifrados = misRegistros.map((a: any) => ({
              ...a,
              nombreCompleto: this.decrypt(a['nombreCompleto']),
              escuela: this.decrypt(a['escuela']),
              lugar: this.decrypt(a['lugar'] || 'Por confirmar'),
              profesor: this.decrypt(a['profesor'] || 'Sin asignar')
            }));

            // 3. Agrupación por Grupo Único
            const gruposMap: any = {};
            descifrados.forEach(a => {
              const key = `${a.escuela}-${a.grado}-${a.turno}-${a.fechaEvento || 'pendiente'}`;
              
              if (!gruposMap[key]) {
                gruposMap[key] = { 
                  id_evento: key,
                  escuela: a.escuela,
                  lugar: a.lugar,
                  fechaEvento: a.fechaEvento || 'Pendiente',
                  horaEvento: a.horaEvento || '--:--',
                  grado: a.grado || 'S/N',
                  turno: a.turno || 'Único',
                  alumnos: [],
                  alumnosFiltrados: null
                };
              }
              gruposMap[key].alumnos.push(a);
            });

            return Object.values(gruposMap).sort((a: any, b: any) => 
              a.fechaEvento.localeCompare(b.fechaEvento)
            );
          })
        );
      }),
      catchError(err => {
        console.error("Error crítico en Home:", err);
        return of([]);
      })
    );
  }

  // --- MÉTODOS REQUERIDOS POR EL HTML ---

  trackByEvento(index: number, evento: any) {
    return evento.id_evento;
  }

  trackByAlumno(index: number, alumno: any) {
    return alumno.id;
  }

  getAlumnos(evento: any) {
    return evento.alumnosFiltrados || evento.alumnos || [];
  }

  buscarInterno(ev: any, evento: any) {
    const texto = ev.target.value?.toLowerCase().trim();
    if (!texto) {
      evento.alumnosFiltrados = null;
      return;
    }
    evento.alumnosFiltrados = evento.alumnos.filter((a: any) => 
      a.nombreCompleto.toLowerCase().includes(texto)
    );
  }

  private decrypt(text: string): string {
    if (!text) return '';
    try {
      const bytes = CryptoJS.AES.decrypt(text, this.secretKey);
      return bytes.toString(CryptoJS.enc.Utf8) || text;
    } catch {
      return text;
    }
  }

  async logout() {
    await signOut(this.auth);
    this.navCtrl.navigateRoot('/login');
  }
}