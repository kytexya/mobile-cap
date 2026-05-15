import axiosClient from '../api/axiosClient';
import { extractArray, extractObject } from '../utils/normalization';

export interface TeacherInClass {
  teacherId: number;
  fullName: string;
  roleInClass?: string;
  isPrimary?: boolean;
  email?: string;
  specialization?: string;
}

export interface ClassInfo {
  id: number;
  className: string;
  room?: string;
  grade?: string;
}

export const classInfoService = {
  async getClassById(id: number): Promise<ClassInfo | null> {
    try {
      const res = await axiosClient.get(`/classes/${id}`);
      const obj = extractObject(res) as any;
      return {
        id: obj?.id ?? obj?.classId ?? obj?.ClassId ?? 0,
        className: obj?.className ?? obj?.ClassName ?? obj?.name ?? '',
        room: obj?.room ?? obj?.Room ?? '',
        grade: obj?.grade ?? obj?.Grade ?? obj?.ageGroup ?? obj?.AgeGroup ?? '',
      };
    } catch {
      return null;
    }
  },

  async getTeachersByClass(classId: number): Promise<TeacherInClass[]> {
    try {
      const res = await axiosClient.get(`/ClassTeacher/class/${classId}`);
      const arr = extractArray(res);
      return arr.map((t: any) => ({
        teacherId: Number(t?.teacherId ?? t?.TeacherId ?? t?.id ?? 0),
        fullName: String(t?.fullName ?? t?.FullName ?? t?.teacherName ?? t?.TeacherName ?? ''),
        roleInClass: String(t?.roleInClass ?? t?.RoleInClass ?? t?.role ?? ''),
        isPrimary: Boolean(t?.isPrimary ?? t?.IsPrimary ?? false),
        email: t?.email ?? t?.Email,
        specialization: t?.specialization ?? t?.Specialization,
      }));
    } catch {
      return [];
    }
  },

  async getCoTeachers(classId: number, currentTeacherId: number): Promise<TeacherInClass[]> {
    const all = await this.getTeachersByClass(classId);
    return all.filter((t) => t.teacherId !== currentTeacherId);
  },
};
