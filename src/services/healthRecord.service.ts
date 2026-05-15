import axiosClient from '../api/axiosClient';
import { extractArray } from '../utils/normalization';

export interface HealthRecord {
  id: number;
  studentId: number;
  height?: string | number;
  weight?: string | number;
  bmi?: string | number;
  bloodPressure?: string;
  heartRate?: string | number;
  temperature?: string | number;
  vision?: string;
  hearing?: string;
  dentalStatus?: string;
  notes?: string;
  doctorName?: string;
  checkupDate?: string;
  checkupBatch?: string;
  checkupBatchName?: string;
  checkupStartDate?: string;
  checkupEndDate?: string;
  heightChange?: number | null;
  weightChange?: number | null;
}

export interface HealthRecordBatch {
  batchId: number;
  batchName: string;
  startDate: string;
  endDate: string;
}

const calculateBmi = (height?: string | number, weight?: string | number) => {
  const h = Number(height);
  const w = Number(weight);
  if (!Number.isFinite(h) || !Number.isFinite(w) || h <= 0 || w <= 0) return undefined;
  return (w / Math.pow(h / 100, 2)).toFixed(1);
};

const toMonthBatch = (dateValue?: string) => {
  const date = dateValue ? new Date(dateValue) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const start = new Date(safeDate.getFullYear(), safeDate.getMonth(), 1);
  const end = new Date(safeDate.getFullYear(), safeDate.getMonth() + 1, 0);
  const toYmd = (value: Date) =>
    `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  const month = String(safeDate.getMonth() + 1).padStart(2, '0');
  return {
    id: Number(`${safeDate.getFullYear()}${month}`),
    name: `Đợt khám ${month}/${safeDate.getFullYear()}`,
    startDate: toYmd(start),
    endDate: toYmd(end),
  };
};

const normalizeRecord = (item: any): HealthRecord => {
  const checkupDate = item?.checkDate ?? item?.CheckDate ?? item?.checkupDate ?? item?.CheckupDate ?? item?.date ?? item?.Date;
  const batch = toMonthBatch(checkupDate);
  const height = item?.height ?? item?.Height;
  const weight = item?.weight ?? item?.Weight;

  return {
    id: Number(item?.checkId ?? item?.CheckId ?? item?.id ?? item?.Id ?? item?.healthRecordId ?? 0),
    studentId: Number(item?.studentId ?? item?.StudentId ?? 0),
    height,
    weight,
    bmi: item?.bmi ?? item?.Bmi ?? item?.BMI ?? calculateBmi(height, weight),
    bloodPressure: item?.bloodPressure ?? item?.BloodPressure,
    heartRate: item?.heartRate ?? item?.HeartRate,
    temperature: item?.temperature ?? item?.Temperature,
    vision: item?.eyeSight ?? item?.EyeSight ?? item?.vision ?? item?.Vision,
    hearing: item?.hearing ?? item?.Hearing,
    dentalStatus: item?.dentalStatus ?? item?.DentalStatus,
    notes: item?.note ?? item?.Note ?? item?.notes ?? item?.Notes,
    doctorName: item?.doctorName ?? item?.DoctorName ?? item?.checkedByName ?? item?.CheckedByName,
    checkupDate,
    checkupBatch: String(batch.id),
    checkupBatchName: batch.name,
    checkupStartDate: batch.startDate,
    checkupEndDate: batch.endDate,
  };
};

const withChanges = (records: HealthRecord[]) =>
  records.map((record, index) => {
    const previous = records[index + 1];
    const currentHeight = Number(record.height);
    const previousHeight = Number(previous?.height);
    const currentWeight = Number(record.weight);
    const previousWeight = Number(previous?.weight);
    return {
      ...record,
      heightChange:
        Number.isFinite(currentHeight) && Number.isFinite(previousHeight)
          ? Number((currentHeight - previousHeight).toFixed(1))
          : null,
      weightChange:
        Number.isFinite(currentWeight) && Number.isFinite(previousWeight)
          ? Number((currentWeight - previousWeight).toFixed(1))
          : null,
    };
  });

export const healthRecordService = {
  async getByStudent(studentId: number): Promise<HealthRecord[]> {
    try {
      const res = await axiosClient.get(`/HealthChecks/student/${studentId}`);
      const records = extractArray(res.data).map(normalizeRecord).sort((a, b) => {
        const da = new Date(a.checkupDate || 0).getTime();
        const db = new Date(b.checkupDate || 0).getTime();
        return db - da;
      });
      return withChanges(records);
    } catch {
      return [];
    }
  },

  async getBatches(studentId?: number): Promise<HealthRecordBatch[]> {
    if (!studentId) return [];
    const records = await this.getByStudent(studentId);
    const unique = new Map<string, HealthRecordBatch>();
    records.forEach((record) => {
      if (!record.checkupBatch || !record.checkupBatchName) return;
      unique.set(record.checkupBatch, {
        batchId: Number(record.checkupBatch),
        batchName: record.checkupBatchName,
        startDate: record.checkupStartDate ?? '',
        endDate: record.checkupEndDate ?? '',
      });
    });
    return [...unique.values()].sort((a, b) => b.batchId - a.batchId);
  },

  async create(data: Partial<HealthRecord>): Promise<any> {
    return axiosClient.post('/HealthChecks', {
      StudentId: data.studentId,
      CheckDate: data.checkupDate,
      Height: data.height,
      Weight: data.weight,
      EyeSight: data.vision,
      DentalStatus: data.dentalStatus,
      Note: data.notes,
    });
  },

  async update(id: number, data: Partial<HealthRecord>): Promise<any> {
    return axiosClient.put(`/HealthChecks/${id}`, {
      StudentId: data.studentId,
      CheckDate: data.checkupDate,
      Height: data.height,
      Weight: data.weight,
      EyeSight: data.vision,
      DentalStatus: data.dentalStatus,
      Note: data.notes,
    });
  },

  async delete(id: number): Promise<any> {
    return axiosClient.delete(`/HealthChecks/${id}`);
  },
};
