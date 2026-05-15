import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { Text, useTheme, Button, Snackbar } from 'react-native-paper';
import {
  ArrowLeft,
  Star,
  BookOpen,
  Utensils,
  Droplets,
  BedDouble,
  Smile,
  Plus,
  Search,
  Users,
} from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { studentService, Student } from '../../services/student.service';
import { classTeacherService } from '../../services/classTeacher.service';
import {
  evaluationService,
  EvaluationCriterion,
  StudentEvaluation,
} from '../../services/evaluation.service';

const categoryIcons: Record<string, React.ReactNode> = {
  academic: <BookOpen size={16} color="#4F46E5" />,
  study: <BookOpen size={16} color="#4F46E5" />,
  nutrition: <Utensils size={16} color="#10B981" />,
  eating: <Utensils size={16} color="#10B981" />,
  hygiene: <Droplets size={16} color="#3B82F6" />,
  sleep: <BedDouble size={16} color="#8B5CF6" />,
  behavior: <Smile size={16} color="#F59E0B" />,
  social: <Users size={16} color="#8B5CF6" />,
  other: <Star size={16} color="#6B7280" />,
};

const TeacherEvaluationScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>([]);
  const [evaluations, setEvaluations] = useState<StudentEvaluation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [classId, setClassId] = useState<number | null>(null);

  const [scores, setScores] = useState<Record<number, number>>({});
  const [comments, setComments] = useState<Record<number, string>>({});
  const [overallComment, setOverallComment] = useState('');
  const [evalDate, setEvalDate] = useState('');
  const [isGoodStudent, setIsGoodStudent] = useState(true);
  const [ratingLabels, setRatingLabels] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');

  const loadClassAndData = useCallback(async () => {
    try {
      setLoading(true);
      const classInfo = await classTeacherService.getPrimaryForAccount(user);
      const cid = classInfo?.classId ?? 0;
      setClassId(cid || null);
      if (cid) {
        const [studentList, critList] = await Promise.all([
          studentService.getByClass(cid),
          evaluationService.getCriteria(),
        ]);
        setStudents(studentList);
        setCriteria(critList);
        if (studentList.length > 0) {
          setSelectedStudent(studentList[0]);
          const recs = await evaluationService.getByStudent(studentList[0].id);
          setEvaluations(recs);
        }
      }
    } catch (err) {
      console.warn('[TeacherEvaluation] load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadClassAndData();
  }, [loadClassAndData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadClassAndData();
    setRefreshing(false);
  };

  const selectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setEvaluations([]);
    const recs = await evaluationService.getByStudent(student.id);
    setEvaluations(recs);
  };

  const openAdd = () => {
    const today = new Date().toISOString().split('T')[0];
    setEvalDate(today);
    const initScores: Record<number, number> = {};
    const initComments: Record<number, string> = {};
    criteria.forEach((c) => {
      initScores[c.criterionId] = 5;
      initComments[c.criterionId] = '';
    });
    setScores(initScores);
    setComments(initComments);
    setOverallComment('');
    setIsGoodStudent(true);
    setRatingLabels({});
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!selectedStudent || !classId) return;
    const payload: Partial<StudentEvaluation> = {
      studentId: selectedStudent.id,
      classId,
      evaluatedDate: evalDate,
      overallComment,
      isGoodStudent,
      periodType: 'monthly',
      criteria: criteria.map((c) => ({
        criterionId: c.criterionId,
        criterionName: c.name,
        category: c.category,
        categoryLabel: c.categoryLabel,
        ratingType: c.ratingType,
        score: c.ratingType === 'label' ? 0 : (scores[c.criterionId] ?? 5),
        ratingLabel: ratingLabels[c.criterionId] || (c.ratingType === 'label' ? 'Đạt' : undefined),
        comment: comments[c.criterionId] || '',
      })),
    };
    console.log('[TeacherEvaluation] saving payload:', JSON.stringify(payload, null, 2));
    setSaving(true);
    try {
      await evaluationService.create(payload);
      setModalVisible(false);
      if (selectedStudent) {
        const recs = await evaluationService.getByStudent(selectedStudent.id);
        setEvaluations(recs);
      }
      setSnackbarMessage('Đã lưu đánh giá thành công');
      setSnackbarType('success');
      setSnackbarVisible(true);
    } catch (err: any) {
      console.warn('[TeacherEvaluation] save failed:', err);
      const errorData = err?.response?.data;
      console.log('[TeacherEvaluation] error response body:', JSON.stringify(errorData, null, 2));

      let errMsg = 'Lỗi không xác định';
      if (typeof errorData === 'string') errMsg = errorData;
      else if (errorData?.message) errMsg = errorData.message;
      else if (errorData?.errors) errMsg = JSON.stringify(errorData.errors);
      else if (err.message) errMsg = err.message;

      setSnackbarMessage(`Không thể lưu: ${errMsg}`);
      setSnackbarType('error');
      setSnackbarVisible(true);
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter((s) =>
    s.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  // Filter evaluations for today only
  const getTodayEvaluations = () => {
    const todayStr = getTodayString();
    return evaluations.filter(ev => {
      if (!ev.evaluatedDate) return false;
      const evalDate = new Date(ev.evaluatedDate).toISOString().split('T')[0];
      return evalDate === todayStr;
    });
  };

  // Group old evaluations by month
  const getMonthlySummaries = () => {
    const todayStr = getTodayString();
    const oldEvaluations = evaluations.filter(ev => {
      if (!ev.evaluatedDate) return false;
      const evalDate = new Date(ev.evaluatedDate).toISOString().split('T')[0];
      return evalDate !== todayStr;
    });

    const grouped: Record<string, StudentEvaluation[]> = {};
    oldEvaluations.forEach(ev => {
      if (!ev.evaluatedDate) return;
      const date = new Date(ev.evaluatedDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(ev);
    });

    // Sort months in descending order and format month names
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([monthKey, evs]) => {
        const [year, month] = monthKey.split('-');
        const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('vi-VN', {
          month: 'long',
          year: 'numeric'
        });
        return {
          monthKey,
          monthName,
          evaluations: evs.sort((a, b) => new Date(b.evaluatedDate).getTime() - new Date(a.evaluatedDate).getTime()),
          count: evs.length
        };
      });
  };

  const todayEvaluations = getTodayEvaluations();
  const monthlySummaries = getMonthlySummaries();
  const latestEvaluation = todayEvaluations.length > 0 ? todayEvaluations[0] : evaluations[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Phiếu bé ngoan</Text>
        <Text style={styles.headerSub}>Lớp: {user?.className || 'Đang cập nhật'}</Text>
      </View>

      <View style={styles.searchWrap}>
        <Search size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm học sinh..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.studentListContainer}>
        <ScrollView
          style={styles.studentVerticalList}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {filteredStudents.map((s) => {
            const isSelected = selectedStudent?.id === s.id;
            const initial = s.fullName.charAt(0).toUpperCase();

            return (
              <Pressable
                key={s.id}
                style={[styles.studentRow, isSelected && styles.studentRowActive]}
                onPress={() => selectStudent(s)}
              >
                <View style={[styles.avatarMini, isSelected && styles.avatarMiniActive]}>
                  <Text style={[styles.avatarMiniText, isSelected && styles.avatarMiniTextActive]}>
                    {initial}
                  </Text>
                </View>
                <Text style={[styles.studentFullName, isSelected && styles.studentFullNameActive]}>
                  {s.fullName}
                </Text>
                {isSelected && <Star size={16} color="#F59E0B" fill="#F59E0B" />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        <Button mode="contained" icon={() => <Plus size={18} color="#FFFFFF" />} onPress={openAdd} style={styles.addBtn}>
          Thêm đánh giá
        </Button>

        {selectedStudent && todayEvaluations.length > 0 && (
          <View style={styles.latestCard}>
            <View style={styles.latestHeader}>
              <Star size={20} color="#F59E0B" />
              <Text style={styles.latestTitle}>{selectedStudent.fullName} - Hôm nay</Text>
              <Text style={styles.latestDate}>
                {new Date().toLocaleDateString('vi-VN')}
              </Text>
            </View>
            {todayEvaluations.map((evaluation, evalIndex) => (
              <View key={evaluation.evaluationId} style={evalIndex > 0 ? styles.todayEvalSeparator : null}>
                {evalIndex > 0 && <Text style={styles.evalSeparatorText}>Đánh giá #{evalIndex + 1}</Text>}
                <View style={styles.criteriaGrid}>
                  {evaluation.criteria.map((c) => (
                    <View key={c.criterionId} style={styles.criterionCard}>
                      <View style={styles.criterionIcon}>
                        {categoryIcons[c.category || 'other'] || categoryIcons['other']}
                      </View>
                      <Text style={styles.criterionName}>{c.criterionName}</Text>
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={14}
                            color={s <= c.score ? '#F59E0B' : '#E5E7EB'}
                            fill={s <= c.score ? '#F59E0B' : 'transparent'}
                          />
                        ))}
                      </View>
                      {c.comment ? <Text style={styles.criterionComment}>{c.comment}</Text> : null}
                    </View>
                  ))}
                </View>
                {evaluation.overallComment ? (
                  <Text style={styles.overallComment}>Nhận xét: {evaluation.overallComment}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {selectedStudent && todayEvaluations.length === 0 && (
          <View style={styles.noTodayEvalCard}>
            <Star size={20} color="#9CA3AF" />
            <Text style={styles.noTodayEvalTitle}>Chưa có đánh giá hôm nay</Text>
            <Text style={styles.noTodayEvalSub}>Thêm đánh giá đầu tiên cho {selectedStudent.fullName}</Text>
          </View>
        )}

        {monthlySummaries.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Tóm tắt theo tháng</Text>
            {monthlySummaries.map((month) => (
              <View key={month.monthKey} style={styles.monthSummaryCard}>
                <View style={styles.monthSummaryHeader}>
                  <BookOpen size={18} color="#4F46E5" />
                  <Text style={styles.monthSummaryTitle}>{month.monthName}</Text>
                  <Text style={styles.monthSummaryCount}>{month.count} đánh giá</Text>
                </View>
                <View style={styles.monthSummaryContent}>
                  {month.evaluations.slice(0, 2).map((ev, idx) => (
                    <View key={ev.evaluationId} style={styles.monthEvalItem}>
                      <Text style={styles.monthEvalDate}>
                        {new Date(ev.evaluatedDate).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })}
                      </Text>
                      <View style={styles.monthEvalScores}>
                        {ev.criteria.slice(0, 2).map((c) => (
                          <Text key={c.criterionId} style={styles.monthEvalScoreText}>
                            {c.criterionName}: {c.score}/5
                          </Text>
                        ))}
                      </View>
                    </View>
                  ))}
                  {month.count > 2 && (
                    <Text style={styles.moreEvaluationsText}>+{month.count - 2} đánh giá khác</Text>
                  )}
                </View>
              </View>
            ))}
          </>
        )}

        {monthlySummaries.length === 0 && todayEvaluations.length === 0 && (
          <View style={styles.emptyState}>
            <Star size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Chưa có đánh giá</Text>
            <Text style={styles.emptySub}>Thêm đánh giá đầu tiên cho học sinh</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thêm đánh giá - {selectedStudent?.fullName}</Text>
            <ScrollView contentContainerStyle={styles.formContent}>
              <TextInput
                style={styles.input}
                placeholder="Ngày đánh giá (YYYY-MM-DD)"
                value={evalDate}
                onChangeText={setEvalDate}
              />
              {criteria.map((c) => (
                <View key={c.criterionId} style={styles.criterionFormRow}>
                  <View style={styles.criterionFormHeader}>
                    {categoryIcons[c.category] || categoryIcons['other']}
                    <Text style={styles.criterionFormName}>{c.name}</Text>
                  </View>
                  {c.ratingType === 'label' ? (
                    <View style={styles.labelPicker}>
                      {['Cần cố gắng', 'Đạt', 'Tốt'].map((l) => (
                        <Pressable
                          key={l}
                          style={[styles.labelBtn, ratingLabels[c.criterionId] === l && styles.labelBtnActive]}
                          onPress={() => setRatingLabels((p) => ({ ...p, [c.criterionId]: l }))}
                        >
                          <Text style={[styles.labelBtnText, ratingLabels[c.criterionId] === l && styles.labelBtnTextActive]}>
                            {l}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.scorePicker}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Pressable
                          key={s}
                          onPress={() => setScores((p) => ({ ...p, [c.criterionId]: s }))}
                        >
                          <Star
                            size={22}
                            color={s <= (scores[c.criterionId] ?? 5) ? '#F59E0B' : '#E5E7EB'}
                            fill={s <= (scores[c.criterionId] ?? 5) ? '#F59E0B' : 'transparent'}
                          />
                        </Pressable>
                      ))}
                    </View>
                  )}
                  <TextInput
                    style={[styles.input, { marginTop: 6 }]}
                    placeholder={`Nhận xét ${c.name.toLowerCase()}`}
                    value={comments[c.criterionId] || ''}
                    onChangeText={(t) => setComments((p) => ({ ...p, [c.criterionId]: t }))}
                  />
                </View>
              ))}
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Nhận xét chung"
                multiline
                value={overallComment}
                onChangeText={setOverallComment}
              />

              <Pressable
                style={styles.switchRow}
                onPress={() => setIsGoodStudent(!isGoodStudent)}
              >
                <Text style={styles.switchLabel}>Bé ngoan của tháng</Text>
                <View style={[styles.switchTrack, isGoodStudent && styles.switchTrackActive]}>
                  <View style={[styles.switchThumb, isGoodStudent && styles.switchThumbActive]} />
                </View>
              </Pressable>
            </ScrollView>
            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setModalVisible(false)} style={{ flex: 1 }} disabled={saving}>Hủy</Button>
              <Button mode="contained" onPress={handleSave} style={{ flex: 1 }} loading={saving} disabled={saving}>Lưu</Button>
            </View>
          </View>
        </View>
      </Modal>
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={[
          styles.snackbar,
          snackbarType === 'success' ? styles.successSnackbar : styles.errorSnackbar
        ]}
      >
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F6FB' },
  header: {
    backgroundColor: '#1A1F36',
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: { padding: 8, marginBottom: 8, alignSelf: 'flex-start' },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: '#A5B4FC', fontSize: 13, marginTop: 4 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    paddingVertical: 4,
  },
  studentListContainer: {
    maxHeight: 180,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  studentVerticalList: {
    flexGrow: 0,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    marginBottom: 4,
    gap: 12,
  },
  studentRowActive: {
    backgroundColor: '#FFFBEB',
  },
  avatarMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniActive: {
    backgroundColor: '#F59E0B',
  },
  avatarMiniText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
  },
  avatarMiniTextActive: {
    color: '#FFFFFF',
  },
  studentFullName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  studentFullNameActive: {
    color: '#92400E',
    fontWeight: '800',
  },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  addBtn: { marginBottom: 16, borderRadius: 14 },
  latestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  latestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  latestTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#101828',
  },
  latestDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  criteriaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  criterionCard: {
    width: '30%',
    minWidth: 100,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  criterionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  criterionName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  criterionComment: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
  overallComment: {
    marginTop: 12,
    fontSize: 13,
    color: '#475467',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#101828',
    marginBottom: 12,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emptySub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  evalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  evalBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  evalBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  evalInfo: {
    flex: 1,
    gap: 4,
  },
  evalDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#101828',
  },
  evalScores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  evalScoreText: {
    fontSize: 12,
    color: '#475467',
    fontWeight: '500',
  },
  evalComment: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#101828',
    marginBottom: 16,
  },
  formContent: {
    gap: 12,
    paddingBottom: 20,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  criterionFormRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  criterionFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  criterionFormName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  scorePicker: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 16,
    marginTop: 4,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    padding: 2,
  },
  switchTrackActive: {
    backgroundColor: '#10B981',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    transform: [{ translateX: 0 }],
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },
  labelPicker: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  labelBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  labelBtnActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  labelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  labelBtnTextActive: {
    color: '#FFFFFF',
  },
  todayEvalSeparator: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  evalSeparatorText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  noTodayEvalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 8,
  },
  noTodayEvalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6B7280',
  },
  noTodayEvalSub: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  monthSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  monthSummaryTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#101828',
  },
  monthSummaryCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  monthSummaryContent: {
    gap: 8,
  },
  monthEvalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  monthEvalDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
    minWidth: 60,
  },
  monthEvalScores: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthEvalScoreText: {
    fontSize: 11,
    color: '#475467',
    fontWeight: '500',
  },
  moreEvaluationsText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingTop: 4,
  },
  snackbar: {
    borderRadius: 12,
  },
  successSnackbar: {
    backgroundColor: '#10B981',
  },
  errorSnackbar: {
    backgroundColor: '#EF4444',
  },
});

export default TeacherEvaluationScreen;
