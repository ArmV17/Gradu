import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, Platform } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { Firestore, collection, collectionData, doc, updateDoc } from '@angular/fire/firestore';
import * as CryptoJS from 'crypto-js';
import { environment } from 'src/environments/environment';

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
  private readonly secretKey = environment.cryptoKey;

  nombreEscuela: string = '';
  grupos: any[] = [];
  isPC: boolean = false;
  
  // Este número debe ser el mismo que usas en el Home
  miNumeroEmpleado: string = '0001'; 

  ngOnInit() {
    this.isPC = (this.platform.is('desktop') || window.innerWidth > 768);
    this.nombreEscuela = this.route.snapshot.paramMap.get('nombre') || '';
    this.obtenerDatosAgrupados();
  }

  obtenerDatosAgrupados() {
    const ref = collection(this.firestore, 'medidas');
    collectionData(ref, { idField: 'id' }).subscribe((res: any[]) => {
      
      // 1. Desencriptar y filtrar primero por la escuela
      const alumnos = res.map(m => ({
        ...m,
        escuelaDesc: this.decrypt(m.escuela),
        profesorDesc: this.decrypt(m.profesor),
        nombreDesc: this.decrypt(m.nombreCompleto),
        // Aseguramos que el ID del empleado sea string para comparar bien
        empleadoID: m.numEmpleadoAsignado ? String(m.numEmpleadoAsignado).trim() : ''
      })).filter(m => m.escuelaDesc === this.nombreEscuela);

      // 2. Agrupar por Profesor + Grado + Turno
      const gruposMap = alumnos.reduce((acc, al) => {
        const llave = `${al.profesorDesc}-${al.grado}-${al.turno}`;
        if (!acc[llave]) {
          acc[llave] = {
            profesor: al.profesorDesc,
            grado: al.grado,
            turno: al.turno,
            lugar: al.lugarEvento || '',
            ubicacion: al.direccionLugar || '',
            hora: al.horaEvento || '',
            empleado: al.empleadoID,
            alumnos: [],
            idsAlumnos: []
          };
        }
        acc[llave].alumnos.push(al);
        acc[llave].idsAlumnos.push(al.id);
        return acc;
      }, {});

      const todosLosGrupos = Object.values(gruposMap);

      // 3. FILTRO CRÍTICO: Si es celular, solo dejamos los grupos de SU número
      if (this.isPC) {
        this.grupos = todosLosGrupos;
      } else {
        this.grupos = todosLosGrupos.filter((g: any) => g.empleado === this.miNumeroEmpleado);
      }
    });
  }

  async guardarLogistica(grupo: any) {
    if (!this.isPC) return;
    for (const id of grupo.idsAlumnos) {
      const docRef = doc(this.firestore, `medidas/${id}`);
      await updateDoc(docRef, {
        lugarEvento: grupo.lugar,
        direccionLugar: grupo.ubicacion,
        horaEvento: grupo.hora,
        numEmpleadoAsignado: String(grupo.empleado).trim()
      });
    }
  }

  private decrypt(text: string): string {
    if (!text) return '';
    try {
      const bytes = CryptoJS.AES.decrypt(text, this.secretKey);
      return bytes.toString(CryptoJS.enc.Utf8) || text;
    } catch (e) { return text; }
  }
}