import axiosClient from '../api/axiosClient';
import { extractArray, extractObject } from '../utils/normalization';

export interface EvaluationCriterion {
  criterionId: number;
  name: string;
  category: 'academic' | 'nutrition' | 'hygiene' | 'behavior' | 'social' | 'study' | 'eating' | 'sleep' | 'other';
  categoryLabel?: string;
  description?: string;
  ratingType?: 'scale' | 'label' | string;
  sortOrder?: number;
}

export interface StudentEvaluation {
  evaluationId: number;
  studentId: number;
  studentName?: string;
  evaluatedDate: string;
  periodType?: string;
  periodStart?: string;
  periodEnd?: string;
  isGoodStudent?: boolean | null;
  criteria: EvaluationCriterionResult[];
  overallComment?: string;
  teacherName?: string;
  classId?: number;
  className?: string;
  overallAverageScore?: number | null;
}

export interface EvaluationCriterionResult {
  criterionId: number;
  criterionName: string;
  category?: string;
  categoryLabel?: string;
  ratingType?: string;
  score: number;
  ratingLabel?: string;
  comment?: string;
}

const defaultCriteria: EvaluationCriterion[] = [
  {
    criterionId: 1,
    name: 'Học tập',
    category: 'academic',
    categoryLabel: 'Học tập',
    description: 'Tập trung, tích cực tham gia bài học, hoàn thành hoạt động trong lớp',
    ratingType: 'scale',
    sortOrder: 1,
  },
  {
    criterionId: 2,
    name: 'Ăn uống',
    category: 'nutrition',
    categoryLabel: 'Ăn uống',
    description: 'Ăn đủ khẩu phần, tự giác trong giờ ăn, uống đủ nước',
    ratingType: 'scale',
    sortOrder: 2,
  },
  {
    criterionId: 3,
    name: 'Vệ sinh',
    category: 'hygiene',
    categoryLabel: 'Vệ sinh',
    description: 'Rửa tay, giữ quần áo sạch sẽ, biết tự phục vụ vệ sinh cá nhân',
    ratingType: 'scale',
    sortOrder: 3,
  },
  {
    criterionId: 4,
    name: 'Hành vi / Thái độ',
    category: 'behavior',
    categoryLabel: 'Hành vi / Thái độ',
    description: 'Lễ phép, tuân thủ nề nếp, hợp tác với cô và các bạn',
    ratingType: 'scale',
    sortOrder: 4,
  },
  {
    criterionId: 5,
    name: 'Kỹ năng xã hội',
    category: 'social',
    categoryLabel: 'Kỹ năng xã hội',
    description: 'Chia sẻ, giao tiếp, chơi cùng bạn và xử lý tình huống phù hợp',
    ratingType: 'scale',
    sortOrder: 5,
  },
];

const normalizeCriterion = (c: any): EvaluationCriterion => ({
  criterionId: Number(c?.criteriaId ?? c?.CriteriaId ?? c?.criterionId ?? c?.id ?? 0),
  name: String(c?.name ?? c?.Name ?? c?.categoryLabel ?? c?.CategoryLabel ?? ''),
  category: String(c?.category ?? c?.Category ?? 'other') as EvaluationCriterion['category'],
  categoryLabel: c?.categoryLabel ?? c?.CategoryLabel,
  description: c?.description ?? c?.Description,
  ratingType: c?.ratingType ?? c?.RatingType ?? 'scale',
  sortOrder: Number(c?.sortOrder ?? c?.SortOrder ?? 0),
});

const normalizeDetail = (c: any): EvaluationCriterionResult => ({
  criterionId: Number(c?.criteriaId ?? c?.CriteriaId ?? c?.criterionId ?? c?.id ?? 0),
  criterionName: String(c?.criteriaName ?? c?.CriteriaName ?? c?.criterionName ?? c?.name ?? c?.Name ?? ''),
  category: c?.category ?? c?.Category,
  categoryLabel: c?.categoryLabel ?? c?.CategoryLabel,
  ratingType: c?.ratingType ?? c?.RatingType,
  score: Number(c?.score ?? c?.Score ?? 0),
  ratingLabel: c?.ratingLabel ?? c?.RatingLabel,
  comment: c?.comment ?? c?.Comment,
});

const normalizeEvaluation = (e: any): StudentEvaluation => {
  const categoryGroups = extractArray<any>(e?.categoryGroups ?? e?.CategoryGroups);
  const detailList = categoryGroups.length
    ? categoryGroups.flatMap((group: any) =>
      extractArray<any>(group?.details ?? group?.Details).map((detail) => ({
        ...detail,
        category: detail?.category ?? detail?.Category ?? group?.category ?? group?.Category,
        categoryLabel: detail?.categoryLabel ?? detail?.CategoryLabel ?? group?.categoryLabel ?? group?.CategoryLabel,
      }))
    )
    : extractArray<any>(e?.criteria ?? e?.Criteria ?? e?.details ?? e?.Details);

  const periodStart = e?.periodStart ?? e?.PeriodStart;
  const periodEnd = e?.periodEnd ?? e?.PeriodEnd;
  const createdAt = e?.createdAt ?? e?.CreatedAt;

  return {
    evaluationId: Number(e?.evaluationId ?? e?.EvaluationId ?? e?.id ?? 0),
    studentId: Number(e?.studentId ?? e?.StudentId ?? 0),
    studentName: e?.studentName ?? e?.StudentName,
    evaluatedDate: String(e?.evaluatedDate ?? e?.EvaluatedDate ?? periodStart ?? createdAt ?? e?.date ?? ''),
    periodType: e?.periodType ?? e?.PeriodType,
    periodStart: periodStart ? String(periodStart) : undefined,
    periodEnd: periodEnd ? String(periodEnd) : undefined,
    isGoodStudent: e?.isGoodStudent ?? e?.IsGoodStudent,
    criteria: detailList.map(normalizeDetail),
    overallComment: e?.overallComment ?? e?.OverallComment ?? e?.generalComment ?? e?.GeneralComment,
    teacherName: e?.teacherName ?? e?.TeacherName ?? e?.evaluatedByName ?? e?.EvaluatedByName,
    classId: Number(e?.classId ?? e?.ClassId ?? 0) || undefined,
    className: e?.className ?? e?.ClassName,
    overallAverageScore: e?.overallAverageScore ?? e?.OverallAverageScore ?? null,
  };
};

const periodBoundsForDate = (dateString?: string) => {
  const date = dateString ? new Date(dateString) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  // For daily evaluations, use the actual date as both start and end
  const toYmd = (value: Date) =>
    `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  return { periodStart: toYmd(safeDate), periodEnd: toYmd(safeDate) };
};

export const evaluationService = {
  async getCriteria(): Promise<EvaluationCriterion[]> {
    try {
      const res = await axiosClient.get('/evaluation-criteria', { params: { activeOnly: true } });
      const criteria = extractArray(res.data).map(normalizeCriterion).filter((item) => item.criterionId > 0);
      return criteria.length
        ? criteria.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        : defaultCriteria;
    } catch {
      return defaultCriteria;
    }
  },

  async getByStudent(studentId: number, fromDate?: string, toDate?: string): Promise<StudentEvaluation[]> {
    try {
      const params: any = {};
      if (fromDate || toDate) params.periodType = 'monthly';
      const res = await axiosClient.get(`/students/${studentId}/evaluations`, { params });
      const summaries = extractArray(res.data).map(normalizeEvaluation);
      const hydrated = await Promise.all(
        summaries.map(async (summary) => {
          if (!summary.evaluationId || summary.criteria.length > 0) return summary;
          try {
            const detail = await axiosClient.get(`/students/${studentId}/evaluations/${summary.evaluationId}`);
            const detailObj = extractObject<any>(detail.data);
            return detailObj ? normalizeEvaluation(detailObj) : summary;
          } catch {
            return summary;
          }
        })
      );

      return hydrated.sort((a, b) => {
        return new Date(b.evaluatedDate || 0).getTime() - new Date(a.evaluatedDate || 0).getTime();
      });
    } catch {
      return [];
    }
  },

  async getByClass(classId: number, date?: string): Promise<StudentEvaluation[]> {
    try {
      const periodStart = date || new Date().toISOString().slice(0, 10);
      const res = await axiosClient.get(`/classes/${classId}/evaluations/summary`, {
        params: { periodType: 'monthly', periodStart },
      });
      return extractArray(res.data).map(normalizeEvaluation).sort((a, b) => {
        return new Date(b.evaluatedDate || 0).getTime() - new Date(a.evaluatedDate || 0).getTime();
      });
    } catch {
      return [];
    }
  },

  async create(data: Partial<StudentEvaluation>): Promise<any> {
    const studentId = Number(data.studentId ?? 0);
    const { periodStart, periodEnd } = periodBoundsForDate(data.evaluatedDate);
    const body = {
      ClassId: data.classId,
      StudentId: studentId,
      EvaluatedDate: data.evaluatedDate || periodStart,
      PeriodType: data.periodType ?? 'monthly',
      PeriodStart: data.periodStart ?? periodStart,
      PeriodEnd: data.periodEnd ?? periodEnd,
      IsGoodStudent: data.isGoodStudent ?? true,
      GeneralComment: data.overallComment || '',
      Details: (data.criteria ?? []).map((item) => ({
        CriteriaId: item.criterionId,
        Score: item.score ?? 0,
        RatingLabel: item.ratingLabel || (item.score && item.score >= 5 ? 'Tốt' : item.score && item.score >= 3 ? 'Đạt' : 'Cần cố gắng'),
        Comment: item.comment ?? '',
      })),
    };
    console.log('[evaluationService] Creating with body:', JSON.stringify(body, null, 2));
    return axiosClient.post(`/students/${studentId}/evaluations`, body);
  },

  async update(id: number, data: Partial<StudentEvaluation>): Promise<any> {
    const studentId = Number(data.studentId ?? 0);
    return axiosClient.put(`/students/${studentId}/evaluations/${id}`, {
      IsGoodStudent: data.isGoodStudent,
      GeneralComment: data.overallComment,
      Details: (data.criteria ?? []).map((item) => ({
        CriteriaId: item.criterionId,
        Score: item.ratingType === 'label' ? null : item.score,
        RatingLabel: item.ratingType === 'label' ? item.ratingLabel : null,
        Comment: item.comment ?? '',
      })),
    });
  },

  async delete(id: number): Promise<any> {
    return axiosClient.delete(`/Evaluation/${id}`);
  },
};
