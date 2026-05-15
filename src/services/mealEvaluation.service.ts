import axiosClient from '../api/axiosClient';

export interface MealEvaluation {
  studentId: number;
  mealType: string;
  eatingLevel: string; // 'All eaten', 'Half eaten', 'Little eaten', 'Not eaten'
  notes?: string;
  imageUrl?: string;
}

export const mealEvaluationService = {
  submitReport: async (classId: number, date: string, evaluations: MealEvaluation[]) => {
    // Call the real /api/daily-reports endpoint for each evaluation
    const results = await Promise.allSettled(
      evaluations.map(async (ev) => {
        const payload = {
          studentId: ev.studentId,
          classId: classId,
          livingData: JSON.stringify({
            mealType: ev.mealType,
            eatingLevel: ev.eatingLevel,
            imageUrl: ev.imageUrl,
            notes: ev.notes
          }),
          educationalData: "",
          status: "Completed",
          createdBy: 0 // Optional / backend handles via token
        };
        return axiosClient.post('/daily-reports', payload);
      })
    );
    return results;
  },

  getTodayMealStatus: async (classId: number, date?: string) => {
    try {
      const response = await axiosClient.get(`/daily-reports/class/${classId}`, {
        params: { date: date || new Date().toISOString().split('T')[0] }
      });
      const reports = response.data || [];

      return reports.map((report: any) => {
        const livingData = typeof report.livingData === 'string' ?
          JSON.parse(report.livingData) : report.livingData || {};

        return {
          studentId: report.studentId,
          status: livingData.eatingLevel === 'All eaten' ? 'ate_well' :
            livingData.eatingLevel === 'Half eaten' ? 'ate_little' :
              livingData.eatingLevel === 'Little eaten' ? 'ate_little' : 'did_not_eat',
          mealType: livingData.mealType || 'lunch',
          notes: livingData.notes || ''
        };
      });
    } catch (error) {
      console.error('[mealEvaluationService] Error getting meal status:', error);
      return [];
    }
  },
  uploadImage: async (imageUri: string) => {
    // If it's already a base64 or remote URL, return it
    if (imageUri.startsWith('data:') || imageUri.startsWith('http')) {
      return imageUri;
    }

    // Simulate upload / fallback to mock since no generic /Upload API exists
    // The previous implementation used an assumed /Uploads endpoint
    return imageUri;
  }
};
