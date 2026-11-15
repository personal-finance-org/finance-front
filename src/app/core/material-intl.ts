import { Injectable, inject } from '@angular/core';
import { MatDatepickerIntl } from '@angular/material/datepicker';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';

/** Textos del paginador de Angular Material traducidos. */
@Injectable()
export class TranslatedPaginatorIntl extends MatPaginatorIntl {
  private readonly t = inject(TranslateService);
  constructor() {
    super();
    this.t.onLangChange.subscribe(() => this.load());
    this.load();
  }
  private load() {
    this.itemsPerPageLabel = this.t.instant('paginator.perPage');
    this.nextPageLabel = this.t.instant('paginator.next');
    this.previousPageLabel = this.t.instant('paginator.previous');
    this.firstPageLabel = this.t.instant('paginator.first');
    this.lastPageLabel = this.t.instant('paginator.last');
    this.getRangeLabel = (page, size, length) => {
      if (!length) return `0 ${this.t.instant('paginator.of')} 0`;
      const start = page * size;
      return `${start + 1} – ${Math.min(start + size, length)} ${this.t.instant('paginator.of')} ${length}`;
    };
    this.changes.next();
  }
}

/** Textos del calendario de Angular Material traducidos. */
@Injectable()
export class TranslatedDatepickerIntl extends MatDatepickerIntl {
  private readonly t = inject(TranslateService);
  constructor() {
    super();
    this.t.onLangChange.subscribe(() => this.load());
    this.load();
  }
  private load() {
    const k = (s: string) => this.t.instant('datepicker.' + s);
    this.calendarLabel = k('calendar');
    this.openCalendarLabel = k('open');
    this.closeCalendarLabel = k('close');
    this.prevMonthLabel = k('prevMonth');
    this.nextMonthLabel = k('nextMonth');
    this.prevYearLabel = k('prevYear');
    this.nextYearLabel = k('nextYear');
    this.prevMultiYearLabel = k('prevYears');
    this.nextMultiYearLabel = k('nextYears');
    this.switchToMonthViewLabel = k('chooseMonth');
    this.switchToMultiYearViewLabel = k('chooseYear');
    this.changes.next();
  }
}
