import axiosClient from '../api/axiosClient';
import { extractArray, extractObject } from '../utils/normalization';

export interface AttendanceRecord {
  studentId: number;
  status: string;
  notes?: string;
}

export interface BulkAttendanceRequest {
  classId: number;
  date: string; // ISO string
  records: AttendanceRecord[];
}

export interface AttendanceSheetSummary {
  classId?: number;
  className?: string;
  date?: string;
  isSubmitted?: boolean;
  totalStudents?: number;
  presentCount?: number;
  absentCount?: number;
  lateCount?: number;
  sickCount?: number;
  excusedCount?: number;
  students: any[];
  [key: string]: any;
}

const extractAttendanceItems = (payload: any): any[] => {
  return extractArray<any>(payload);
};

export const parseAttendanceSheet = (response: any): AttendanceSheetSummary => {
  const sheet = extractObject<any>(response) ?? {};
  // Standardize the students array
  const students = extractArray<any>(sheet.students ?? sheet.records ?? sheet.data ?? sheet);

  return {
    ...sheet,
    students,
  };
};

export const attendanceService = {
  getClassSheet: async (classId: number, date?: string) => {
    const url = `/Attendance/class/${classId}${date ? `?date=${date}` : ''}`;
    const response = await axiosClient.get(url);
    return response.data;
  },
  submitBulk: async (data: BulkAttendanceRequest) => {
    const response = await axiosClient.post('/Attendance/bulk', data);
    return response.data;
  },
  getStudentHistory: async (studentId: number, fromDate?: string, toDate?: string) => {
    let url = `/Attendance/student/${studentId}`;
    const params = new URLSearchParams();
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
    
    const response = await axiosClient.get(url);
    return extractAttendanceItems(response.data);
  },
};
