import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';

export const authGuard: CanActivateFn = () => (inject(Auth).isLoggedIn() ? true : inject(Router).createUrlTree(['/login']));
export const guestGuard: CanActivateFn = () => (inject(Auth).isLoggedIn() ? inject(Router).createUrlTree(['/']) : true);
