import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import {
  Bell,
  BookOpen,
  CalendarDays,
  Camera,
  ChevronRight,
  ClipboardList,
  HeartPulse,
  MessageSquareMore,
  Star,
  User2,
  Users,
} from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import AIChatButton from '../../components/AIChatButton';
import axiosClient from '../../api/axiosClient';
import { attendanceService } from '../../services/attendance.service';
import { classActivityService } from '../../services/classActivity.service';
import { announcementService } from '../../services/announcement.service';
import { studentService, Student } from '../../services/student.service';
import { classInfoService, TeacherInClass } from '../../services/classInfo.service';
import { notificationService } from '../../services/notification.service';
import { extractArray } from '../../utils/normalization';

type ActivityPreview = {
  title: string;
  description: string;
  activityDate: string;
  teacherName?: string;
  className?: string;
};

type AnnouncementPreview = {
  title: string;
  content: string;
  publishedDate: string;
};

type ChildInfo = {
  name: string;
  status: string;
  checkIn: string;
  attendanceColor: string;
  className: string;
  room: string;
};

const emptyChildInfo: ChildInfo = {
  name: 'Đang tải thông tin bé',
  status: 'Đang cập nhật',
  checkIn: '--:--',
  attendanceColor: '#64748B',
  className: 'Đang cập nhật',
  room: '',
};

const getNumber = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
};

const getText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const normalizeArray = (response: any) => {
  if (response?.status === 'fulfilled') return normalizeArray(response.value);
  if (response?.status === 'rejected') return [];
  return extractArray(response?.data ?? response);
};

const getDateValue = (value?: string) => {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const formatShortDate = (value?: string) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const formatLongDate = (value?: string) => {
  if (!value) return 'Hôm nay';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Hôm nay';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatTimeDisplay = (timeStr?: string) => {
  if (!timeStr || timeStr === '-') return '--:--';
  const date = new Date(timeStr);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
  return timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '--:--';
};

const resolveClassForStudent = async (student: Student | null) => {
  const studentId = getNumber(student?.studentId, student?.id);
  let classId = getNumber(student?.classId, student?.ClassId);
  let className = getText(student?.className, student?.ClassName, student?.currentClass, student?.CurrentClass);

  if ((!classId || !className) && studentId) {
    try {
      const classStudentRes = await axiosClient.get(`/ClassStudent/student/${studentId}`);
      const classRows = extractArray<any>(classStudentRes.data);
      const latest = [...classRows].sort((a, b) => getDateValue(b?.enrolledAt ?? b?.EnrolledAt) - getDateValue(a?.enrolledAt ?? a?.EnrolledAt))[0];
      classId = classId || getNumber(latest?.classId, latest?.ClassId);
      className = className || getText(latest?.className, latest?.ClassName);
    } catch (error) {
      if (__DEV__) console.warn('[ParentHome] class-student lookup failed:', error);
    }
  }

  let room = '';
  if (classId) {
    const classDetail = await classInfoService.getClassById(classId);
    className = classDetail?.className || className;
    room = classDetail?.room || '';
  }

  return { classId, className, room };
};

const ParentHomeScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestActivity, setLatestActivity] = useState<ActivityPreview | null>(null);
  const [latestAnnouncement, setLatestAnnouncement] = useState<AnnouncementPreview | null>(null);
  const [childInfo, setChildInfo] = useState<ChildInfo>(emptyChildInfo);
  const [teachers, setTeachers] = useState<TeacherInClass[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const accountKey = useMemo(() => [
    user?.id,
    user?.parentId,
    user?.ParentId,
    user?.studentId,
    user?.StudentId,
  ].map((value) => Number(value)).find((value) => Number.isFinite(value) && value > 0), [user]);

  const goToProfileNotifications = () =>
    navigation.getParent?.()?.navigate('ProfileNotifications') ?? navigation.navigate('ProfileNotifications');

  useEffect(() => {
    loadDashboard();
  }, [accountKey]);

  const extractTodayAttendance = (response: any) => {
    const source = Array.isArray(response) ? response : [];
    if (source.length === 0) return null;

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Filter for today's attendance only
    const todayAttendance = source.filter(item => {
      const itemDate = new Date(item?.date ?? item?.attendanceDate ?? item?.createdAt ?? 0);
      const itemDateStr = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}-${String(itemDate.getDate()).padStart(2, '0')}`;
      return itemDateStr === todayStr;
    });

    if (todayAttendance.length === 0) return null;

    // Return the most recent today's attendance
    return [...todayAttendance].sort((a, b) => {
      const timeA = new Date(a?.createdAt ?? a?.checkInTime ?? a?.date ?? 0).getTime();
      const timeB = new Date(b?.createdAt ?? b?.checkInTime ?? b?.date ?? 0).getTime();
      return timeB - timeA;
    })[0] ?? null;
  };

  const loadDashboard = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      if (__DEV__) console.log('[ParentHome] loading dashboard for user:', user?.username, 'accountKey:', accountKey);

      const primaryChild = await studentService.getPrimaryForAccount(user);
      if (__DEV__) console.log('[ParentHome] primaryChild found:', primaryChild?.fullName, 'id:', primaryChild?.id);

      const studentId = getNumber(primaryChild?.studentId, primaryChild?.id);
      const resolvedClass = await resolveClassForStudent(primaryChild);
      const classId = resolvedClass.classId;

      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const fromDate = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`;

      const [attendanceRes, teacherList, activityRes, announcementRes, notifRes] = await Promise.all([
        studentId ? attendanceService.getStudentHistory(studentId, fromDate, today).catch(() => []) : Promise.resolve([]),
        classId ? classInfoService.getTeachersByClass(classId).catch(() => []) : Promise.resolve([]),
        classId ? classActivityService.getByClass(classId).then((value) => ({ status: 'fulfilled', value })).catch((reason) => ({ status: 'rejected', reason })) : Promise.resolve(null),
        classId ? announcementService.getAll({ classId }).then((value) => ({ status: 'fulfilled', value })).catch((reason) => ({ status: 'rejected', reason })) : Promise.resolve(null),
        notificationService.getMyNotifications().catch(() => ({ success: true, data: [] })),
      ]);

      // Count unread notifications
      const notifications = notifRes?.success && Array.isArray(notifRes.data) ? notifRes.data : [];
      const unread = notifications.filter((n: any) => !n.isRead).length;
      setUnreadCount(unread);

      setTeachers(teacherList);

      const latestAttendance = extractTodayAttendance(attendanceRes);
      const attendanceStatus = String(latestAttendance?.status ?? '').toLowerCase();
      const attendanceTime = latestAttendance?.checkInTime || latestAttendance?.checkIn || latestAttendance?.createdAt || null;

      setChildInfo({
        name: primaryChild?.fullName || 'Chưa tìm thấy hồ sơ bé',
        status:
          attendanceStatus === 'present'
            ? 'Đã đến lớp'
            : attendanceStatus === 'late'
              ? 'Đi trễ'
              : attendanceStatus === 'absent'
                ? 'Vắng mặt'
                : 'Đang cập nhật',
        checkIn: formatTimeDisplay(attendanceTime),
        attendanceColor:
          attendanceStatus === 'present'
            ? '#16A34A'
            : attendanceStatus === 'late'
              ? '#F59E0B'
              : attendanceStatus === 'absent'
                ? '#DC2626'
                : '#64748B',
        className: resolvedClass.className || 'Đang cập nhật',
        room: resolvedClass.room,
      });

      const activityData: any[] = activityRes ? normalizeArray(activityRes) : [];
      if (activityData.length) {
        const item = [...activityData].sort((a, b) =>
          getDateValue(b.activityDate || b.createdDate || b.publishedDate) -
          getDateValue(a.activityDate || a.createdDate || a.publishedDate)
        )[0] as any;
        setLatestActivity({
          title: item.title || 'Hoạt động lớp học',
          description: item.description || item.content || 'Đã cập nhật từ giáo viên.',
          activityDate: item.activityDate || item.createdDate || new Date().toISOString(),
          teacherName: item.createdBy || item.teacherName || teacherList[0]?.fullName || 'Giáo viên',
          className: item.className || resolvedClass.className || 'Lớp của bé',
        });
      } else {
        setLatestActivity(null);
      }

      const announcementData: any[] = announcementRes ? normalizeArray(announcementRes) : [];
      if (announcementData.length) {
        const item = [...announcementData].sort((a, b) =>
          getDateValue(b.publishedDate || b.createdDate || b.updatedDate) -
          getDateValue(a.publishedDate || a.createdDate || a.updatedDate)
        )[0] as any;
        setLatestAnnouncement({
          title: item.title || 'Thông báo lớp học',
          content: item.content || 'Đã có thông báo mới từ giáo viên.',
          publishedDate: item.publishedDate || item.createdDate || new Date().toISOString(),
        });
      } else {
        setLatestAnnouncement(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tải trang chủ.');
      setLatestActivity(null);
      setLatestAnnouncement(null);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard(true);
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.greeting}>Chào, {user?.username || 'phụ huynh'}!</Text>
              <Text style={styles.childName}>{childInfo.name}</Text>
              <Text style={styles.childClass} numberOfLines={2}>
                {childInfo.className.startsWith('Lớp') ? childInfo.className : `Lớp: ${childInfo.className}`}
                {childInfo.room ? `  •  Phòng: ${childInfo.room}` : ''}
              </Text>
            </View>
            <Pressable onPress={goToProfileNotifications} style={({ pressed }) => [styles.notificationButton, pressed && styles.pressed]}>
              <Bell size={22} color="#4F46E5" />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          <View style={styles.attendanceCard}>
            <View>
              <Text style={styles.sectionLabel}>Trạng thái hôm nay</Text>
              <Text style={styles.attendanceTime}>Vào lớp: {childInfo.checkIn}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: `${childInfo.attendanceColor}16` }]}>
              <Text style={[styles.statusText, { color: childInfo.attendanceColor }]}>{childInfo.status}</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickGrid}>
          <QuickAction icon={<ClipboardList size={18} color="#155EEF" />} title="Điểm danh" subtitle="Xem lịch sử" onPress={() => navigation.navigate('Attendance')} />
          <QuickAction icon={<Camera size={18} color="#7C3AED" />} title="Hoạt động" subtitle="Cập nhật lớp" onPress={() => navigation.navigate('Activities')} />
          <QuickAction icon={<HeartPulse size={18} color="#EF4444" />} title="Sổ sức khỏe" subtitle="Theo dõi chỉ số" onPress={() => navigation.navigate('ParentHealthRecord')} />
          <QuickAction icon={<Star size={18} color="#F59E0B" />} title="Phiếu bé ngoan" subtitle="Đánh giá hằng ngày" onPress={() => navigation.navigate('ParentEvaluation')} />
          <QuickAction wide icon={<BookOpen size={18} color="#059669" />} title="Bài học" subtitle="Nội dung lớp" onPress={() => navigation.navigate('ParentLessonPlan')} />
        </View>

        {teachers.length > 0 && (
          <>
            <SectionTitle title="Giáo viên cùng dạy" />
            <View style={styles.teacherList}>
              {teachers.map((t) => (
                <View key={t.teacherId} style={styles.teacherRow}>
                  <View style={styles.teacherAvatar}>
                    <Users size={16} color="#4F46E5" />
                  </View>
                  <View style={styles.teacherInfo}>
                    <Text style={styles.teacherName} numberOfLines={1}>{t.fullName}</Text>
                    <Text style={styles.teacherMeta} numberOfLines={1}>
                      {[t.roleInClass || (t.isPrimary ? 'Chủ nhiệm' : 'Giáo viên'), t.specialization, t.email].filter(Boolean).join(' • ')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Đang tải cập nhật của lớp...</Text>
          </View>
        ) : (
          <>
            <SectionTitle title="Cập nhật mới nhất" />
            <InfoPanel
              icon={<User2 size={18} color="#4338CA" />}
              title={latestActivity?.title || 'Chưa có hoạt động mới'}
              subtitle={`${latestActivity?.teacherName || 'Giáo viên'} • ${latestActivity?.className || childInfo.className}`}
              date={formatShortDate(latestActivity?.activityDate)}
              body={latestActivity?.description || 'Nội dung hoạt động sẽ hiển thị khi giáo viên đăng tải.'}
              actionText="Xem tất cả hoạt động"
              onPress={() => navigation.navigate('Activities')}
            />

            <SectionTitle title="Thông báo gần đây" />
            <InfoPanel
              icon={<Bell size={18} color="#B54708" />}
              title={latestAnnouncement?.title || 'Chưa có thông báo mới'}
              subtitle={formatLongDate(latestAnnouncement?.publishedDate)}
              body={latestAnnouncement?.content || 'Thông báo mới sẽ hiển thị ở đây khi nhà trường đăng tải.'}
              actionText="Xem thông báo"
              onPress={goToProfileNotifications}
              tone="warm"
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </>
        )}

        <View style={styles.footerPanel}>
          <MessageSquareMore size={18} color="#475467" />
          <Text style={styles.footerText}>Luôn có thể mở trợ lý AI để hỏi nhanh về lịch học, sức khỏe và cập nhật của bé.</Text>
        </View>
      </ScrollView>

      <AIChatButton onPress={() => navigation.navigate('AIAssistant')} />
    </SafeAreaView>
  );
};

const QuickAction = ({ icon, title, subtitle, onPress, wide }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  wide?: boolean;
}) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.quickCard, wide && styles.quickCardWide, pressed && styles.pressed]}>
    <View style={styles.quickContent}>
      <View style={styles.quickIconWrap}>{icon}</View>
      <View style={styles.quickText}>
        <Text style={styles.quickTitle}>{title}</Text>
        <Text style={styles.quickSubtitle}>{subtitle}</Text>
      </View>
    </View>
  </Pressable>
);

const SectionTitle = ({ title }: { title: string }) => <Text style={styles.sectionTitle}>{title}</Text>;

const InfoPanel = ({ icon, title, subtitle, date, body, actionText, onPress, tone }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  date?: string;
  body: string;
  actionText: string;
  onPress: () => void;
  tone?: 'warm';
}) => (
  <View style={styles.infoPanel}>
    <View style={styles.infoTopRow}>
      <View style={[styles.infoIcon, tone === 'warm' && styles.infoIconWarm]}>{icon}</View>
      <View style={styles.infoMeta}>
        <Text style={styles.infoSubtitle} numberOfLines={1}>{subtitle}</Text>
        <Text style={styles.infoTitle} numberOfLines={2}>{title}</Text>
      </View>
      {date ? <Text style={styles.infoDate}>{date}</Text> : null}
    </View>
    <Text style={styles.infoBody}>{body}</Text>
    <Pressable style={styles.viewMoreRow} onPress={onPress}>
      <Text style={styles.viewMoreText}>{actionText}</Text>
      <ChevronRight size={18} color="#4F46E5" />
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7FB' },
  container: { flex: 1, backgroundColor: '#F5F7FB' },
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 96, gap: 14 },
  heroCard: { borderRadius: 26, backgroundColor: '#111827', padding: 16, gap: 14 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heroTextBlock: { flex: 1, gap: 4 },
  greeting: { color: '#FFFFFF', fontSize: 22, lineHeight: 28, fontWeight: '800' },
  childName: { color: '#E0E7FF', fontSize: 15, fontWeight: '700' },
  childClass: { color: '#A5B4FC', fontSize: 12, lineHeight: 18 },
  notificationButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  attendanceCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  sectionLabel: { color: '#101828', fontSize: 15, fontWeight: '800' },
  attendanceTime: { color: '#667085', fontWeight: '600', marginTop: 4, fontSize: 12 },
  statusPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  statusText: { fontWeight: '800', fontSize: 12 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  quickCardWide: { width: '100%' },
  quickContent: { minHeight: 84, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  quickIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  quickText: { flex: 1, gap: 3 },
  quickTitle: { color: '#101828', fontWeight: '800', fontSize: 14 },
  quickSubtitle: { color: '#667085', fontSize: 12 },
  sectionTitle: { marginTop: 4, color: '#101828', fontSize: 17, fontWeight: '800' },
  teacherList: { gap: 8 },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  teacherAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },
  teacherInfo: { flex: 1, gap: 2 },
  teacherName: { color: '#111827', fontSize: 14, fontWeight: '800' },
  teacherMeta: { color: '#667085', fontSize: 12 },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36, gap: 12 },
  loadingText: { color: '#667085' },
  infoPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    gap: 11,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconWarm: { backgroundColor: '#FFF7ED' },
  infoMeta: { flex: 1, gap: 2 },
  infoSubtitle: { color: '#667085', fontSize: 12, fontWeight: '600' },
  infoTitle: { color: '#101828', fontSize: 16, fontWeight: '800', lineHeight: 21 },
  infoDate: { color: '#667085', fontSize: 12, fontWeight: '700' },
  infoBody: { color: '#475467', lineHeight: 20, fontSize: 13 },
  viewMoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  viewMoreText: { color: '#4F46E5', fontWeight: '800', fontSize: 13 },
  footerPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    padding: 14,
  },
  footerText: { flex: 1, color: '#475467', lineHeight: 19, fontSize: 12 },
  errorText: { color: '#B42318', lineHeight: 20 },
  pressed: { transform: [{ scale: 0.98 }] },
});

export default ParentHomeScreen;
