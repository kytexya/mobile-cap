import axiosClient from '../api/axiosClient';
import { extractArray, extractObject } from '../utils/normalization';

export interface Menu {
  id: number;
  classId?: number;
  campusId?: number;
  startDate: string;
  endDate: string;
  meals: Array<{ day: string; breakfast: string; lunch: string; snack: string }>;
}

export interface MenuDay {
  day: string;
  date: string;
  breakfast: string;
  lunch: string;
  snack: string;
}

type MenuApiItem = {
  MenuId?: number;
  ClassId?: number | null;
  MenuDate?: string;
  MealType?: string;
  MenuContent?: string;
  Calories?: number | null;
  Allergens?: string;
  Source?: string;
  SupplierName?: string;
  PreparedBy?: number | null;
  menuId?: number;
  classId?: number | null;
  menuDate?: string;
  mealType?: string;
  menuContent?: string;
  date?: string;
  Date?: string;
  breakfast?: string;
  Breakfast?: string;
  lunch?: string;
  Lunch?: string;
  snack?: string;
  Snack?: string;
};

const weekdayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const stripDiacritics = (value?: string) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

const normalizeMealType = (value?: string) => {
  const lower = stripDiacritics(value);
  if (lower.includes('trua') || lower.includes('lunch') || lower.includes('noon')) return 'lunch';
  if (lower.includes('xe') || lower.includes('snack') || lower.includes('phu') || lower.includes('afternoon')) return 'snack';
  if (lower.includes('sang') || lower.includes('break')) return 'breakfast';
  return 'breakfast';
};

const normalizeDateKey = (value?: string) => {
  if (!value) return '';
  return String(value).split('T')[0];
};

const normalizeMenuDays = (response: any): MenuDay[] => {
  const list = extractArray<MenuApiItem>(response);
  const grouped = new Map<string, MenuDay>();

  list.forEach((item, index) => {
    const dateValue = normalizeDateKey(item.MenuDate ?? item.menuDate ?? item.Date ?? item.date ?? '');
    const date = dateValue ? new Date(`${dateValue}T12:00:00`) : new Date();
    const key = dateValue || `menu-${index}`;
    const existing =
      grouped.get(key) ||
      ({
        day: weekdayLabels[date.getDay()] || `T${index + 2}`,
        date: dateValue || date.toISOString(),
        breakfast: '',
        lunch: '',
        snack: '',
      } as MenuDay);

    if (item.breakfast || item.Breakfast || item.lunch || item.Lunch || item.snack || item.Snack) {
      existing.breakfast = item.breakfast ?? item.Breakfast ?? existing.breakfast;
      existing.lunch = item.lunch ?? item.Lunch ?? existing.lunch;
      existing.snack = item.snack ?? item.Snack ?? existing.snack;
      grouped.set(key, existing);
      return;
    }

    const slot = normalizeMealType(item.MealType ?? item.mealType);
    const content = item.MenuContent ?? item.menuContent ?? '';

    if (slot === 'breakfast') existing.breakfast = existing.breakfast ? `${existing.breakfast}; ${content}` : content;
    if (slot === 'lunch') existing.lunch = existing.lunch ? `${existing.lunch}; ${content}` : content;
    if (slot === 'snack') existing.snack = existing.snack ? `${existing.snack}; ${content}` : content;

    grouped.set(key, existing);
  });

  return Array.from(grouped.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const menuService = {
  getForClass: async (classId: number) => {
    // Swagger: GET /api/menus/by-class/{classId}
    // BASE_URL already includes `/api`, so prefer `/menus/by-class/{classId}`.
    const endpoints = [`/Menus/by-class/${classId}`, `/menus/by-class/${classId}`, `/Menus`, `/menus`];

    let lastError: any;
    for (const url of endpoints) {
      try {
        console.log('[menu] Trying endpoint:', url);
        const response = await axiosClient.get(url);
        console.log('[menu] Response:', response.data);
        const raw = extractArray<MenuApiItem>(response.data);
        const scoped = url.toLowerCase().includes('by-class')
          ? raw
          : raw.filter((item) => Number(item.ClassId ?? item.classId ?? 0) === classId);
        const normalized = normalizeMenuDays(scoped);
        if (normalized.length > 0 || url.toLowerCase().includes('by-class')) {
          return normalized;
        }
      } catch (err: any) {
        console.log('[menu] Endpoint failed:', url, err?.response?.status);
        lastError = err;
        continue;
      }
    }

    throw lastError;
  },
  getById: async (id: number) => {
    const response = await axiosClient.get(`/menus/${id}`);
    return extractObject<MenuApiItem>(response.data);
  },
  create: async (data: Omit<Menu, 'id'>) => {
    const response = await axiosClient.post('/menus', data);
    return response.data;
  },
  update: async (id: number, data: Partial<Menu>) => {
    const response = await axiosClient.put(`/menus/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await axiosClient.delete(`/menus/${id}`);
    return response.data;
  },
};
