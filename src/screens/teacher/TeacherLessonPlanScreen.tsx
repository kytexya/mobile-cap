import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Text, useTheme, Card, Button, Snackbar, SegmentedButtons } from 'react-native-paper';
import { ArrowLeft, BookOpen, CalendarDays, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { classTeacherService } from '../../services/classTeacher.service';
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

const TeacherLessonPlanScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lessons, setLessons] = useState<LessonPlan[]>([]);
  const [classId, setClassId] = useState<number | null>(null);
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');

  // Date filtering state
  const [filterType, setFilterType] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // Get teacher's primary class
      const primaryClass = await classTeacherService.getPrimaryForAccount(user);
      if (primaryClass) {
        setClassId(primaryClass.classId || 0);
        setTeacherId(primaryClass.teacherId || 0);

        let recs: LessonPlan[] = [];
        const classIdNum = primaryClass.classId || 0;

        if (filterType === 'day') {
          // Get lessons for specific day
          const today = currentDate.toISOString().split('T')[0];
          recs = await lessonService.getScheduleByDateRange(classIdNum, today, today);
        } else if (filterType === 'week') {
          // Get lessons for current week
          const startOfWeek = new Date(currentDate);
          const day = startOfWeek.getDay();
          const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
          startOfWeek.setDate(diff);

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 4);

          const startDate = startOfWeek.toISOString().split('T')[0];
          const endDate = endOfWeek.toISOString().split('T')[0];
          recs = await lessonService.getScheduleByDateRange(classIdNum, startDate, endDate);
        } else if (filterType === 'month') {
          // Get lessons for current month
          const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

          const startDate = startOfMonth.toISOString().split('T')[0];
          const endDate = endOfMonth.toISOString().split('T')[0];
          recs = await lessonService.getScheduleByDateRange(classIdNum, startDate, endDate);
        }

        setLessons(recs);
      }
    } catch (err) {
      console.warn('[TeacherLessonPlan] load failed:', err);
      setSnackbarMessage('Không thể tải lịch học');
      setSnackbarType('error');
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  }, [user, filterType, currentDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);

    if (filterType === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (filterType === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (filterType === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }

    setCurrentDate(newDate);
  };

  const groupLessonsByDay = () => {
    const grouped: { [key: string]: LessonPlan[] } = {};
    lessons.forEach(lesson => {
      const date = lesson.lessonDate || `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(lesson);
    });
    return grouped;
  };

  const groupedLessons = groupLessonsByDay();

  const getFilterLabel = () => {
    if (filterType === 'day') {
      return currentDate.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } else if (filterType === 'week') {
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 4);

      return `Tuần ${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1} - ${endOfWeek.getDate()}/${endOfWeek.getMonth() + 1}`;
    } else {
      return currentDate.toLocaleDateString('vi-VN', {
        month: 'long',
        year: 'numeric'
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={24} color="#4F46E5" />
          </Pressable>
          <Text style={styles.headerTitle}>Lịch học</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Date Filter Controls */}
        <View style={styles.filterContainer}>
          <View style={styles.dateNavigation}>
            <Pressable onPress={() => navigateDate('prev')} style={styles.navButton}>
              <ChevronLeft size={20} color="#4F46E5" />
            </Pressable>
            <Text style={styles.dateLabel}>{getFilterLabel()}</Text>
            <Pressable onPress={() => navigateDate('next')} style={styles.navButton}>
              <ChevronRight size={20} color="#4F46E5" />
            </Pressable>
          </View>

          <SegmentedButtons
            value={filterType}
            onValueChange={(value) => setFilterType(value as 'day' | 'week' | 'month')}
            buttons={[
              { value: 'day', label: 'Ngày' },
              { value: 'week', label: 'Tuần' },
              { value: 'month', label: 'Tháng' },
            ]}
            style={styles.segmentedButtons}
          />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Đang tải lịch học...</Text>
            </View>
          ) : lessons.length === 0 ? (
            <View style={styles.emptyContainer}>
              <BookOpen size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>Chưa có lịch học</Text>
              <Text style={styles.emptyDesc}>Lịch học của lớp sẽ được hiển thị tại đây</Text>
            </View>
          ) : (
            Object.keys(groupedLessons)
              .sort()
              .map(date => (
                <View key={date} style={styles.daySection}>
                  <Text style={styles.dayTitle}>
                    {new Date(date).toLocaleDateString('vi-VN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'numeric'
                    })}
                  </Text>
                  {groupedLessons[date].map((lesson, index) => (
                    <Card key={index} style={styles.lessonCard}>
                      <View style={styles.lessonContent}>
                        <View style={styles.lessonHeader}>
                          <Text style={styles.lessonSubject}>
                            {lesson.subject || lesson.title || 'Bài học'}
                          </Text>
                          <View style={styles.timeBadge}>
                            <Clock size={12} color="#4F46E5" />
                            <Text style={styles.timeText}>
                              {lesson.startTime} - {lesson.endTime}
                            </Text>
                          </View>
                        </View>

                        {lesson.room && (
                          <View style={styles.lessonDetail}>
                            <MapPin size={14} color="#6B7280" />
                            <Text style={styles.detailText}>Phòng: {lesson.room}</Text>
                          </View>
                        )}

                        {lesson.content && (
                          <View style={styles.contentSection}>
                            <Text style={styles.contentLabel}>Nội dung:</Text>
                            <Text style={styles.contentText}>{lesson.content}</Text>
                          </View>
                        )}

                        {lesson.objectives && (
                          <View style={styles.contentSection}>
                            <Text style={styles.contentLabel}>Mục tiêu:</Text>
                            <Text style={styles.contentText}>{lesson.objectives}</Text>
                          </View>
                        )}

                        {lesson.materials && (
                          <View style={styles.contentSection}>
                            <Text style={styles.contentLabel}>Tài liệu:</Text>
                            <Text style={styles.contentText}>{lesson.materials}</Text>
                          </View>
                        )}
                      </View>
                    </Card>
                  ))}
                </View>
              ))
          )}
        </ScrollView>

        {/* Snackbar */}
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          style={[
            styles.snackbar,
            snackbarType === 'error' ? styles.snackbarError : styles.snackbarSuccess,
          ]}
        >
          {snackbarMessage}
        </Snackbar>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  daySection: {
    marginBottom: 24,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  lessonCard: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  lessonContent: {
    padding: 16,
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lessonSubject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeText: {
    fontSize: 12,
    color: '#4F46E5',
    marginLeft: 4,
  },
  lessonDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  contentSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  contentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  contentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  snackbar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 8,
  },
  snackbarSuccess: {
    backgroundColor: '#10B981',
  },
  snackbarError: {
    backgroundColor: '#EF4444',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    flex: 1,
  },
  segmentedButtons: {
    backgroundColor: '#F3F4F6',
  },
});

export default TeacherLessonPlanScreen;
