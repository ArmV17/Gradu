import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { FormsModule } from '@angular/forms';
import { IonicModule, Platform, ToastController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { Firestore, collection, collectionData, doc, updateDoc } from '@angular/fire/firestore';
import * as CryptoJS from 'crypto-js';
import { environment } from 'src/environments/environment';

registerLocaleData(localeEs); // Registrar español para los días de la semana

@Component({
  selector: 'app-detalle',
  templateUrl: './detalle.page.html',
  styleUrls: ['./detalle.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class DetallePage implements OnInit {
  private route = inject(ActivatedRoute);
  private firestore = inject(Firestore);
  private platform = inject(Platform);
  private toastCtrl = inject(ToastController);
  private readonly secretKey = environment.cryptoKey;

  nombreEscuela: string = '';
  grupos: any[] = [];
  isPC: boolean = false;
  miNumeroEmpleado: string = '0001'; 

  ngOnInit() {
    const ancho = window.innerWidth;
    // Si es móvil o pantalla pequeña, forzamos vista Staff
    this.isPC = (ancho > 768) && !this.platform.is('mobile');
    this.nombreEscuela = this.route.snapshot.paramMap.get('nombre') || '';
    this.obtenerDatosAgrupados();
  }

  obtenerDatosAgrupados() {
    const ref = collection(this.firestore, 'medidas');
    collectionData(ref, { idField: 'id' }).subscribe((res: any[]) => {
      
      const alumnos = res.map(m => ({
        ...m,
        escuelaDesc: this.decrypt(m.escuela),
        profesorDesc: this.decrypt(m.profesor),
        nombreDesc: this.decrypt(m.nombreCompleto),
        notaAlumno: m.nota || m.notas || '', 
        tallaToga: m.tallaToga || 'N/A',
        tallaBirrete: m.tallaBirrete || 'N/A',
        empleadoID: m.numEmpleadoAsignado ? String(m.numEmpleadoAsignado).trim() : ''
      })).filter(m => m.escuelaDesc === this.nombreEscuela);

      const gruposMap = alumnos.reduce((acc: any, al: any) => {
        const llave = `${al.profesorDesc}-${al.grado}-${al.turno}`;
        if (!acc[llave]) {
          acc[llave] = {
            profesor: al.profesorDesc,
            grado: al.grado,
            turno: al.turno,
            fechaEvento: al.fechaEvento || '',
            lugar: al.lugarEvento || '',
            ubicacion: al.direccionLugar || '',
            hora: al.horaEvento || '',
            empleado: al.empleadoID,
            alumnos: [],
            idsAlumnos: []
          };
        }
        acc[llave].alumnos.push({
          nombre: al.nombreDesc,
          toga: al.tallaToga,
          birrete: al.tallaBirrete,
          nota: al.notaAlumno
        });
        acc[llave].idsAlumnos.push(al.id);
        return acc;
      }, {});

      const todosLosGrupos = Object.values(gruposMap);

      if (this.isPC) {
        this.grupos = todosLosGrupos;
      } else {
        // Solo mostramos el grupo del empleado 0001 en el celular
        this.grupos = todosLosGrupos.filter((g: any) => g.empleado === this.miNumeroEmpleado);
      }
    });
  }

  async guardarLogistica(grupo: any) {
    if (!this.isPC) return;
    try {
      for (const id of grupo.idsAlumnos) {
        const docRef = doc(this.firestore, `medidas/${id}`);
        await updateDoc(docRef, {
          lugarEvento: grupo.lugar,
          direccionLugar: grupo.ubicacion,
          horaEvento: grupo.hora,
          fechaEvento: grupo.fechaEvento,
          numEmpleadoAsignado: String(grupo.empleado).trim()
        });
      }
      this.presentToast('Logística actualizada', 'success');
    } catch (e) { this.presentToast('Error al guardar', 'danger'); }
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