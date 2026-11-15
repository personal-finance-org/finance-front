import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Mismas reglas que el backend (finanzas/src/common/password.ts). Mantenerlas sincronizadas. */
export const MIN_RUN = 4;
export const SPECIALS = '@#$%&*!';

export interface PasswordChecks {
  length: boolean; upper: boolean; lower: boolean; digit: boolean; special: boolean;
  noNumericRun: boolean; noAlphaRun: boolean; noCharRun: boolean;
}

function findRuns(password: string) {
  const s = password.toLowerCase();
  const found = { numeric: false, alpha: false, chars: false };
  let dir = 0;
  let len = 1;
  for (let i = 1; i < s.length; i++) {
    const d = s.charCodeAt(i) - s.charCodeAt(i - 1);
    if (d === 1 || d === -1) { len = d === dir ? len + 1 : 2; dir = d; } else { dir = 0; len = 1; }
    if (len >= MIN_RUN) {
      const run = s.slice(i - len + 1, i + 1);
      if (/^\d+$/.test(run)) found.numeric = true;
      else if (/^[a-z]+$/.test(run)) found.alpha = true;
      else found.chars = true;
    }
  }
  return found;
}

export function passwordChecks(pw: string): PasswordChecks {
  const runs = findRuns(pw);
  return {
    length: pw.length >= 6 && pw.length <= 12,
    upper: /[A-Z]/.test(pw), lower: /[a-z]/.test(pw), digit: /\d/.test(pw), special: /[@#$%&*!]/.test(pw),
    noNumericRun: !runs.numeric, noAlphaRun: !runs.alpha, noCharRun: !runs.chars,
  };
}

export const strongPassword = (c: AbstractControl): ValidationErrors | null =>
  Object.values(passwordChecks(String(c.value ?? ''))).every(Boolean) ? null : { weakPassword: true };
