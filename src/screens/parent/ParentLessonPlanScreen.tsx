import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, SafeAreaView, ScrollView, RefreshControl } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { ArrowLeft, BookOpen, CalendarDays, Clock, User2, MapPin } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { studentService } from '../../services/student.service';
import { lessonService, LessonPlan } from '../../services/lesson.service';

const dayLabels: Record<number, string> = {
  1: 'Thứ 2',
  2: 'Thứ 3',
  3: 'Thứ 4',
  4: 'Thứ 5',
  5: 'Thứ 6',
  6: 'Thứ 7',
  7: 'Chủ nhật',
};

const ParentLessonPlanScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lessons, setLessons] = useState<LessonPlan[]>([]);
  const [studentName, setStudentName] = useState('');
  const [className, setClassName] = useState('');
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay();
    if (d === 0 || d === 6) return 1;
    return d;
  });

  const weekDays = [1, 2, 3, 4, 5];

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const primaryChild = await studentService.getPrimaryForAccount(user);
      const classId = Number(primaryChild?.classId ?? primaryChild?.ClassId ?? 0);
      setStudentName(primaryChild?.fullName || '');
      setClassName(primaryChild?.className || primaryChild?.currentClass || '');
      if (classId > 0) {
        // Use improved weekly schedule API
        const recs = await lessonService.getWeeklySchedule(classId);
        setLessons(recs);
      }
    } catch (err) {
      console.warn('[ParentLessonPlan] load failed:', err);
    } finally {
      if (!isRefresh) setLoading(false);
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

  const filteredLessons = lessons.filter((lesson) => {
    let dayNum = lesson.dayOfWeek;
    if (!dayNum && lesson.lessonDate) {
      const date = new Date(lesson.lessonDate);
      dayNum = date.getDay();
      if (dayNum === 0) dayNum = 7;
    }
    return dayNum === selectedDay;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Nội dung bài học</Text>
        <Text style={styles.headerSub}>{className ? `${studentName} - ${className}` : `Lớp của ${studentName}`}</Text>
      </View>

      <View style={styles.daySelector}>
        {weekDays.map((d) => (
          <Pressable
            key={d}
            onPress={() => setSelectedDay(d)}
            style={[styles.dayButton, selectedDay === d && styles.activeDayButton]}
          >
            <Text style={[styles.dayButtonText, selectedDay === d && styles.activeDayButtonText]}>
              {dayLabels[d]}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        {filteredLessons.length === 0 ? (
          <View style={styles.emptyState}>
            <BookOpen size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>{loading ? 'Đang tải nội dung...' : 'Chưa có nội dung bài học'}</Text>
            <Text style={styles.emptySub}>Giáo viên chưa cập nhật kế hoạch giảng dạy</Text>
          </View>
        ) : (
          filteredLessons.map((lesson) => (
            <View key={`${lesson.id}-${lesson.dayOfWeek}-${lesson.startTime}`} style={styles.lessonCard}>
              <View style={styles.lessonHeader}>
                <View style={styles.lessonIcon}>
                  <BookOpen size={20} color="#FFFFFF" />
                </View>
                <View style={styles.lessonMeta}>
                  <Text style={styles.lessonTitle}>{lesson.title || 'Tiết học'}</Text>
                  {lesson.subject ? <Text style={styles.lessonSubject}>Tiết {lesson.subject}</Text> : null}
                </View>
              </View>

              <View style={styles.lessonDetails}>
                <View style={styles.detailRow}>
                  <CalendarDays size={14} color="#6B7280" />
                  <Text style={styles.detailText}>
                    {lesson.lessonDate ? new Date(lesson.lessonDate).toLocaleDateString('vi-VN') : dayLabels[selectedDay]}
                  </Text>
                </View>
                {(lesson.startTime || lesson.endTime) && (
                  <View style={styles.detailRow}>
                    <Clock size={14} color="#6B7280" />
                    <Text style={styles.detailText}>{lesson.startTime || '--'} - {lesson.endTime || '--'}</Text>
                  </View>
                )}
                {lesson.room && (
                  <View style={styles.detailRow}>
                    <MapPin size={14} color="#6B7280" />
                    <Text style={styles.detailText}>Phòng {lesson.room}</Text>
                  </View>
                )}
                {lesson.teacherName && (
                  <View style={styles.detailRow}>
                    <User2 size={14} color="#6B7280" />
                    <Text style={styles.detailText}>{lesson.teacherName}</Text>
                  </View>
                )}
              </View>

              <View style={styles.contentBlock}>
                <Text style={styles.contentLabel}>Chi tiết bài học</Text>
                <Text style={styles.contentText}>
                  <Text style={styles.contentMain}>
                    {lesson.content || `Tiết ${lesson.subject || lesson.title}`}
                  </Text>
                  {lesson.objectives && (
                    <>
                      {"\n\n"}
                      <Text style={styles.contentSectionTitle}>🎯 Mục tiêu:</Text>
                      {"\n"}
                      <Text style={styles.contentSectionBody}>{lesson.objectives}</Text>
                    </>
                  )}
                  {lesson.materials && (
                    <>
                      {"\n\n"}
                      <Text style={styles.contentSectionTitle}>📚 Tài liệu & Dụng cụ:</Text>
                      {"\n"}
                      <Text style={styles.contentSectionBody}>{lesson.materials}</Text>
                    </>
                  )}
                </Text>
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
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptySub: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  lessonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  lessonHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 4 },
  lessonIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonMeta: { flex: 1, gap: 4 },
  lessonTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  lessonSubject: { fontSize: 13, color: '#4F46E5', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  lessonDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  contentBlock: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 18, marginTop: 12 },
  contentLabel: { fontSize: 12, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  contentText: { fontSize: 15, color: '#334155', lineHeight: 24 },
  contentMain: { fontWeight: '700', color: '#1E293B' },
  contentSectionTitle: { color: '#4F46E5', fontWeight: '800', fontSize: 14 },
  contentSectionBody: { color: '#475569' },
  daySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginTop: -20,
    marginHorizontal: 16,
    borderRadius: 24,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  dayButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 18,
  },
  activeDayButton: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94A3B8',
  },
  activeDayButtonText: {
    color: '#FFFFFF',
  },
});

export default ParentLessonPlanScreen;
