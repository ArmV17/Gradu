import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';

export const adminGuard: CanActivateFn = async (route, state) => {
  const auth = inject(Auth);
  const firestore = inject(Firestore);
  const router = inject(Router);

  const user = auth.currentUser;
  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  try {
    // Buscamos el documento que tenga el correo del admin logueado
    const q = query(collection(firestore, 'usuarios'), where("numEmpleado", "==", user.email?.split('@')[0]));
    const snapshot = await getDocs(q);

    if (!snapshot.empty && snapshot.docs[0].data()['rol'] === 'admin') {
      return true; // Es admin confirmado
    } else {
      console.error("Acceso denegado: No eres admin");
      router.navigate(['/home']); // Si no es admin, mándalo al home normal
      return false;
    }
  } catch (e) {
    router.navigate(['/login']);
    return false;
  }
};