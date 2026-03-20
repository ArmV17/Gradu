import { Component, inject, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet, ToastController, Platform } from '@ionic/angular/standalone';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { LocalNotifications } from '@capacitor/local-notifications';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  private toastCtrl = inject(ToastController);
  private platform = inject(Platform);

  constructor() {
    this.initializeApp();
  }

  ngOnInit() {
    window.addEventListener('online', () => this.presentStatusToast('Conexión restaurada', 'success'));
    window.addEventListener('offline', () => this.presentStatusToast('Sin conexión a internet', 'warning'));
  }

  async initializeApp() {
    await this.platform.ready();

    if (this.platform.is('capacitor')) {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#000000' });
      } catch (e) { console.warn("StatusBar no disponible"); }

      this.solicitarPermisosNotificaciones();

      setTimeout(async () => {
        try {
          await SplashScreen.hide({ fadeOutDuration: 500 });
        } catch (e) { console.warn("Error al ocultar Splash"); }
      }, 1000);
    }
  }

  private async solicitarPermisosNotificaciones() {
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'prompt') {
        await LocalNotifications.requestPermissions();
      }
    } catch (e) {
      console.error("Error al solicitar permisos", e);
    }
  }

  async presentStatusToast(msj: string, color: 'success' | 'warning') {
    const toast = await this.toastCtrl.create({
      message: msj,
      duration: 3000,
      position: 'top',
      mode: 'ios',
      color: color,
      cssClass: 'custom-status-toast'
    });
    await toast.present();
  }
}