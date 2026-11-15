import { Account } from './models';

/**
 * Origen de un pago: una cuenta ("a:ID") o un bolsillo de esa cuenta ("p:ID"). Vacío = ninguno.
 * Se usa como valor de los selectores para distinguir cuenta de bolsillo con un solo campo.
 */
export const accountSource = (accountId: string) => `a:${accountId}`;
export const pocketSource = (pocketId: string) => `p:${pocketId}`;

export interface ParsedSource { accountId: string; pocketId?: string; }

export function parseSource(value: string, accounts: Account[]): ParsedSource | null {
  if (value.startsWith('a:')) return { accountId: value.slice(2) };
  if (value.startsWith('p:')) {
    const pocketId = value.slice(2);
    const acc = accounts.find((a) => a.pockets.some((p) => p._id === pocketId));
    return acc ? { accountId: acc._id, pocketId } : null;
  }
  return null;
}
