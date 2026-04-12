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
};

const weekdayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const normalizeMealType = (value?: string) => {
  const lower = (value || '').toLowerCase();
  if (lower.includes('sang') || lower.includes('break')) return 'breakfast';
  if (lower.includes('trua') || lower.includes('lunch')) return 'lunch';
  if (lower.includes('xe') || lower.includes('snack') || lower.includes('phu') || lower.includes('afternoon')) return 'snack';
  return 'breakfast';
};

const normalizeMenuDays = (response: any): MenuDay[] => {
  const list = extractArray<MenuApiItem>(response);
  const grouped = new Map<string, MenuDay>();

  list.forEach((item, index) => {
    const dateValue = item.MenuDate ?? item.menuDate ?? '';
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

    const slot = normalizeMealType(item.MealType ?? item.mealType);
    const content = item.MenuContent ?? item.menuContent ?? 'Dang cap nhat';

    if (slot === 'breakfast') existing.breakfast = existing.breakfast ? `${existing.breakfast}; ${content}` : content;
    if (slot === 'lunch') existing.lunch = existing.lunch ? `${existing.lunch}; ${content}` : content;
    if (slot === 'snack') existing.snack = existing.snack ? `${existing.snack}; ${content}` : content;

    grouped.set(key, existing);
  });

  return Array.from(grouped.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const menuService = {
  getForClass: async (classId: number, date?: string) => {
    let url = `/menus/by-class/${classId}`;
    if (date) url += `?date=${date}`;
    const response = await axiosClient.get(url);
    return normalizeMenuDays(response.data);
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
