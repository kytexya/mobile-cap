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
