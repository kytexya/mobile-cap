import axiosClient from '../api/axiosClient';
import { extractArray, extractObject } from '../utils/normalization';

export interface Announcement {
  id: number;
  title: string;
  content: string;
  publishedDate: string;
  targetAudience?: string;
  targetClassId?: number | null;
  priority?: string;
  isPublished?: boolean;
  expiresAt?: string | null;
}

type AnnouncementApiModel = {
  AnnouncementId?: number;
  Title?: string;
  Content?: string;
  TargetAudience?: string;
  TargetClassId?: number | null;
  Priority?: string;
  IsPublished?: boolean;
  PublishedAt?: string | null;
  ExpiresAt?: string | null;
  announcementId?: number;
  title?: string;
  content?: string;
  targetAudience?: string;
  targetClassId?: number | null;
  priority?: string;
  isPublished?: boolean;
  publishedAt?: string | null;
  expiresAt?: string | null;
};

const toAnnouncement = (item: AnnouncementApiModel): Announcement => ({
  id: Number(item.AnnouncementId ?? item.announcementId ?? 0),
  title: item.Title ?? item.title ?? '',
  content: item.Content ?? item.content ?? '',
  publishedDate: item.PublishedAt ?? item.publishedAt ?? '',
  targetAudience: item.TargetAudience ?? item.targetAudience ?? undefined,
  targetClassId: item.TargetClassId ?? item.targetClassId ?? null,
  priority: item.Priority ?? item.priority ?? undefined,
  isPublished: item.IsPublished ?? item.isPublished ?? undefined,
  expiresAt: item.ExpiresAt ?? item.expiresAt ?? null,
});

const normalizeAnnouncements = (response: any): Announcement[] => {
  const list = extractArray<AnnouncementApiModel>(response);
  return list.map(toAnnouncement).filter((item) => Number.isFinite(item.id) || item.title.length > 0);
};

const matchesClassId = (item: Announcement, classId?: number) => {
  if (!classId || classId <= 0) return true;
  const targetClassId = Number(item.targetClassId ?? 0);
  if (Number.isFinite(targetClassId) && targetClassId > 0) {
    return targetClassId === classId;
  }
  return true;
};

export const announcementService = {
  getAll: async (params?: { campusId?: number; classId?: number }) => {
    const response = await axiosClient.get('/Announcements', { params });
    const announcements = normalizeAnnouncements(response.data);
    if (params?.classId && params.classId > 0) {
      return announcements.filter((item) => matchesClassId(item, params.classId));
    }
    return announcements;
  },
  getById: async (id: number) => {
    const response = await axiosClient.get(`/Announcements/${id}`);
    const obj = extractObject<AnnouncementApiModel>(response.data);
    return toAnnouncement(obj ?? {});
  },
  create: async (data: {
    title: string;
    content: string;
    targetAudience: string;
    targetClassId?: number | null;
    priority?: string;
    isPublished?: boolean;
  }) => {
    const response = await axiosClient.post('/Announcements', {
      Title: data.title,
      Content: data.content,
      TargetAudience: data.targetAudience,
      TargetClassId: data.targetClassId ?? null,
      Priority: data.priority ?? 'Normal',
      IsPublished: data.isPublished ?? false,
    });
    return response.data;
  },
  update: async (
    id: number,
    data: Partial<{
      title: string;
      content: string;
      targetAudience: string;
      targetClassId: number | null;
      priority: string;
      isPublished: boolean;
    }>
  ) => {
    const response = await axiosClient.put(`/Announcements/${id}`, {
      Title: data.title,
      Content: data.content,
      TargetAudience: data.targetAudience,
      TargetClassId: data.targetClassId ?? null,
      Priority: data.priority,
      IsPublished: data.isPublished,
    });
    return response.data;
  },
  delete: async (id: number) => {
    const response = await axiosClient.delete(`/Announcements/${id}`);
    return response.data;
  },
};
