import { Directive, ElementRef, forwardRef, HostListener, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { I18n } from '../core/i18n';

/**
 * Campo de dinero: separador de miles mientras se escribe, según el idioma
 * (es/pt: 1.250.000,50 · en: 1,250,000.50), con máximo 2 decimales.
 * El valor del formulario es un `number` (o null si está vacío).
 */
@Directive({
  selector: 'input[appMoney]',
  host: { type: 'text', inputmode: 'decimal', autocomplete: 'off' },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MoneyInput), multi: true }],
})
export class MoneyInput implements ControlValueAccessor {
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private readonly i18n = inject(I18n);
  private onChange: (v: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  private get seps() {
    const parts = new Intl.NumberFormat(this.i18n.locale()).formatToParts(1234567.5);
    return { group: parts.find((p) => p.type === 'group')?.value ?? '.', dec: parts.find((p) => p.type === 'decimal')?.value ?? ',' };
  }

  writeValue(v: number | string | null): void {
    this.el.value = v === null || v === undefined || v === '' ? '' : this.format(String(v).replace('.', this.seps.dec));
  }
  registerOnChange(fn: (v: number | null) => void) { this.onChange = fn; }
  registerOnTouched(fn: () => void) { this.onTouched = fn; }
  setDisabledState(disabled: boolean) { this.el.disabled = disabled; }

  @HostListener('blur') protected blur() { this.onTouched(); }

  @HostListener('input') protected input() {
    const { group, dec } = this.seps;
    const raw = this.el.value;
    const caret = this.el.selectionStart ?? raw.length;
    const isSig = (c: string) => /\d/.test(c) || c === dec;
    const significant = [...raw.slice(0, caret)].filter(isSig).length;

    const formatted = this.format(raw);
    this.el.value = formatted;

    let seen = 0, pos = 0;
    while (pos < formatted.length && seen < significant) { if (isSig(formatted[pos])) seen++; pos++; }
    this.el.setSelectionRange(pos, pos);

    const [int, decimals] = formatted.split(group).join('').split(dec);
    this.onChange(int === '' && !decimals ? null : Number(`${int || '0'}${decimals !== undefined ? '.' + decimals : ''}`));
  }

  private format(text: string): string {
    const { group, dec } = this.seps;
    const cleaned = [...text].filter((c) => /\d/.test(c) || c === dec).join('');
    const at = cleaned.indexOf(dec);
    const intRaw = (at === -1 ? cleaned : cleaned.slice(0, at)).replace(/^0+(?=\d)/, '');
    const decimals = at === -1 ? null : cleaned.slice(at + 1).split(dec).join('').slice(0, 2);
    const int = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, group);
    return decimals === null ? int : `${int || '0'}${dec}${decimals}`;
  }
}
