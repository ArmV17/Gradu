import { Component, inject, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet, ToastController, Platform } from '@ionic/angular/standalone';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true, // Aseguramos que sea standalone
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  private toastCtrl = inject(ToastController);
  private platform = inject(Platform);

  constructor() {
    this.initializeApp();
  }

  ngOnInit() {
    // Escuchar eventos de red globales
    window.addEventListener('online', () => this.presentStatusToast('Conexión restaurada. Sincronizando...', 'success'));
    window.addEventListener('offline', () => this.presentStatusToast('Sin conexión. Trabajando en modo local.', 'warning'));
  }

  async initializeApp() {
    await this.platform.ready();

    // Configurar la barra de estado del celular para que pegue con tu Navbar negra
    if (this.platform.is('capacitor')) {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#000000' });
      
      // Ocultar la Splash Screen manualmente cuando la app ya cargó en memoria
      // Esto evita el "parpadeo" blanco entre el logo y el login
      setTimeout(async () => {
        await SplashScreen.hide({
          fadeOutDuration: 500
        });
      }, 1000);
    }
  }

  // Toast elegante para avisar al staff sobre el internet
  async presentStatusToast(msj: string, color: 'success' | 'warning') {
    const toast = await this.toastCtrl.create({
      message: msj,
      duration: 3000,
      position: 'top', // Lo ponemos arriba para que no tape la Isla Dark
      mode: 'ios',
      color: color,
      cssClass: 'custom-status-toast'
    });
    await toast.present();
  }
}