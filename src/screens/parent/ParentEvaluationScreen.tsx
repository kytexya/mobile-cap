import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, SafeAreaView, ScrollView, RefreshControl } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { ArrowLeft, Star, BookOpen, Utensils, Droplets, Smile, Users, CalendarDays } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { studentService } from '../../services/student.service';
import { evaluationService, StudentEvaluation } from '../../services/evaluation.service';

const categoryIcons: Record<string, React.ReactNode> = {
  academic: <BookOpen size={16} color="#4F46E5" />,
  study: <BookOpen size={16} color="#4F46E5" />,
  nutrition: <Utensils size={16} color="#10B981" />,
  eating: <Utensils size={16} color="#10B981" />,
  hygiene: <Droplets size={16} color="#3B82F6" />,
  behavior: <Smile size={16} color="#F59E0B" />,
  social: <Users size={16} color="#8B5CF6" />,
  other: <Star size={16} color="#6B7280" />,
};

const categoryLabels: Record<string, string> = {
  academic: 'Học tập',
  study: 'Học tập',
  nutrition: 'Ăn uống',
  eating: 'Ăn uống',
  hygiene: 'Vệ sinh',
  behavior: 'Hành vi / Thái độ',
  social: 'Kỹ năng xã hội',
  other: 'Khác',
};

const formatDate = (value?: string) => {
  if (!value) return 'Chưa rõ ngày';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa rõ ngày' : date.toLocaleDateString('vi-VN');
};

const getCriterionLabel = (criterion: any) =>
  criterion.categoryLabel || categoryLabels[criterion.category] || criterion.criterionName || 'Tiêu chí';

const getScoreText = (criterion: any) => {
  if (criterion.ratingLabel) return criterion.ratingLabel;
  if (!criterion.score) return 'Chưa chấm';
  return `${criterion.score}/10`;
};

const ParentEvaluationScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [evaluations, setEvaluations] = useState<StudentEvaluation[]>([]);
  const [studentName, setStudentName] = useState('');

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const primaryChild = await studentService.getPrimaryForAccount(user);
      const sid = Number(primaryChild?.studentId ?? primaryChild?.id ?? 0);
      setStudentName(primaryChild?.fullName || '');
      if (sid > 0) {
        const recs = await evaluationService.getByStudent(sid);
        setEvaluations(recs);
      }
    } catch (err) {
      console.warn('[ParentEvaluation] load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const latestEvaluation = evaluations[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Phiếu bé ngoan</Text>
        <Text style={styles.headerSub}>{studentName}</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        {latestEvaluation && (
          <View style={styles.latestCard}>
            <View style={styles.latestHeader}>
              <Star size={20} color="#F59E0B" />
              <Text style={styles.latestTitle}>Đánh giá gần nhất</Text>
              <Text style={styles.latestDate}>{formatDate(latestEvaluation.evaluatedDate)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryPill}>
                <Text style={styles.summaryLabel}>Xếp loại</Text>
                <Text style={styles.summaryValue}>{latestEvaluation.isGoodStudent ? 'Bé ngoan' : 'Đang theo dõi'}</Text>
              </View>
              <View style={styles.summaryPill}>
                <Text style={styles.summaryLabel}>Điểm TB</Text>
                <Text style={styles.summaryValue}>{latestEvaluation.overallAverageScore ?? '--'}</Text>
              </View>
            </View>
            <View style={styles.criteriaGrid}>
              {latestEvaluation.criteria.map((c) => (
                <View key={`${c.criterionId}-${c.category}`} style={styles.criterionCard}>
                  <View style={styles.criterionHeader}>
                    <View style={styles.criterionIcon}>{categoryIcons[c.category || 'other'] || categoryIcons.other}</View>
                    <View style={styles.criterionTextBlock}>
                      <Text style={styles.criterionCategory}>{getCriterionLabel(c)}</Text>
                      <Text style={styles.criterionName}>{c.criterionName}</Text>
                    </View>
                    <Text style={styles.scoreText}>{getScoreText(c)}</Text>
                  </View>
                  {c.comment ? <Text style={styles.criterionComment}>{c.comment}</Text> : null}
                </View>
              ))}
            </View>
            {latestEvaluation.overallComment ? (
              <Text style={styles.overallComment}>Nhận xét: {latestEvaluation.overallComment}</Text>
            ) : null}
            {latestEvaluation.teacherName ? (
              <Text style={styles.teacherName}>Giáo viên đánh giá: {latestEvaluation.teacherName}</Text>
            ) : null}
          </View>
        )}

        <Text style={styles.sectionTitle}>Lịch sử đánh giá</Text>
        {evaluations.length === 0 ? (
          <View style={styles.emptyState}>
            <CalendarDays size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>{loading ? 'Đang tải đánh giá...' : 'Chưa có đánh giá'}</Text>
            <Text style={styles.emptySub}>Giáo viên chưa cập nhật phiếu bé ngoan</Text>
          </View>
        ) : (
          evaluations.map((ev) => (
            <View key={ev.evaluationId} style={styles.evalRow}>
              <View style={styles.evalBadge}>
                <Text style={styles.evalBadgeText}>{ev.evaluatedDate ? new Date(ev.evaluatedDate).getDate() : '--'}</Text>
              </View>
              <View style={styles.evalInfo}>
                <Text style={styles.evalDate}>{formatDate(ev.evaluatedDate)}</Text>
                <Text style={styles.evalPeriod}>
                  {ev.periodStart && ev.periodEnd ? `${formatDate(ev.periodStart)} - ${formatDate(ev.periodEnd)}` : 'Kỳ đánh giá tháng'}
                </Text>
                <View style={styles.evalScores}>
                  {ev.criteria.slice(0, 3).map((c) => (
                    <Text key={`${ev.evaluationId}-${c.criterionId}`} style={styles.evalScoreText}>
                      {getCriterionLabel(c)}: {getScoreText(c)}
                    </Text>
                  ))}
                </View>
                {ev.overallComment ? <Text style={styles.evalComment}>{ev.overallComment}</Text> : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  latestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  latestHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  latestTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: '#101828' },
  latestDate: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  summaryPill: { flex: 1, backgroundColor: '#FFF7ED', borderRadius: 16, padding: 12 },
  summaryLabel: { color: '#9A3412', fontSize: 11, fontWeight: '600' },
  summaryValue: { color: '#111827', fontSize: 15, fontWeight: '800', marginTop: 2 },
  criteriaGrid: { gap: 10 },
  criterionCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 12, gap: 8 },
  criterionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  criterionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  criterionTextBlock: { flex: 1, gap: 2 },
  criterionCategory: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  criterionName: { fontSize: 12, color: '#64748B' },
  scoreText: { fontSize: 13, fontWeight: '800', color: '#F59E0B' },
  criterionComment: { fontSize: 12, color: '#64748B', lineHeight: 18 },
  overallComment: { marginTop: 12, fontSize: 13, color: '#475467', lineHeight: 20 },
  teacherName: { marginTop: 6, fontSize: 13, color: '#4F46E5', fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#101828', marginBottom: 12, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptySub: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
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
  evalBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  evalInfo: { flex: 1, gap: 4 },
  evalDate: { fontSize: 14, fontWeight: '700', color: '#101828' },
  evalPeriod: { fontSize: 11, color: '#667085' },
  evalScores: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  evalScoreText: { fontSize: 12, color: '#475467', fontWeight: '500' },
  evalComment: { fontSize: 12, color: '#6B7280', fontStyle: 'italic' },
});

export default ParentEvaluationScreen;
