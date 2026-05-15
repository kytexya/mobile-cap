import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, Image, Alert, ActivityIndicator, Pressable } from 'react-native';
import { Text, Card, Button, TextInput, Surface } from 'react-native-paper';
import { Camera, Image as ImageIcon, Send, CheckCircle, Info, Coffee, Utensils, Moon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { mealEvaluationService } from '../../services/mealEvaluation.service';

// Add today's menu display
const TodayMenuDisplay = ({ mealType }: { mealType: string }) => {
  // Default to lunch if no mealType specified
  const displayMealType = mealType || 'lunch';
  const [menu, setMenu] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    const loadMenu = async () => {
      try {
        const classId = Number(user?.classId || user?.currentClassId || 0);
        if (classId) {
          // Get today's menu from backend API
          const response = await fetch(`https://kms-api-gkexamccg9hfbza8.southeastasia-01.azurewebsites.net/api/Menu/class/${classId}?date=${new Date().toISOString().split('T')[0]}`, {
            headers: {
              'Authorization': `Bearer ${user?.token || ''}`,
              'Content-Type': 'application/json'
            }
          });

          const menuData = await response.json();
          setMenu(menuData);
        }
      } catch (error) {
        console.error('[TodayMenuDisplay] Error loading menu:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMenu();
  }, [user?.classId, user?.currentClassId, displayMealType]);

  if (loading) {
    return (
      <View style={menuStyles.menuLoading}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={menuStyles.loadingText}>Đang tải thực đơn...</Text>
      </View>
    );
  }

  const mealData = menu?.items || [];
  const mealIcons = {
    breakfast: <Coffee size={16} color="#8B5CF6" />,
    lunch: <Utensils size={16} color="#059669" />,
    snack: <Moon size={16} color="#7C3AED" />
  };

  return (
    <View style={menuStyles.menuContainer}>
      <View style={menuStyles.menuHeader}>
        {mealIcons[displayMealType as keyof typeof mealIcons]}
        <Text style={menuStyles.menuTitle}>
          {displayMealType === 'breakfast' && 'Bữa sáng'}
          {displayMealType === 'lunch' && 'Bữa trưa'}
          {displayMealType === 'snack' && 'Bữa phụ'}
        </Text>
      </View>
      <View style={menuStyles.menuContent}>
        {mealData.map((item: any, index: number) => (
          <View key={index} style={menuStyles.menuItem}>
            <Text style={menuStyles.itemName}>{item.name}</Text>
            <Text style={menuStyles.itemDesc}>{item.description}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const menuStyles = StyleSheet.create({
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 8,
  },
  menuContent: {
    gap: 8,
  },
  menuItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: 12,
    color: '#6B7280',
  },
  menuLoading: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
});

const TeacherMealEvaluationScreen = ({ route, navigation }: any) => {
  const { student, mealType: initialMealType, onComplete } = route.params;
  const { user } = useAuthStore();

  const [mealType, setMealType] = useState(initialMealType || 'Lunch');
  const [eatingLevel, setEatingLevel] = useState('All eaten');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const mealOptions = [
    { label: 'Sáng', value: 'Breakfast' },
    { label: 'Trưa', value: 'Lunch' },
    { label: 'Xế', value: 'Snack' },
  ];

  const levels = [
    { label: 'Ăn hết', value: 'All eaten', color: '#16A34A' },
    { label: 'Một nửa', value: 'Half eaten', color: '#EAB308' },
    { label: 'Ăn ít', value: 'Little eaten', color: '#F97316' },
    { label: 'Không ăn', value: 'Not eaten', color: '#DC2626' },
  ];


  const submitReport = async () => {
    try {
      setLoading(true);

      // Update meal status using mealEvaluationService
      const date = new Date().toISOString().split('T')[0];
      await mealEvaluationService.submitReport(Number(user?.classId || 1), date, [{
        studentId: student.id || student.studentId,
        mealType,
        eatingLevel,
        notes
      }]);

      setSubmitted(true);
      Alert.alert('Thành công', 'Đã cập nhật tình trạng bữa ăn của bé.', [
        {
          text: 'Xác nhận',
          onPress: () => navigation.goBack()
        }
      ]);
    } catch (error) {
      console.error('[TeacherMealEvaluation] Error submitting report:', error);
      setSubmitted(true);
      setTimeout(() => navigation.goBack(), 1000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Today's Menu Display */}
        <TodayMenuDisplay mealType={mealType} />

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{student.fullName?.charAt(0)}</Text>
          </View>
          <Text style={styles.studentName}>{student.fullName}</Text>
          <Text style={styles.studentId}>Mã học sinh: {student.id}</Text>
        </View>

        <Surface style={styles.mainCard} elevation={1}>
          {/* Meal Selection */}
          <Text style={styles.label}>Bữa ăn hiện tại</Text>
          <View style={styles.segmentedControl}>
            {mealOptions.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => !submitted && setMealType(opt.value)}
                style={[
                  styles.segmentBtn,
                  mealType === opt.value && styles.segmentBtnActive
                ]}
              >
                <Text style={[styles.segmentText, mealType === opt.value && styles.segmentTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Eating Level */}
          <Text style={styles.label}>Mức độ hoàn thành</Text>
          <View style={styles.grid}>
            {levels.map((lvl) => {
              const isSelected = eatingLevel === lvl.value;
              return (
                <Pressable
                  key={lvl.value}
                  onPress={() => !submitted && setEatingLevel(lvl.value)}
                  style={[
                    styles.levelBox,
                    isSelected && { borderColor: lvl.color, backgroundColor: lvl.color + '10' }
                  ]}
                >
                  <Text style={[styles.levelLabel, isSelected && { color: lvl.color, fontWeight: '700' }]}>
                    {lvl.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Notes */}
          <Text style={styles.label}>Ghi chú từ giáo viên</Text>
          <TextInput
            mode="flat"
            placeholder="Nhận xét về thái độ ăn uống của bé..."
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
            disabled={submitted}
            style={styles.textArea}
            underlineColor="transparent"
            activeUnderlineColor="#4F46E5"
          />

        </Surface>

        <Button
          mode="contained"
          onPress={submitReport}
          disabled={submitted || loading}
          loading={loading}
          style={[styles.submitButton, submitted && { backgroundColor: '#10B981' }]}
          contentStyle={{ height: 56 }}
        >
          {submitted ? 'Đã lưu đánh giá' : 'Xác nhận & Gửi'}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 20, paddingBottom: 40 },

  profileHeader: { alignItems: 'center', marginBottom: 24 },
  avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarInitial: { color: '#FFF', fontSize: 28, fontWeight: '800' },
  studentName: { fontSize: 22, fontWeight: '800', color: '#1E293B' },
  studentId: { fontSize: 13, color: '#64748B', marginTop: 4, fontWeight: '500' },

  mainCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 24 },
  label: { fontSize: 15, fontWeight: '700', color: '#334155', marginBottom: 12, marginTop: 16 },

  // Segmented Control
  segmentedControl: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  segmentBtnActive: { backgroundColor: '#FFF', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1 },
  segmentText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  segmentTextActive: { color: '#4F46E5' },

  // Grid Levels
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  levelBox: { flex: 1, minWidth: '45%', paddingVertical: 14, alignItems: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: '#F1F5F9', backgroundColor: '#F8FAFC' },
  levelLabel: { fontSize: 14, fontWeight: '600', color: '#64748B' },

  textArea: { backgroundColor: '#F8FAFC', borderRadius: 12, borderTopLeftRadius: 12, borderTopRightRadius: 12, fontSize: 14 },

  // Image Section
  imageSection: { gap: 12 },
  photoActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, borderRadius: 10, borderColor: '#E2E8F0' },
  placeholderImage: { height: 120, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center', gap: 8 },
  placeholderText: { color: '#94A3B8', fontSize: 13, fontWeight: '500' },
  previewContainer: { height: 200, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  previewImage: { width: '100%', height: '100%' },
  removePhoto: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },

  submitButton: { borderRadius: 16, backgroundColor: '#4F46E5', elevation: 4, shadowColor: '#4F46E5', shadowOpacity: 0.3 }
});

export default TeacherMealEvaluationScreen;