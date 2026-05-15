import axiosClient from '../api/axiosClient';
import { extractArray } from '../utils/normalization';

export interface LessonPlan {
  id: number;
  lessonPlanId?: number;
  classId: number;
  teacherId?: number;
  title: string;
  subject?: string;
  content?: string;
  objectives?: string;
  materials?: string;
  lessonDate?: string;
  startTime?: string;
  endTime?: string;
  teacherName?: string;
  room?: string;
  dayOfWeek?: number;
}

const normalizeLessonPlan = (item: any): LessonPlan => ({
  id: Number(item?.id ?? item?.Id ?? item?.lessonPlanId ?? item?.LessonPlanId ?? 0),
  classId: Number(item?.classId ?? item?.ClassId ?? 0),
  title: String(item?.title ?? item?.Title ?? item?.subject ?? item?.Subject ?? ''),
  subject: item?.subject ?? item?.Subject,
  content: item?.content ?? item?.Content,
  objectives: item?.objectives ?? item?.Objectives,
  materials: item?.materials ?? item?.Materials,
  lessonDate: item?.lessonDate ?? item?.LessonDate ?? item?.date ?? item?.Date,
  startTime: item?.startTime ?? item?.StartTime,
  endTime: item?.endTime ?? item?.EndTime,
  teacherName: item?.teacherName ?? item?.TeacherName,
  room: item?.room ?? item?.Room,
  dayOfWeek: Number(item?.dayOfWeek ?? item?.DayOfWeek ?? 0) || undefined,
});

const normalizeTimetable = (item: any): LessonPlan => {
  const subject = String(item?.subject ?? item?.Subject ?? '');
  return {
    id: Number(item?.timetableId ?? item?.TimetableId ?? item?.id ?? 0),
    lessonPlanId: Number(item?.lessonPlanId ?? item?.LessonPlanId ?? 0),
    classId: Number(item?.classId ?? item?.ClassId ?? 0),
    title: (item?.title ?? item?.Title ?? subject) || 'Tiết học',
    subject,
    content: (item?.content ?? item?.Content) ?? (subject ? `Tiết ${subject}` : 'Nội dung bài học đang được giáo viên cập nhật'),
    objectives: item?.objectives ?? item?.Objectives,
    materials: item?.materials ?? item?.Materials,
    lessonDate: item?.lessonDate ?? item?.LessonDate ?? item?.date ?? item?.Date,
    startTime: item?.startTime ?? item?.StartTime,
    endTime: item?.endTime ?? item?.EndTime,
    teacherName: item?.teacherName ?? item?.TeacherName,
    room: item?.room ?? item?.Room,
    dayOfWeek: Number(item?.dayOfWeek ?? item?.DayOfWeek ?? 0) || undefined,
  };
};

export const lessonService = {
  async getByClassAndRange(classId: number, fromDate: string, toDate: string): Promise<LessonPlan[]> {
    try {
      // Use Timetable API - this is the only schedule API available in backend
      const res = await axiosClient.get(`/Timetable/class/${classId}`);
      return extractArray(res.data)
        .map(normalizeTimetable)
        .filter((lesson) => lesson.id || lesson.subject)
        .sort((a, b) => (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0) || String(a.startTime).localeCompare(String(b.startTime)));
    } catch (error) {
      console.error('[LessonService] Timetable API failed:', error);
      return [];
    }
  },

  async getTodaySchedule(classId: number): Promise<LessonPlan[]> {
    try {
      const today = new Date().getDay();
      if (today === 0) return []; // Sunday

      const res = await axiosClient.get(`/Timetable/class/${classId}`);
      return extractArray(res.data)
        .map(normalizeTimetable)
        .filter((lesson) => (lesson.dayOfWeek ?? 0) === today)
        .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
    } catch (error) {
      console.error('[LessonService] Today schedule failed:', error);
      return [];
    }
  },

  async getWeeklySchedule(classId: number): Promise<LessonPlan[]> {
    try {
      const res = await axiosClient.get(`/Timetable/class/${classId}`);
      return extractArray(res.data)
        .map(normalizeTimetable)
        .filter((lesson) => lesson.id || lesson.subject)
        .sort((a, b) => (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0) || String(a.startTime).localeCompare(String(b.startTime)));
    } catch (error) {
      console.error('[LessonService] Weekly schedule failed:', error);
      return [];
    }
  },

  async getScheduleByDateRange(classId: number, startDate: string, endDate: string): Promise<LessonPlan[]> {
    try {
      const res = await axiosClient.get(`/Timetable/class/${classId}`);
      const allLessons = extractArray(res.data)
        .map(normalizeTimetable)
        .filter((lesson) => lesson.id || lesson.subject)
        .sort((a, b) => (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0) || String(a.startTime).localeCompare(String(b.startTime)));

      // Filter by date range based on dayOfWeek
      const start = new Date(startDate);
      const end = new Date(endDate);
      const filteredLessons: LessonPlan[] = [];

      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0) continue; // Skip Sunday

        const dayLessons = allLessons.filter(lesson => (lesson.dayOfWeek ?? 0) === dayOfWeek);

        // Add lesson date to each filtered lesson
        dayLessons.forEach(lesson => {
          filteredLessons.push({
            ...lesson,
            lessonDate: date.toISOString().split('T')[0]
          });
        });
      }

      return filteredLessons;
    } catch (error) {
      console.error('[LessonService] Date range schedule failed:', error);
      return [];
    }
  },

  async create(data: Partial<LessonPlan>): Promise<any> {
    try {
      const dateObj = new Date((data.lessonDate || new Date().toISOString().split('T')[0]) + 'T00:00:00');
      let dayOfWeek = dateObj.getDay();
      if (dayOfWeek === 0) dayOfWeek = 7;

      const payload = {
        ClassId: Number(data.classId),
        DayOfWeek: dayOfWeek,
        StartTime: data.startTime,
        EndTime: data.endTime,
        Subject: data.subject || data.title,
        Room: data.room || 'Phòng học',
      };
      console.log('[LessonService] create payload:', JSON.stringify(payload, null, 2));

      const response = await axiosClient.post('/Timetable', payload);
      return response;
    } catch (error: any) {
      console.error('[LessonService] Create failed:', error);
      // Handle 403 Forbidden - Admin/Staff role required
      if (error.response?.status === 403) {
        throw new Error('Chỉ có Admin và Staff mới có thể tạo lịch học. Giáo viên chỉ có thể xem lịch học.');
      }
      throw error;
    }
  },

  async update(id: number, data: Partial<LessonPlan>): Promise<any> {
    try {
      const dateObj = new Date((data.lessonDate || new Date().toISOString().split('T')[0]) + 'T00:00:00');
      let dayOfWeek = dateObj.getDay();
      if (dayOfWeek === 0) dayOfWeek = 7;

      const payload = {
        DayOfWeek: dayOfWeek,
        StartTime: data.startTime,
        EndTime: data.endTime,
        Subject: data.subject || data.title,
        TeacherId: Number(data.teacherId),
        Room: data.room || 'Phòng học',
        IsActive: true,
      };

      console.log(`[LessonService] update payload (ID: ${id}):`, JSON.stringify(payload, null, 2));

      const response = await axiosClient.put(`/Timetable/${id}`, payload);
      return response;
    } catch (error: any) {
      console.error('[LessonService] Update failed:', error);
      // Handle 403 Forbidden - Admin/Staff role required
      if (error.response?.status === 403) {
        throw new Error('Chỉ có Admin và Staff mới có thể cập nhật lịch học. Giáo viên chỉ có thể xem lịch học.');
      }
      throw error;
    }
  },

  async delete(id: number): Promise<any> {
    try {
      const response = await axiosClient.delete(`/Timetable/${id}`);
      return response;
    } catch (error: any) {
      console.error('[LessonService] Delete failed:', error);
      // Handle 403 Forbidden - Admin/Staff role required
      if (error.response?.status === 403) {
        throw new Error('Chỉ có Admin và Staff mới có thể xóa lịch học. Giáo viên chỉ có thể xem lịch học.');
      }
      throw error;
    }
  },
};
