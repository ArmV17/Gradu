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
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

// Excel
import * as XLSX from 'xlsx';

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

  // Modelo con los campos solicitados
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

  ngOnInit() {
    // Apuntamos a la tabla 'medidas'
    const ref = collection(this.firestore, 'medidas');
    const q = query(ref, orderBy('fechaRegistro', 'desc'));
    const data$ = collectionData(q, { idField: 'id' });
    
    this.mediciones$ = combineLatest([data$, this.filtroBusqueda$]).pipe(
      map(([meds, f]) => meds.filter(m => 
        (m['nombreCompleto'] as string).toLowerCase().includes(f.toLowerCase()) ||
        (m['escuela'] as string).toLowerCase().includes(f.toLowerCase()) ||
        (m['grado'] as string).toLowerCase().includes(f.toLowerCase())
      ))
    );
  }

  buscar(event: any) {
    this.filtroBusqueda$.next(event.target.value || '');
  }

  async guardarMedicion() {
    if (!this.alumno.nombreCompleto || !this.alumno.escuela) {
      return this.presentToast('Faltan datos obligatorios', 'warning');
    }
    
    const loading = await this.loadingCtrl.create({ message: 'Guardando registro...' });
    await loading.present();

    try {
      await addDoc(collection(this.firestore, 'medidas'), {
        ...this.alumno,
        fechaRegistro: new Date().getTime()
      });
      await loading.dismiss();
      this.presentToast('Alumno registrado con éxito', 'success');
      
      // Limpiamos solo el nombre y notas para agilizar registros del mismo grupo
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
            nombreCompleto: f['Nombre'] || f['nombreCompleto'] || 'Sin Nombre',
            escuela: f['Escuela'] || f['escuela'] || this.alumno.escuela,
            grado: f['Grado'] || f['grado'] || this.alumno.grado,
            profesor: f['Profesor'] || f['profesor'] || '',
            turno: f['Turno'] || f['turno'] || 'Matutino',
            tallaToga: f['Toga'] || f['tallaToga'] || 'M',
            tallaBirrete: f['Birrete'] || f['tallaBirrete'] || 'M',
            notas: f['Notas'] || f['notas'] || '',
            fechaRegistro: new Date().getTime()
          });
        }
        await loading.dismiss();
        this.presentToast(`${json.length} alumnos importados`, 'success');
        event.target.value = '';
      } catch (err) {
        await loading.dismiss();
        this.presentToast('Error al procesar el archivo', 'danger');
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