import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./vistas/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
{
  path: 'home',
  loadComponent: () => import('./vistas/home/home.page').then(m => m.HomePage)
  },
  {
    path: 'medicion',
    loadComponent: () => import('./vistas/medicion/medicion.page').then(m => m.MedicionPage)
  },
]
