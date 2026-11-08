import { describe, it, expect } from 'vitest';
import { dayKey, addDays, weekDays, monthDays, daysBetween, isEditable } from './dates';

// Sábado, 7 de novembro de 2026, 10h no horário local.
const sat = new Date(2026, 10, 7, 10);

describe('dayKey', () => {
  it('usa a data local no formato AAAA-MM-DD', () => {
    expect(dayKey(sat)).toBe('2026-11-07');
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('addDays', () => {
  it('avança e volta dias inteiros, atravessando meses', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });
});

describe('weekDays', () => {
  it('devolve os 7 dias da semana, começando na segunda', () => {
    expect(weekDays(sat)).toEqual([
      '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08',
    ]);
  });

  it('domingo pertence à semana que começou na segunda anterior', () => {
    expect(weekDays(new Date(2026, 10, 8, 9))[0]).toBe('2026-11-02');
  });
});

describe('monthDays', () => {
  it('devolve todos os dias do mês', () => {
    const days = monthDays(sat);
    expect(days).toHaveLength(30);
    expect(days[0]).toBe('2026-11-01');
    expect(days[29]).toBe('2026-11-30');
    expect(monthDays(new Date(2028, 1, 10))).toHaveLength(29);
  });
});

describe('daysBetween', () => {
  it('conta dias inteiros entre duas datas', () => {
    expect(daysBetween('2026-11-01', '2026-11-07')).toBe(6);
    expect(daysBetween('2026-11-07', '2026-11-01')).toBe(-6);
  });
});

describe('isEditable', () => {
  it('permite editar hoje e os 2 dias anteriores, nunca o futuro', () => {
    expect(isEditable('2026-11-07', sat)).toBe(true);
    expect(isEditable('2026-11-05', sat)).toBe(true);
    expect(isEditable('2026-11-04', sat)).toBe(false);
    expect(isEditable('2026-11-08', sat)).toBe(false);
  });
});
