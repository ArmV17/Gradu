import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'admin-home',
    loadComponent: () => import('./pages/admin-home/admin-home.page').then(m => m.AdminHomePage),
    canActivate: [authGuard, adminGuard] 
  },
  {
    path: 'admin-usuarios',
    loadComponent: () => import('./pages/admin-usuarios/admin-usuarios.page').then(m => m.AdminUsuariosPage),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'tabs',
    loadComponent: () => import('./pages/tabs/tabs.page').then( m => m.TabsPage),
    children: [
      {
        path: 'home',
        loadComponent: () => import('./pages/home/home.page').then( m => m.HomePage)
      },
      {
        path: 'medicion',
        loadComponent: () => import('./pages/medicion/medicion.page').then( m => m.MedicionPage)
      },
      {
        path: 'entrega',
        loadComponent: () => import('./pages/entrega/entrega.page').then( m => m.EntregaPage)
      },
      {
        path: 'recepcion',
        loadComponent: () => import('./pages/recepcion/recepcion.page').then( m => m.RecepcionPage)
      },
      {
        path: '',
        redirectTo: '/tabs/home',
        pathMatch: 'full',
      },
    ],
  },
];