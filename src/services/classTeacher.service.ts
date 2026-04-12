import axiosClient from '../api/axiosClient';
import { extractArray, extractObject } from '../utils/normalization';

type TeacherAccount = {
  id?: number;
  userId?: number;
  teacherId?: number;
  TeacherId?: number;
  classId?: number;
  ClassId?: number;
  className?: string;
  ClassName?: string;
  [key: string]: unknown;
};

type TeacherClassInfo = {
  teacherId?: number;
  classId?: number;
  className?: string;
};

const getNumericId = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const extractClassName = (...values: any[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (value && typeof value === 'object') {
      const name = extractClassName(value.className, value.ClassName, value.name, value.Name);
      if (name) return name;
    }
  }
  return '';
};

const extractClassInfo = (payload: any): TeacherClassInfo | null => {
  const source = extractObject<any>(payload);
  if (!source) return null;

  // Handle AssignedClasses array from backend (both PascalCase and camelCase)
  const assignedClasses = source.AssignedClasses || source.assignedClasses;
  if (assignedClasses && Array.isArray(assignedClasses) && assignedClasses.length > 0) {
    const firstClass = assignedClasses[0];
    const classId = getNumericId(firstClass.classId ?? firstClass.ClassId);
    const className = firstClass.className ?? firstClass.ClassName;
    if (classId || className) {
      return {
        teacherId: getNumericId(source.teacherId ?? source.TeacherId ?? source.userId ?? source.id) ?? undefined,
        classId: classId ?? undefined,
        className,
      };
    }
  }

  const directClass =
    source.currentClass ??
    source.CurrentClass ??
    source.class ??
    source.Class ??
    source.assignedClass ??
    source.AssignedClass ??
    source.teachingClass ??
    source.TeachingClass ??
    source.teacherClass ??
    source.TeacherClass ??
    source.classTeacher ??
    source.ClassTeacher ??
    source.classInfo ??
    source.ClassInfo ??
    source.classes?.[0] ??
    source.Classes?.[0] ??
    source.teacherClasses?.[0] ??
    source.TeacherClasses?.[0] ??
    source.classTeachers?.[0] ??
    source.ClassTeachers?.[0];
  const classId =
    getNumericId(source.classId) ??
    getNumericId(source.ClassId) ??
    getNumericId(source.currentClassId) ??
    getNumericId(source.CurrentClassId) ??
    getNumericId(directClass?.id) ??
    getNumericId(directClass?.classId) ??
    getNumericId(directClass?.ClassId) ??
    null;

  const className =
    extractClassName(
      source.className,
      source.ClassName,
      source.currentClassName,
      source.CurrentClassName,
      source.name,
      source.Name,
      directClass?.className,
      directClass?.ClassName,
      directClass?.name,
      directClass?.Name
    ) || undefined;

  if (classId || className) {
    return {
      teacherId: getNumericId(source.teacherId ?? source.TeacherId ?? source.userId ?? source.id) ?? undefined,
      classId: classId ?? undefined,
      className,
    };
  }

  return null;
};

const collectTeacherIds = (account?: TeacherAccount | null) => {
  if (!account) return [];
  return [account.teacherId, account.TeacherId, account.userId, account.id]
    .map(getNumericId)
    .filter((value): value is number => value !== null);
};

export const classTeacherService = {
  getPrimaryForAccount: async (account?: TeacherAccount | null) => {
    if (!account) return null;

    const acc = account as any;
    const teacherName = acc.fullName || acc.FullName || acc.teacherName || acc.TeacherName || acc.username || '';
    const directClassId = getNumericId(acc.classId ?? acc.ClassId);
    const directClassName = extractClassName(
      acc.className,
      acc.ClassName,
      acc.currentClass,
      acc.CurrentClass,
      acc.assignedClass,
      acc.AssignedClass,
      acc.teachingClass,
      acc.TeachingClass
    );

    if (directClassId || directClassName) {
      return {
        teacherId: getNumericId(acc.teacherId ?? acc.TeacherId ?? acc.userId ?? acc.id) ?? undefined,
        classId: directClassId || undefined,
        className: directClassName || undefined,
      };
    }

    const teacherIds = collectTeacherIds(account);
    for (const teacherId of teacherIds) {
      try {
        // Try 1: Direct teacher record lookup (Teacher table)
        const response = await axiosClient.get(`/Teacher/${teacherId}`);
        const info = extractClassInfo(response.data);
        if (info?.classId) return info;
      } catch (err: any) {
        if (err?.response?.status === 403 || err?.response?.status === 401) {
          if (__DEV__) console.log('[classTeacher] Access forbidden for teacherId:', teacherId);
        } else {
          if (__DEV__) console.warn('[classTeacher] Lookup failed for teacherId:', teacherId, err);
        }
      }
    }

    // Fallback 2: Search by name
    if (typeof teacherName === 'string' && teacherName.length > 2) {
      try {
        const response = await axiosClient.get('/Teacher/search', { params: { keyword: teacherName } });
        const searchResults = extractArray<any>(response.data);
        if (searchResults.length > 0) {
          const match = searchResults.find(t => (t.fullName || t.FullName || '').toLowerCase() === (teacherName as string).toLowerCase()) || searchResults[0];
          const foundId = match.teacherId ?? match.TeacherId ?? match.id;
          if (foundId) {
            const directResp = await axiosClient.get(`/Teacher/${foundId}`);
            const directInfo = extractClassInfo(directResp.data);
            if (directInfo?.classId) return directInfo;

            const matchInfo = extractClassInfo(match);
            if (matchInfo?.classId) return matchInfo;
          }
        }
      } catch (err: any) {
        if (err?.response?.status === 403 || err?.response?.status === 401) {
          if (__DEV__) console.log('[classTeacher] Name search forbidden for:', teacherName);
        } else {
          if (__DEV__) console.warn('[classTeacher] Name search failed for:', teacherName, err);
        }
      }
    }

    return null;
  },
};
