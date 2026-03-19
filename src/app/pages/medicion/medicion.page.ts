import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// IMPORTANTE: Registrar todos los componentes usados en el HTML
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, 
  IonInput, IonButton, IonIcon, IonLabel, IonTextarea, IonSearchbar,
  IonButtons, IonBackButton, IonGrid, IonRow, IonCol, 
  IonSegment, IonSegmentButton, ToastController, LoadingController 
} from '@ionic/angular/standalone';

// Firebase Standalone
import { 
  Firestore, collection, addDoc, collectionData, 
  query, orderBy, deleteDoc, doc 
} from '@angular/fire/firestore';

// RxJS
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

// Librerías
import * as XLSX from 'xlsx';
import * as CryptoJS from 'crypto-js';

// Iconos
import { addIcons } from 'ionicons';
import { 
  cloudUploadOutline, trashOutline, documentTextOutline, 
  personCircleOutline, searchOutline, lockClosedOutline, 
  lockOpenOutline, saveOutline, schoolOutline
} from 'ionicons/icons';

import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-medicion',
  templateUrl: './medicion.page.html',
  styleUrls: ['./medicion.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar, 
    IonList, 
    IonItem, 
    IonInput, 
    IonButton, 
    IonIcon, 
    IonLabel, 
    IonTextarea, 
    IonSearchbar,
    IonButtons,
    IonBackButton,
    IonGrid,
    IonRow,
    IonCol,
    IonSegment,
    IonSegmentButton
  ]
})
export class MedicionPage implements OnInit {
  private firestore = inject(Firestore);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  private readonly secretKey = environment.cryptoKey;

  public camposBloqueados: boolean = false;
  
  public alumno = {
    nombreCompleto: '',
    escuela: '',
    grado: '',
    profesor: '',
    turno: 'Matutino',
    tallaToga: 'M',
    tallaBirrete: 'M',
    notas: ''
  };

  public mediciones$!: Observable<any[]>;
  public filtroBusqueda$ = new BehaviorSubject<string>('');

  constructor() {
    // Registro de iconos
    addIcons({
      cloudUploadOutline,
      trashOutline,
      documentTextOutline,
      personCircleOutline,
      searchOutline,
      lockClosedOutline,
      lockOpenOutline,
      saveOutline,
      schoolOutline
    });
  }

  ngOnInit() {
    const ref = collection(this.firestore, 'medidas');
    const q = query(ref, orderBy('fechaRegistro', 'desc'));
    
    this.mediciones$ = collectionData(q, { idField: 'id' }).pipe(
      map(meds => meds.map(m => ({
        ...m,
        nombreCompleto: this.decrypt(m['nombreCompleto'] || ''),
        escuela: this.decrypt(m['escuela'] || ''),
        profesor: this.decrypt(m['profesor'] || ''),
      }))),
      switchMap(medsDescifrados => this.filtroBusqueda$.pipe(
        map(filtro => {
          const texto = filtro.trim().toLowerCase();
          if (texto === '') {
            return medsDescifrados.length > 0 ? [medsDescifrados[0]] : [];
          }
          return medsDescifrados.filter(m => 
            m.nombreCompleto.toLowerCase().includes(texto) ||
            m.escuela.toLowerCase().includes(texto)
          );
        })
      )),
      catchError(err => {
        console.error('Error en mediciones:', err);
        return of([]);
      })
    );
  }

  private encrypt(text: string): string {
    if (!text) return '';
    return CryptoJS.AES.encrypt(text.trim(), this.secretKey).toString();
  }

  private decrypt(ciphertext: string): string {
    if (!ciphertext) return '';
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, this.secretKey);
      return bytes.toString(CryptoJS.enc.Utf8) || 'Dato no legible';
    } catch (e) {
      return 'Error de cifrado';
    }
  }

  public toggleBloqueo() {
    if (!this.alumno.escuela || !this.alumno.grado) {
      this.presentToast('Llena Escuela y Grado para poder bloquear', 'warning');
      return;
    }
    this.camposBloqueados = !this.camposBloqueados;
  }

  public buscar(event: any) {
    this.filtroBusqueda$.next(event.target.value || '');
  }

  async guardarMedicion() {
    if (!this.alumno.nombreCompleto.trim()) {
      return this.presentToast('El nombre del alumno es obligatorio', 'warning');
    }
    
    const loading = await this.loadingCtrl.create({ 
      message: 'Cifrando y guardando...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await addDoc(collection(this.firestore, 'medidas'), {
        ...this.alumno,
        nombreCompleto: this.encrypt(this.alumno.nombreCompleto),
        escuela: this.encrypt(this.alumno.escuela),
        profesor: this.encrypt(this.alumno.profesor),
        fechaRegistro: new Date().getTime()
      });
      
      this.presentToast('Alumno registrado correctamente', 'success');
      this.alumno.nombreCompleto = '';
      this.alumno.notas = '';
      
    } catch (e) {
      this.presentToast('Error de conexión', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  async importarExcel(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const loading = await this.loadingCtrl.create({ message: 'Procesando Excel...' });
    await loading.present();

    const reader = new FileReader();
    reader.onload = async (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const json: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        const ref = collection(this.firestore, 'medidas');

        for (const f of json) {
          await addDoc(ref, {
            nombreCompleto: this.encrypt(f['Nombre'] || f['nombreCompleto'] || 'Sin Nombre'),
            escuela: this.encrypt(f['Escuela'] || f['escuela'] || this.alumno.escuela),
            profesor: this.encrypt(f['Profesor'] || f['profesor'] || this.alumno.profesor),
            grado: f['Grado'] || f['grado'] || this.alumno.grado,
            turno: f['Turno'] || f['turno'] || this.alumno.turno,
            tallaToga: f['Toga'] || f['tallaToga'] || 'M',
            tallaBirrete: f['Birrete'] || f['tallaBirrete'] || 'M',
            notas: f['Notas'] || f['notas'] || '',
            fechaRegistro: new Date().getTime()
          });
        }
        this.presentToast(`${json.length} alumnos importados`, 'success');
      } catch (err) {
        this.presentToast('Error al procesar Excel', 'danger');
      } finally {
        loading.dismiss();
        event.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async eliminar(id: string) {
    try {
      await deleteDoc(doc(this.firestore, `medidas/${id}`));
      this.presentToast('Registro eliminado', 'secondary');
    } catch (e) {
      this.presentToast('Error al eliminar', 'danger');
    }
  }

  async presentToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2500,
      color: color,
      position: 'bottom',
      mode: 'ios'
    });
    toast.present();
  }
}