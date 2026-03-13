import { Component, OnInit, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import * as CryptoJS from 'crypto-js';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class HomePage implements OnInit {
  private firestore = inject(Firestore);
  private router = inject(Router);
  
  // Clave desde environment
  private readonly secretKey = environment.cryptoKey; 

  escuelas$!: Observable<string[]>;

  constructor() {}

  ngOnInit() {
    // 1. Definimos la referencia a la colección primero
    const medicionesRef = collection(this.firestore, 'medidas');
    
    // 2. Escuchamos los cambios
    this.escuelas$ = collectionData(medicionesRef).pipe(
      map((items: any[]) => {
        console.log('Datos cifrados recibidos:', items);

        const nombres = items.map(m => {
          if (!m.escuela) return 'Sin Nombre';
          
          try {
            // Intentamos desencriptar
            const bytes = CryptoJS.AES.decrypt(m.escuela, this.secretKey);
            const textoLimpio = bytes.toString(CryptoJS.enc.Utf8);

            // Si textoLimpio está vacío, la llave está mal o el dato no estaba cifrado
            if (!textoLimpio) {
              console.warn('No se pudo desencriptar:', m.escuela);
              return m.escuela; // Devolvemos el original si falla para no perder el dato
            }

            return textoLimpio;
          } catch (e) {
            console.error('Error en proceso de descifrado:', e);
            return m.escuela;
          }
        });

        // 3. Quitamos duplicados (Set) y limpiamos espacios
        return [...new Set(nombres)].sort(); 
      })
    );
  }

  irAMedicion() {
    this.router.navigate(['/medicion']);
  }

  verDetalleEscuela(escuela: string) {
    console.log('Escuela seleccionada:', escuela);
    // Próximo paso: navegar a activos con este filtro
  }
}