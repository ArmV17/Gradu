import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

// Firebase
import { 
  Firestore, 
  collection, 
  addDoc, 
  collectionData, 
  query, 
  orderBy, 
  deleteDoc, 
  doc 
} from '@angular/fire/firestore';

// RxJS
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

// Librerías Externas
import * as XLSX from 'xlsx';
import * as CryptoJS from 'crypto-js';

// IMPORTANTE: Traemos la llave desde el archivo central de configuración
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-medicion',
  templateUrl: './medicion.page.html',
  styleUrls: ['./medicion.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class MedicionPage implements OnInit {

  private firestore = inject(Firestore);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  // Usamos la llave maestra centralizada para que coincida con el Home
  private readonly secretKey = environment.cryptoKey;

  // Estado de la interfaz
  camposBloqueados: boolean = false;

  // Modelo del formulario
  alumno = {
    nombreCompleto: '',
    escuela: '',
    grado: '',
    profesor: '',
    turno: 'Matutino',
    tallaToga: 'M',
    tallaBirrete: 'M',
    notas: ''
  };

  mediciones$!: Observable<any[]>;
  private filtroBusqueda$ = new BehaviorSubject<string>('');

  constructor() { }

  ngOnInit() {
    const ref = collection(this.firestore, 'medidas');
    const q = query(ref, orderBy('fechaRegistro', 'desc'));
    
    this.mediciones$ = collectionData(q, { idField: 'id' }).pipe(
      map(meds => meds.map(m => ({
        ...m,
        // Desciframos los campos usando la llave del environment
        nombreCompleto: this.decrypt(m['nombreCompleto'] || ''),
        escuela: this.decrypt(m['escuela'] || ''),
        profesor: this.decrypt(m['profesor'] || ''),
        grado: m['grado'],
        turno: m['turno'],
        tallaToga: m['tallaToga'],
        tallaBirrete: m['tallaBirrete']
      }))),
      switchMap(medsDescifrados => this.filtroBusqueda$.pipe(
        map(filtro => medsDescifrados.filter(m => 
          m.nombreCompleto.toLowerCase().includes(filtro.toLowerCase()) ||
          m.escuela.toLowerCase().includes(filtro.toLowerCase())
        ))
      )),
      catchError(err => {
        console.error('Error en el flujo de datos:', err);
        return of([]);
      })
    );
  }

  // --- FUNCIONES DE SEGURIDAD (AES-256) ---
  
  private encrypt(text: string): string {
    if (!text) return '';
    // Cifrado con la llave central
    return CryptoJS.AES.encrypt(text.trim(), this.secretKey).toString();
  }

  private decrypt(ciphertext: string): string {
    if (!ciphertext) return '';
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, this.secretKey);
      const originalText = bytes.toString(CryptoJS.enc.Utf8);
      return originalText || 'Dato no legible';
    } catch (e) {
      return 'Error de descifrado';
    }
  }

  // --- LÓGICA DE INTERFAZ ---

  toggleBloqueo() {
    if (!this.alumno.escuela || !this.alumno.grado) {
      this.presentToast('Llena Escuela y Grado antes de bloquear', 'warning');
      return;
    }
    this.camposBloqueados = !this.camposBloqueados;
  }

  buscar(event: any) {
    this.filtroBusqueda$.next(event.target.value || '');
  }

  async guardarMedicion() {
    if (!this.alumno.nombreCompleto.trim()) {
      return this.presentToast('El nombre del alumno es obligatorio', 'warning');
    }
    
    const loading = await this.loadingCtrl.create({ message: 'Cifrando y guardando...' });
    await loading.present();

    try {
      await addDoc(collection(this.firestore, 'medidas'), {
        ...this.alumno,
        nombreCompleto: this.encrypt(this.alumno.nombreCompleto),
        escuela: this.encrypt(this.alumno.escuela),
        profesor: this.encrypt(this.alumno.profesor),
        fechaRegistro: new Date().getTime()
      });
      
      await loading.dismiss();
      this.presentToast('Registro seguro guardado', 'success');
      
      this.alumno.nombreCompleto = '';
      this.alumno.notas = '';
      
    } catch (e) {
      await loading.dismiss();
      this.presentToast('Error al guardar en la nube', 'danger');
    }
  }

  async importarExcel(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const loading = await this.loadingCtrl.create({ message: 'Cifrando datos de Excel...' });
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
        await loading.dismiss();
        this.presentToast(`${json.length} alumnos cifrados e importados`, 'success');
        event.target.value = '';
      } catch (err) {
        await loading.dismiss();
        this.presentToast('Error al procesar archivo', 'danger');
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

  async presentToast(m: string, c: any) {
    const t = await this.toastCtrl.create({ message: m, duration: 2000, color: c });
    t.present();
  }
}