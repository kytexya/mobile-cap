import axiosClient from '../api/axiosClient';
import { extractArray, extractObject } from '../utils/normalization';

export interface Student {
  id: number;
  studentId?: number;
  StudentId?: number;
  studentCode?: string;
  fullName: string;
  FullName?: string;
  dateOfBirth?: string;
  DateOfBirth?: string;
  age?: number;
  Age?: number;
  gender?: string;
  Gender?: string;
  photo?: string;
  Photo?: string;
  classId?: number;
  ClassId?: number;
  className?: string;
  ClassName?: string;
  currentClass?: string;
  CurrentClass?: string;
  parentId?: number;
  ParentId?: number;
}

type LinkedAccount = {
  id?: number;
  userId?: number;
  parentId?: number;
  ParentId?: number;
  studentId?: number;
  StudentId?: number;
  fullName?: string;
  FullName?: string;
  classId?: number;
  ClassId?: number;
  className?: string;
  ClassName?: string;
  currentClass?: string;
  CurrentClass?: string | {
    id?: number;
    classId?: number;
    name?: string;
    className?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type StudentApiModel = {
  StudentId?: number;
  ID?: number;
  Id?: number;
  studentID?: number;
  StudentID?: number;
  StudentCode?: string;
  FullName?: string;
  StudentName?: string;
  DateOfBirth?: string;
  Age?: number;
  Gender?: string;
  Photo?: string;
  ClassId?: number | null;
  ClassName?: string;
  CurrentClass?: string | {
    id?: number;
    classId?: number;
    name?: string;
    className?: string;
    [key: string]: unknown;
  };
  ParentId?: number | null;
  studentId?: number;
  studentCode?: string;
  fullName?: string;
  studentName?: string;
  dateOfBirth?: string;
  age?: number;
  gender?: string;
  photo?: string;
  classId?: number | null;
  className?: string;
  currentClass?: string | {
    id?: number;
    classId?: number;
    name?: string;
    className?: string;
    [key: string]: unknown;
  };
  parentId?: number | null;
  student?: StudentApiModel;
  Student?: StudentApiModel;
  class?: {
    id?: number;
    classId?: number;
    name?: string;
    className?: string;
    [key: string]: unknown;
  };
  Class?: {
    id?: number;
    classId?: number;
    name?: string;
    className?: string;
    [key: string]: unknown;
  };

  assignedClass?: {
    id?: number;
    classId?: number;
    name?: string;
    className?: string;
    [key: string]: unknown;
  };
  AssignedClass?: {
    id?: number;
    classId?: number;
    name?: string;
    className?: string;
    [key: string]: unknown;
  };
  teachingClass?: {
    id?: number;
    classId?: number;
    name?: string;
    className?: string;
    [key: string]: unknown;
  };
  TeachingClass?: {
    id?: number;
    classId?: number;
    name?: string;
    className?: string;
    [key: string]: unknown;
  };
};

type StudentClassInfo = {
  classId?: number;
  className?: string;
  currentClass?: string;
};

const hasPositiveNumericField = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
};

const hasStudentSignals = (item: StudentApiModel) => {
  const classInfo = extractClassInfo(item);
  return Boolean(
    extractStudentId(item) ||
    item.StudentCode ||
    item.studentCode ||
    item.DateOfBirth ||
    item.dateOfBirth ||
    item.Age ||
    item.age ||
    item.Gender ||
    item.gender ||
    item.Photo ||
    item.photo ||
    classInfo.classId ||
    classInfo.className ||
    (item as any).healthNote ||
    (item as any).HealthNote ||
    (item as any).bloodType ||
    (item as any).BloodType
  );
};

const hasParentSignals = (item: StudentApiModel) =>
  Boolean(
    (item as any).occupation ||
    (item as any).Occupation ||
    (item as any).workAddress ||
    (item as any).WorkAddress ||
    (item as any).emergencyContact ||
    (item as any).EmergencyContact ||
    (item as any).relationship ||
    (item as any).Relationship
  );

const isLikelyStudentRecord = (item: StudentApiModel) => {
  const normalized = pickStudentShape(item);
  if (!normalized || typeof normalized !== 'object') {
    return false;
  }

  if (hasParentSignals(normalized) && !hasStudentSignals(normalized)) {
    return false;
  }

  return Boolean(
    hasPositiveNumericField(extractStudentId(normalized)) ||
    normalized.StudentCode ||
    normalized.studentCode ||
    normalized.FullName ||
    normalized.fullName ||
    normalized.DateOfBirth ||
    normalized.dateOfBirth ||
    normalized.Gender ||
    normalized.gender ||
    normalized.Photo ||
    normalized.photo ||
    extractClassInfo(normalized).classId ||
    extractClassInfo(normalized).className
  );
};

const findPositiveNumberByKey = (
  input: any,
  predicates: Array<(key: string) => boolean>,
  depth = 0,
  visited = new Set<any>()
): number | null => {
  if (!input || typeof input !== 'object' || depth > 5 || visited.has(input)) {
    return null;
  }

  visited.add(input);

  if (Array.isArray(input)) {
    for (const item of input) {
      const value = findPositiveNumberByKey(item, predicates, depth + 1, visited);
      if (value) return value;
    }
    return null;
  }

  const entries = Object.entries(input);
  for (const [key, value] of entries) {
    if (predicates.some((predicate) => predicate(key))) {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) {
        return numeric;
      }
    }
  }

  for (const [, value] of entries) {
    const numeric = findPositiveNumberByKey(value, predicates, depth + 1, visited);
    if (numeric) return numeric;
  }

  return null;
};

const extractStudentId = (item: StudentApiModel) =>
  findPositiveNumberByKey(
    item,
    [
      (key) => /student.*id/i.test(key),
      (key) => /studentid/i.test(key),
      (key) => /student_id/i.test(key),
      (key) => /^id$/i.test(key),
      (key) => /^student$/i.test(key),
    ]
  );

const extractClassNameFromAny = (...values: any[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (value && typeof value === 'object') {
      const nested: string = extractClassNameFromAny(
        value.className,
        value.ClassName,
        value.name,
        value.Name,
        value.title,
        value.Title,
        value.displayName,
        value.DisplayName
      );
      if (nested) {
        return nested;
      }
    }
  }
  return '';
};

const extractClassInfo = (item: StudentApiModel) => {
  const nestedClass =
    item.class ??
    item.Class ??
    item.currentClass ??
    item.CurrentClass ??
    item.assignedClass ??
    item.AssignedClass ??
    item.teachingClass ??
    item.TeachingClass;

  const classId =
    findPositiveNumberByKey(
      item,
      [
        (key) => /class.*id/i.test(key),
        (key) => /classid/i.test(key),
        (key) => /class_id/i.test(key),
      ]
    ) ??
    findPositiveNumberByKey(
      nestedClass,
      [
        (key) => /class.*id/i.test(key),
        (key) => /classid/i.test(key),
        (key) => /class_id/i.test(key),
      ]
    ) ??
    null;

  const className = [
    extractClassNameFromAny(item.ClassName, item.className),
    extractClassNameFromAny((item as any).CurrentClass, (item as any).currentClass),
    typeof nestedClass === 'object' && nestedClass ? (nestedClass as any).className : undefined,
    typeof nestedClass === 'object' && nestedClass ? (nestedClass as any).name : undefined,
  ].find((value) => typeof value === 'string' && value.trim()) as string | undefined;

  return {
    classId: classId ?? undefined,
    className,
    currentClass: className,
  };
};

const unwrapClassPayload = (payload: any, depth = 0, visited = new Set<any>()): any => {
  if (!payload || depth > 5 || visited.has(payload)) {
    return payload;
  }

  visited.add(payload);

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const nested = unwrapClassPayload(item, depth + 1, visited);
      if (nested) return nested;
    }
    return payload;
  }

  if (typeof payload === 'object') {
    const directClass =
      payload.class ??
      payload.Class ??
      payload.currentClass ??
      payload.CurrentClass ??
      payload.assignedClass ??
      payload.AssignedClass ??
      payload.teachingClass ??
      payload.TeachingClass;

    if (directClass && typeof directClass === 'object') {
      return directClass;
    }

    const candidates = [
      payload.data,
      payload.value,
      payload.result,
      payload.payload,
      payload.items,
      payload.records,
      payload.student,
      payload.Student,
    ];

    for (const candidate of candidates) {
      const nested = unwrapClassPayload(candidate, depth + 1, visited);
      if (nested) {
        if (nested !== candidate) {
          return nested;
        }
        if (typeof nested === 'object' && !Array.isArray(nested)) {
          return nested;
        }
      }
    }
  }

  return payload;
};

const extractClassInfoFromAny = (payload: any): StudentClassInfo => {
  const classInfo = extractObject<any>(payload);
  if (!classInfo) return {};

  const classId =
    Number(
      classInfo?.classId ??
      classInfo?.ClassId ??
      classInfo?.id ??
      (classInfo?.Class ? (classInfo.Class.id ?? classInfo.Class.classId) : undefined) ??
      classInfo?.currentClassId ??
      classInfo?.CurrentClassId
    );
  const className = extractClassNameFromAny(
    classInfo?.className,
    classInfo?.ClassName,
    classInfo?.name,
    classInfo?.Name,
    classInfo?.title,
    classInfo?.Title,
    classInfo?.displayName,
    classInfo?.DisplayName
  );

  return {
    classId: Number.isFinite(classId) && classId > 0 ? classId : undefined,
    className: className || undefined,
    currentClass: className || undefined,
  };
};

const pickStudentShape = (item: StudentApiModel): StudentApiModel => {
  const nested = item.student ?? item.Student;
  if (nested && typeof nested === 'object') {
    return {
      ...nested,
      ...item,
    };
  }
  return item;
};

const normalizeStudent = (item: StudentApiModel): Student => ({
  id: Number(extractStudentId(item) ?? item.studentId ?? item.StudentId ?? 0),
  studentId: Number(extractStudentId(item) ?? item.studentId ?? item.StudentId ?? 0) || undefined,
  studentCode: item.StudentCode ?? item.studentCode ?? item.studentCode,
  fullName: item.FullName ?? item.fullName ?? item.studentName ?? item.StudentName ?? '',
  dateOfBirth: item.DateOfBirth ?? item.dateOfBirth,
  age: item.Age ?? item.age,
  gender: item.Gender ?? item.gender,
  photo: item.Photo ?? item.photo,
  ...extractClassInfo(item),
  parentId: Number(item.ParentId ?? item.parentId ?? 0) || undefined,
});

const enrichStudentClassInfo = async (student: Student): Promise<Student> => {
  if ((student.classId && student.className) || !Number.isFinite(Number(student.id)) || Number(student.id) <= 0) {
    return student;
  }

  const endpoints = [`/ClassStudent/student/${student.id}`];
  for (const url of endpoints) {
    try {
      const response = await axiosClient.get(url);
      const classInfo = extractClassInfoFromAny(response.data);
      if (classInfo.classId || classInfo.className) {
        return {
          ...student,
          classId: classInfo.classId ?? student.classId,
          className: classInfo.className ?? student.className,
          currentClass: classInfo.currentClass ?? student.currentClass,
        };
      }
    } catch (error) {
      if (__DEV__) {
        console.log('[student] class lookup failed:', url, error);
      }
    }
  }

  return student;
};

const extractStudentList = (payload: any, depth = 0): any[] => {
  if (!payload || depth > 4) return [];
  if (Array.isArray(payload)) return payload;

  const candidates = [
    payload.value,
    payload.data,
    payload.result,
    payload.payload,
    payload.items,
    payload.students,
    payload.records,
    payload.data?.items,
    payload.data?.data,
    payload.data?.result,
    payload.data?.payload,
    payload.data?.students,
    payload.data?.records,
  ];

  for (const candidate of candidates) {
    const list = extractStudentList(candidate, depth + 1);
    if (list.length) {
      return list;
    }
  }

  return [];
};

const isValidStudentObject = (obj: any): boolean => {
  if (!obj || typeof obj !== 'object') return false;
  const id = Number(obj.id ?? obj.studentId ?? obj.StudentId ?? obj.ID);
  const fullName = obj.fullName ?? obj.FullName ?? obj.studentName ?? obj.StudentName;
  return Number.isFinite(id) && id > 0 && typeof fullName === 'string' && fullName.trim().length > 0;
};

const normalizeStudents = (response: any): Student[] => {
  // Handle both single object and array responses
  let raw: any[] = [];
  if (Array.isArray(response)) {
    raw = response;
  } else if (response && typeof response === 'object') {
    // Check if it's a valid student object (has id and fullName)
    if (isValidStudentObject(response)) {
      raw = [response];
    } else {
      // Try to extract array from nested structure
      raw = extractArray<any>(response);
    }
  }
  return raw
    .map((item) => pickStudentShape(item))
    .filter((item) => isValidStudentObject(item))
    .map((item) => normalizeStudent(item))
    .filter((item) => Number.isFinite(item.id) && item.id > 0 && item.fullName.trim().length > 0);
};

const getNumericId = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const collectLookupIds = (account?: LinkedAccount | null) => {
  if (!account) return [];

  const candidates = [
    account.parentId,
    account.ParentId,
    account.id,
    account.userId,
  ];

  return candidates
    .map(getNumericId)
    .filter((value): value is number => value !== null);
};

export const studentService = {
  getById: async (studentId: number) => {
    if (!hasPositiveNumericField(studentId)) {
      return null;
    }

    const endpoints = [`/Student/${studentId}`];

    for (const url of endpoints) {
      try {
        const response = await axiosClient.get(url);
        console.log('[student] getById raw response:', JSON.stringify(response.data, null, 2));
        const students = normalizeStudents(response.data);
        if (__DEV__) {
          console.log('[student] getById result', url, 'count:', students.length);
          console.log('[student] getById first normalized', students[0]);
        }
        if (students.length) {
          return students[0];
        }
      } catch (error) {
        if (__DEV__) {
          console.log('[student] getById failed:', url, error);
        }
      }
    }

    return null;
  },
  getByParentId: async (parentId: number) => {
    const endpoints = [
      `/Student/parent/${parentId}`,
      `/StudentParent/parent/${parentId}`,
      `/Parent/student/${parentId}`,
    ];

    for (const url of endpoints) {
      try {
        const response = await axiosClient.get(url);
        const students = normalizeStudents(response.data);
        if (__DEV__) {
          console.log('[student] lookup result', url, 'count:', students.length);
          console.log('[student] first normalized', students[0]);
        }
        if (students.length) {
          return students;
        }
      } catch (error) {
        if (__DEV__) {
          console.log('[student] lookup failed:', url, error);
        }
      }
    }

    return [];
  },
  getPrimaryByParentId: async (parentId: number) => {
    const students = await studentService.getByParentId(parentId);
    const primary = students[0] ?? null;
    return primary ? await enrichStudentClassInfo(primary) : null;
  },
  getPrimaryForAccount: async (account?: LinkedAccount | null) => {
    if (!account) {
      return null;
    }

    const directStudentId = getNumericId(account.studentId ?? account.StudentId);
    if (directStudentId) {
      const directStudent = await studentService.getById(directStudentId);
      if (directStudent) {
        return enrichStudentClassInfo(directStudent);
      }
    }

    const lookupIds = collectLookupIds(account);
    for (const lookupId of lookupIds) {
      const students = await studentService.getByParentId(lookupId);
      if (students.length) {
        return enrichStudentClassInfo(students[0]);
      }
    }

    return null;
  },
  getByClass: async (classId: number) => {
    try {
      const response = await axiosClient.get(`/ClassStudent/class/${classId}`);
      return normalizeStudents(response.data);
    } catch (error) {
      console.warn('[student] getByClass failed', error);
      return [];
    }
  },
};
