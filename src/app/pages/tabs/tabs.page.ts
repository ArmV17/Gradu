import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router'; 
import { filter } from 'rxjs/operators';

// IMPORTANTE: Componentes específicos de Standalone
import { 
  IonTabs, 
  IonTabBar, 
  IonTabButton, 
  IonIcon, 
  IonLabel, 
  NavController 
} from '@ionic/angular/standalone';

// Firebase
import { Auth, authState, signOut } from '@angular/fire/auth';
import { addIcons } from 'ionicons';
import { 
  homeOutline, 
  archiveOutline, 
  addCircleOutline, 
  personOutline, 
  logOutOutline,
  calendarOutline // Agregado por si lo usas en el HTML
} from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: true,
  // Reemplazamos IonicModule por la lista de componentes reales
  imports: [
    CommonModule, 
    FormsModule, 
    IonTabs, 
    IonTabBar, 
    IonTabButton, 
    IonIcon, 
    IonLabel
  ]
})
export class TabsPage implements OnInit {
  private auth = inject(Auth);
  private navCtrl = inject(NavController);
  private router = inject(Router);

  public nombreUsuario: string = 'JOSE ARMANDO'; 
  public selectedTab: string = 'home';

  constructor() {
    // Registramos todos los iconos que mencionaste
    addIcons({ 
      homeOutline, 
      archiveOutline, 
      addCircleOutline, 
      personOutline, 
      logOutOutline,
      calendarOutline 
    });
    
    // Lógica para detectar en qué pestaña estamos
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects;
      if (url.includes('home')) this.selectedTab = 'home';
      if (url.includes('medicion')) this.selectedTab = 'medicion';
      if (url.includes('recepcion')) this.selectedTab = 'recepcion';
      if (url.includes('entrega')) this.selectedTab = 'entrega';
    });
  }

  ngOnInit() {
    // Verificamos sesión y personalizamos el saludo para Jose Armando
    authState(this.auth).subscribe(user => {
      if (user) {
        this.nombreUsuario = 'JOSE ARMANDO';
      }
    });
  }

  async logout() {
    try {
      await signOut(this.auth);
      this.navCtrl.navigateRoot('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }
}