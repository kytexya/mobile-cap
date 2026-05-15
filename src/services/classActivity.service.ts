import axiosClient from '../api/axiosClient';
import { BASE_URL } from '../constants';
import { extractArray, extractObject } from '../utils/normalization';

export interface ClassActivity {
  id: number;
  classId: number;
  title: string;
  content: string;
  description?: string;
  activityDate: string;
  mediaFiles?: string[];
}

export interface ActivityMedia {
  mediaId: number;
  activityId: number;
  mediaUrl: string;
  mediaType?: string;
  caption?: string;
  uploadedAt?: string;
}

type ClassActivityApiModel = {
  ActivityId?: number;
  ClassId?: number;
  Title?: string;
  Content?: string;
  ActivityDate?: string;
  MediaFiles?: string[];
  mediaFiles?: string[];
  Photos?: string[];
  photos?: string[];
  activityId?: number;
  classId?: number;
  title?: string;
  content?: string;
  activityDate?: string;
  Media?: Array<any>;
  media?: Array<any>;
};

const normalizeDateString = (value?: string) => {
  if (!value) return '';
  return value.includes('T') ? value : `${value}T12:00:00`;
};

const extractMediaUrls = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry;
      }

      if (!entry || typeof entry !== 'object') {
        return '';
      }

      const candidate = entry as Record<string, any>;
      return (
        candidate.mediaUrl ??
        candidate.MediaUrl ??
        candidate.mediaURL ??
        candidate.MediaURL ??
        candidate.url ??
        candidate.Url ??
        candidate.path ??
        candidate.Path ??
        ''
      );
    })
    .map(normalizeMediaUrl)
    .filter(Boolean);
};

const normalizeMediaUrl = (value?: string | null) => {
  if (!value) return '';

  if (value.startsWith('file:')) {
    return '';
  }

  if ((value.startsWith('http://') || value.startsWith('https://')) && value.includes('/photos/')) {
    return value.includes('/api/photos/') ? value : value.replace('/photos/', '/api/photos/');
  }

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:')
  ) {
    return value;
  }

  if (value.startsWith('/')) {
    if (value.startsWith('/photos/') || value.startsWith('/photo/') || value.startsWith('/uploads/')) {
      return `${BASE_URL}${value}`;
    }
    return `${BASE_URL}${value}`;
  }

  if (value.startsWith('uploads/') || value.startsWith('photos/') || value.startsWith('photo/')) {
    return `${BASE_URL}/${value}`;
  }

  if (/\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(value)) {
    return `${BASE_URL}/photos/${value}`;
  }

  return value;
};

const toClassActivity = (item: ClassActivityApiModel): ClassActivity => ({
  id: Number(item.ActivityId ?? item.activityId ?? 0),
  classId: Number(item.ClassId ?? item.classId ?? 0),
  title: item.Title ?? item.title ?? '',
  content: item.Content ?? item.content ?? '',
  description: item.Content ?? item.content ?? '',
  activityDate: normalizeDateString(item.ActivityDate ?? item.activityDate),
  mediaFiles: [
    ...extractMediaUrls(item.MediaFiles ?? item.mediaFiles),
    ...extractMediaUrls(item.Photos ?? item.photos),
    ...extractMediaUrls(item.Media ?? item.media),
  ],
});

const normalizeActivities = (response: any): ClassActivity[] => {
  const list = extractArray<ClassActivityApiModel>(response);
  return list.map(toClassActivity).filter((item) => Number.isFinite(item.id) || item.title.length > 0);
};

const matchesClassId = (item: ClassActivity, classId?: number) => {
  if (!classId || classId <= 0) return true;
  const itemClassId = Number(item.classId ?? 0);
  if (Number.isFinite(itemClassId) && itemClassId > 0) {
    return itemClassId === classId;
  }
  return true;
};

type ActivityMediaApiModel = {
  MediaId?: number;
  ActivityId?: number;
  MediaUrl?: string;
  MediaType?: string;
  Caption?: string;
  UploadedAt?: string;
  mediaId?: number;
  activityId?: number;
  mediaUrl?: string;
  MediaURL?: string;
  mediaURL?: string;
  Url?: string;
  url?: string;
  Path?: string;
  path?: string;
  mediaType?: string;
  caption?: string;
  uploadedAt?: string;
};

const toActivityMedia = (item: ActivityMediaApiModel): ActivityMedia => ({
  mediaId: Number(item.MediaId ?? item.mediaId ?? 0),
  activityId: Number(item.ActivityId ?? item.activityId ?? 0),
  mediaUrl:
    item.MediaUrl ??
    item.mediaUrl ??
    item.MediaURL ??
    item.mediaURL ??
    item.Url ??
    item.url ??
    item.Path ??
    item.path ??
    '',
  mediaType: item.MediaType ?? item.mediaType ?? undefined,
  caption: item.Caption ?? item.caption ?? undefined,
  uploadedAt: item.UploadedAt ?? item.uploadedAt ?? undefined,
});

const normalizeActivityMedia = (response: any): ActivityMedia[] => {
  const list = extractArray<ActivityMediaApiModel>(response);
  return list
    .map(toActivityMedia)
    .filter((item) => Number.isFinite(item.mediaId) || (item.mediaUrl && item.mediaUrl.length > 0));
};

export const classActivityService = {
  getByClass: async (classId: number, date?: string) => {
    let url = `/ClassActivities/class/${classId}`;
    if (date) url += `?date=${date}`;
    const response = await axiosClient.get(url);
    const activities = normalizeActivities(response.data).filter((item) => matchesClassId(item, classId));
    if (!activities.length) {
      return activities;
    }

    const hydrated = await Promise.all(
      activities.map(async (activity) => {
        if (!activity.id) {
          return activity;
        }

        try {
          const media = await classActivityService.getMediaByActivity(activity.id);
          return {
            ...activity,
            mediaFiles: media.map((item) => item.mediaUrl).filter(Boolean),
          };
        } catch {
          return activity;
        }
      })
    );

    return hydrated;
  },
  getById: async (id: number) => {
    const response = await axiosClient.get(`/ClassActivities/${id}`);
    const obj = extractObject<ClassActivityApiModel>(response.data);
    return toClassActivity(obj ?? {});
  },
  create: async (data: Omit<ClassActivity, 'id' | 'description' | 'mediaFiles'> & { content?: string }) => {
    const response = await axiosClient.post('/ClassActivities', {
      ClassId: data.classId,
      Title: data.title,
      Content: data.content,
      ActivityDate: data.activityDate.split('T')[0],
    });
    return response.data;
  },
  getMediaByActivity: async (activityId: number) => {
    const response = await axiosClient.get(`/activity-media/activity/${activityId}`);
    return normalizeActivityMedia(response.data)
      .map((media) => ({
        ...media,
        mediaUrl: normalizeMediaUrl(media.mediaUrl),
      }))
      .filter((media) => media.mediaUrl.length > 0);
  },
  addMedia: async (
    activityId: number,
    data: {
      mediaUrl: string;
      mediaType?: string;
      caption?: string;
    }
  ) => {
    const response = await axiosClient.post(`/activity-media/activity/${activityId}`, {
      ActivityId: activityId,
      MediaUrl: data.mediaUrl,
      MediaType: data.mediaType ?? 'image/jpeg',
      Caption: data.caption ?? null,
    });
    return response.data;
  },
  deleteMedia: async (mediaId: number) => {
    const response = await axiosClient.delete(`/activity-media/${mediaId}`);
    return response.data;
  },
  update: async (id: number, data: Partial<ClassActivity>) => {
    const response = await axiosClient.put(`/ClassActivities/${id}`, {
      ClassId: data.classId,
      Title: data.title,
      Content: data.content ?? data.description,
      ActivityDate: data.activityDate ? data.activityDate.split('T')[0] : undefined,
    });
    return response.data;
  },
  delete: async (id: number) => {
    const response = await axiosClient.delete(`/ClassActivities/${id}`);
    return response.data;
  },
};
