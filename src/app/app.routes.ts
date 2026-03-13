import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./vistas/home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },  {
    path: 'medicion',
    loadComponent: () => import('./vistas/medicion/medicion.page').then( m => m.MedicionPage)
  },

];
