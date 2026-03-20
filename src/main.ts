import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
// Añadimos initializeFirestore y persistentLocalCache
import { 
  provideFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { environment } from './environments/environment';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { provideRouter, RouteReuseStrategy } from '@angular/router';
import { provideIonicAngular, IonicRouteStrategy } from '@ionic/angular/standalone';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({ mode: 'md' }),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(environment.firebase)),

    provideFirestore(() => 
      initializeFirestore(initializeApp(environment.firebase), {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      })
    ),
    
    provideAuth(() => getAuth()),
  ],
}).catch(err => {
  console.error("ERROR DE BOOTSTRAP: ", err);
});