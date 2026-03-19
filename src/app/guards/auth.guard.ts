import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Observable } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  return new Observable<boolean>((observer) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        observer.next(true);
      } else {
        // Solo redirigir si NO estamos ya en el login para evitar bucles
        if (state.url !== '/login') {
          router.navigate(['/login']);
        }
        observer.next(false);
      }
      observer.complete();
      unsubscribe(); // Muy importante: dejar de escuchar para liberar memoria
    });
  });
};