import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonButton, IonIcon, IonSearchbar, IonLabel, IonItem, 
  IonAccordionGroup, IonAccordion, NavController 
} from '@ionic/angular/standalone';

// Firebase
import { Auth, authState, signOut } from '@angular/fire/auth';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';

// RxJS
import { Observable, of } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';

// Capacitor Plugins
import { LocalNotifications } from '@capacitor/local-notifications';

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
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, 
    IonButtons, IonButton, IonIcon, IonSearchbar, IonLabel, IonItem, 
    IonAccordionGroup, IonAccordion
  ]
})
export class HomePage implements OnInit {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private navCtrl = inject(NavController);
  private readonly secretKey = environment.cryptoKey;

  public eventos$!: Observable<any[]>;
  
  // Guardamos qué eventos ya avisamos para no repetir el sonido cada vez que cambia algo
  private eventosNotificados = new Set<string>();

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
        const ref = collection(this.firestore, 'medidas');
        
        return collectionData(ref, { idField: 'id' }).pipe(
          map(alumnos => {
            const misRegistros = alumnos.filter((a: any) => 
              String(a['asignadoA'] || '').trim() === numLogueado
            );

            const descifrados = misRegistros.map((a: any) => ({
              ...a,
              nombreCompleto: this.decrypt(a['nombreCompleto']),
              escuela: this.decrypt(a['escuela']),
              lugar: this.decrypt(a['lugar'] || 'Por confirmar'),
              profesor: this.decrypt(a['profesor'] || 'Sin asignar')
            }));

            const gruposMap: any = {};
            descifrados.forEach(a => {
              const key = `${a.escuela}-${a.grado}-${a.turno}-${a.fechaEvento || 'pendiente'}`;
              
              if (!gruposMap[key]) {
                gruposMap[key] = { 
                  id_evento: key,
                  escuela: a.escuela,
                  lugar: a.lugar,
                  fechaEvento: a.fechaEvento || '',
                  horaEvento: a.horaEvento || '',
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
          }),
          // --- NUEVO: Procesar notificaciones cada que llega la lista ---
          tap(grupos => this.verificarNuevosEventos(grupos))
        );
      }),
      catchError(err => {
        console.error("Error crítico en Home:", err);
        return of([]);
      })
    );
  }

  // Comprueba si hay grupos nuevos asignados para lanzar la alerta
  private async verificarNuevosEventos(grupos: any[]) {
    for (const g of grupos) {
      if (g.fechaEvento && g.horaEvento && !this.eventosNotificados.has(g.id_evento)) {
        await this.programarNotificacionesLocal(g);
        this.eventosNotificados.add(g.id_evento);
      }
    }
  }

  async programarNotificacionesLocal(evento: any) {
    try {
      const status = await LocalNotifications.requestPermissions();
      if (status.display !== 'granted') return;

      // Parsear fecha y hora para el recordatorio
      const [y, m, d] = evento.fechaEvento.split('-').map(Number);
      const [hh, mm] = evento.horaEvento.split(':').map(Number);
      const fechaEvento = new Date(y, m - 1, d, hh, mm);
      
      const fecha30MinAntes = new Date(fechaEvento.getTime() - 30 * 60000);
      const ahora = new Date();

      const agenda = [];

      // 1. Notificación inmediata (¡Te acaban de asignar!)
      agenda.push({
        title: '¡Grupo Asignado! 🎓',
        body: `Escuela: ${evento.escuela} (${evento.grado} ${evento.turno})`,
        id: Math.floor(Math.random() * 10000),
        schedule: { at: new Date(Date.now() + 2000) }, // En 2 segundos
        sound: 'beep.wav'
      });

      // 2. Notificación 30 minutos antes (Solo si el evento es en el futuro)
      if (fecha30MinAntes > ahora) {
        agenda.push({
          title: 'Próxima Graduación ⏰',
          body: `En 30 min: ${evento.escuela} en ${evento.lugar}`,
          id: Math.floor(Math.random() * 10000),
          schedule: { at: fecha30MinAntes },
          sound: 'beep.wav'
        });
      }

      await LocalNotifications.schedule({ notifications: agenda });
      console.log('Notificaciones programadas para:', evento.escuela);
    } catch (e) {
      console.error("Error al programar avisos locales:", e);
    }
  }

  // --- MÉTODOS REQUERIDOS POR EL HTML ---

  trackByEvento(index: number, evento: any) { return evento.id_evento; }
  trackByAlumno(index: number, alumno: any) { return alumno.id; }
  getAlumnos(evento: any) { return evento.alumnosFiltrados || evento.alumnos || []; }

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