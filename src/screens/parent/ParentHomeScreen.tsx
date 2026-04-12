import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Text, useTheme } from 'react-native-paper';
import { Bell, CalendarDays, Camera, ChevronRight, ClipboardList, MessageSquareMore, User2 } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { attendanceService } from '../../services/attendance.service';
import { classActivityService } from '../../services/classActivity.service';
import { announcementService } from '../../services/announcement.service';
import { studentService } from '../../services/student.service';

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

const ParentHomeScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestActivity, setLatestActivity] = useState<ActivityPreview | null>(null);
  const [latestAnnouncement, setLatestAnnouncement] = useState<AnnouncementPreview | null>(null);
  const [childInfo, setChildInfo] = useState({
    name: 'Thong tin con em dang cap nhat',
    status: 'Dang cap nhat',
    checkIn: '--:--',
    attendanceColor: '#6B7280',
    className: 'Dang cap nhat',
  });
  const goToProfileNotifications = () =>
    navigation.getParent?.()?.navigate('ProfileNotifications') ?? navigation.navigate('ProfileNotifications');

  const accountKey = [
    user?.id,
    user?.parentId,
    user?.ParentId,
    user?.studentId,
    user?.StudentId,
  ]
    .map((value) => Number(value))
    .find((value) => Number.isFinite(value) && value > 0);

  useEffect(() => {
    loadDashboard();
  }, [accountKey, user?.parentId, user?.ParentId, user?.studentId, user?.StudentId]);

  const extractLatestAttendance = (response: any) => {
    // Get the most recent attendance record by date
    const source = Array.isArray(response) ? response : [];
    if (source.length === 0) return null;

    // Sort by date descending (newest first)
    const sorted = [...source].sort((a: any, b: any) => {
      const dateA = new Date(a?.date ?? a?.attendanceDate ?? a?.createdAt ?? 0).getTime();
      const dateB = new Date(b?.date ?? b?.attendanceDate ?? b?.createdAt ?? 0).getTime();
      return dateB - dateA;
    });

    return sorted[0] ?? null;
  };

  // Format time display similar to ParentAttendanceScreen
  const formatTimeDisplay = (timeStr?: string) => {
    if (!timeStr || timeStr === '-') return '--:--';

    // Handle ISO datetime strings (e.g., "2026-04-08T05:49:13.9511010")
    const date = new Date(timeStr);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }

    // Fallback: if it's already a time string like "05:49:13", extract HH:mm
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    }

    return '--:--';
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const primaryChild = await studentService.getPrimaryForAccount(user);
      const classId = Number(primaryChild?.classId ?? primaryChild?.ClassId ?? 0);
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      // Get last 30 days to find the most recent attendance record
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const fromDate = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`;

      const todayAttendanceRes = await attendanceService.getStudentHistory(Number(primaryChild?.studentId ?? primaryChild?.id ?? 0), fromDate, today).catch(() => []);
      const todayAttendance = extractLatestAttendance(todayAttendanceRes);
      const attendanceStatus = String(todayAttendance?.status ?? '').toLowerCase();
      const attendanceTime = todayAttendance?.checkInTime || todayAttendance?.checkIn || todayAttendance?.createdAt || null;

      setChildInfo({
        name: primaryChild?.fullName || 'Thong tin con em dang cap nhat',
        status:
          attendanceStatus === 'present'
            ? 'Da den lop'
            : attendanceStatus === 'late'
              ? 'Di tre'
              : attendanceStatus === 'absent'
                ? 'Vang mat'
                : 'Dang cap nhat',
        checkIn: formatTimeDisplay(attendanceTime),
        attendanceColor:
          attendanceStatus === 'present'
            ? '#16A34A'
            : attendanceStatus === 'late'
              ? '#F59E0B'
              : attendanceStatus === 'absent'
                ? '#DC2626'
                : '#6B7280',
        className:
          primaryChild?.className ||
          primaryChild?.currentClass ||
          (primaryChild as any)?.ClassName ||
          (primaryChild as any)?.currentClassName ||
          'Dang cap nhat',
      });

      let activityRes: PromiseSettledResult<any> | null = null;
      let announcementRes: PromiseSettledResult<any> | null = null;
      if (classId > 0) {
        [activityRes, announcementRes] = await Promise.allSettled([
          classActivityService.getByClass(classId),
          announcementService.getAll({ classId }),
        ]);
      }

      const activityData = activityRes ? normalizeArray(activityRes) : [];
      if (activityData.length) {
        const item = [...activityData].sort(
          (a: any, b: any) =>
            getDateValue(b.activityDate || b.createdDate || b.publishedDate) -
            getDateValue(a.activityDate || a.createdDate || a.publishedDate)
        )[0] as any;
        setLatestActivity({
          title: item.title || 'Hoat dong lop hoc',
          description: item.description || 'Da cap nhat tu giao vien.',
          activityDate: item.activityDate || item.createdDate || new Date().toISOString(),
          teacherName: item.createdBy || item.teacherName || 'Giao vien',
          className: item.className || 'Lop cua be',
        });
      } else {
        setLatestActivity(null);
      }

      const announcementData = announcementRes ? normalizeArray(announcementRes) : [];
      if (announcementData.length) {
        const item = [...announcementData].sort(
          (a: any, b: any) =>
            getDateValue(b.publishedDate || b.createdDate || b.updatedDate) -
            getDateValue(a.publishedDate || a.createdDate || a.updatedDate)
        )[0] as any;
        setLatestAnnouncement({
          title: item.title || 'Thong bao lop hoc',
          content: item.content || 'Da co thong bao moi tu giao vien.',
          publishedDate: item.publishedDate || item.createdDate || new Date().toISOString(),
        });
      } else {
        setLatestAnnouncement(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Khong the tai trang chu.');
      setLatestActivity(null);
      setLatestAnnouncement(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroTextBlock}>
                <Text style={styles.greeting}>Chao, {user?.username || 'tai khoan cua ban'}!</Text>
                <Text style={styles.childName}>{childInfo.name}</Text>
                <Text style={styles.childClass}>Lop: {childInfo.className}</Text>
              </View>
              <Pressable
                onPress={goToProfileNotifications}
                style={({ pressed }) => [styles.notificationButton, pressed && styles.pressed]}
              >
                <Bell size={22} color="#4F46E5" />
              </Pressable>
            </View>

            <View style={styles.attendanceCard}>
              <View style={styles.attendanceHeader}>
                <Text style={styles.sectionLabel}>Trang thai hom nay</Text>
                <CalendarDays size={20} color="#4F46E5" />
              </View>
              <View style={styles.attendanceRow}>
                <Chip style={[styles.attendanceChip, { backgroundColor: `${childInfo.attendanceColor}14` }]}>
                  <Text style={[styles.attendanceChipText, { color: childInfo.attendanceColor }]}>
                    {childInfo.status}
                  </Text>
                </Chip>
                <Text style={styles.attendanceTime}>Vao lop: {childInfo.checkIn}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.quickGrid}>
          <QuickAction
            icon={<ClipboardList size={18} color="#155EEF" />}
            title="Diem danh"
            subtitle="Xem lich su"
            onPress={() => navigation.navigate('Attendance')}
          />
          <QuickAction
            icon={<Camera size={18} color="#7C3AED" />}
            title="Activities"
            subtitle="Cap nhat lop"
            onPress={() => navigation.navigate('Activities')}
          />
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Dang tai cap nhat cua lop...</Text>
          </View>
        ) : (
          <>
            <SectionTitle title="Cap nhat moi nhat" />
            <Card style={styles.activityCard}>
              <Card.Content style={styles.activityContent}>
                <View style={styles.activityTopRow}>
                  <View style={styles.activityIcon}>
                    <User2 size={18} color="#4338CA" />
                  </View>
                  <View style={styles.activityMeta}>
                    <Text style={styles.activityTeacher}>{latestActivity?.teacherName || 'Chua co cap nhat'}</Text>
                    <Text style={styles.activityClass}>{latestActivity?.className || 'Dang cap nhat'}</Text>
                  </View>
                  <Chip compact style={styles.activityDateChip}>
                    {formatShortDate(latestActivity?.activityDate)}
                  </Chip>
                </View>

                <Text style={styles.activityTitle}>{latestActivity?.title || 'Chua co hoat dong moi'}</Text>
                <Text style={styles.activityBody}>
                  {latestActivity?.description || 'He thong se hien thi noi dung khi giao vien dang tai hoat dong.'}
                </Text>

                <Pressable style={styles.viewMoreRow} onPress={() => navigation.navigate('Activities')}>
                  <Text style={styles.viewMoreText}>Xem tat ca hoat dong</Text>
                  <ChevronRight size={18} color="#4F46E5" />
                </Pressable>
              </Card.Content>
            </Card>

            <SectionTitle title="Thong bao gan day" />
            <Card style={styles.noticeCard}>
              <Card.Content style={styles.noticeContent}>
                <View style={styles.noticeRow}>
                  <View style={styles.noticeIcon}>
                    <Bell size={18} color="#B54708" />
                  </View>
                  <View style={styles.noticeMeta}>
                    <Text style={styles.noticeTitle}>{latestAnnouncement?.title || 'Chua co thong bao moi'}</Text>
                    <Text style={styles.noticeDate}>
                      {formatLongDate(latestAnnouncement?.publishedDate)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.noticeBody}>
                  {latestAnnouncement?.content || 'Thong bao moi se hien thi o day khi nha truong dang tai.'}
                </Text>
                <Button
                  mode="outlined"
                  onPress={goToProfileNotifications}
                  style={styles.noticeButton}
                >
                  Xem thong bao
                </Button>
              </Card.Content>
            </Card>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </>
        )}

        <Card style={styles.footerCard}>
          <Card.Content style={styles.footerContent}>
            <MessageSquareMore size={18} color="#475467" />
            <Text style={styles.footerText}>
              Welcome
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const QuickAction = ({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}>
    <Card style={styles.quickCardInner}>
      <Card.Content style={styles.quickContent}>
        <View style={styles.quickIconWrap}>{icon}</View>
        <Text style={styles.quickTitle}>{title}</Text>
        <Text style={styles.quickSubtitle}>{subtitle}</Text>
      </Card.Content>
    </Card>
  </Pressable>
);

const SectionTitle = ({ title }: { title: string }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

const normalizeArray = (response: any) => {
  const data = response?.value ?? response?.data ?? response;
  if (Array.isArray(data)) return data;
  return data ? [data] : [];
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
  if (!value) return 'Hom nay';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Hom nay';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  container: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 96,
    gap: 14,
  },
  heroWrap: {
    gap: 12,
  },
  heroCard: {
    borderRadius: 28,
    backgroundColor: '#111827',
    padding: 16,
    gap: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroTextBlock: {
    flex: 1,
    gap: 4,
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  childName: {
    color: '#C7D2FE',
    fontSize: 15,
    fontWeight: '600',
  },
  childClass: {
    color: '#A5B4FC',
    fontSize: 12,
  },
  notificationButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDE9FE',
  },
  attendanceCard: {
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    padding: 14,
  },
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLabel: {
    color: '#101828',
    fontSize: 16,
    fontWeight: '700',
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  attendanceChip: {
    borderRadius: 999,
  },
  attendanceChipText: {
    fontWeight: '700',
    fontSize: 12,
  },
  attendanceTime: {
    color: '#475467',
    fontWeight: '500',
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickCard: {
    flex: 1,
  },
  quickCardInner: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
  },
  quickContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
    gap: 6,
  },
  quickIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },
  quickTitle: {
    color: '#101828',
    fontWeight: '700',
  },
  quickSubtitle: {
    color: '#667085',
    fontSize: 12,
  },
  sectionTitle: {
    marginTop: 8,
    color: '#101828',
    fontSize: 18,
    fontWeight: '800',
  },
  activityCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  activityContent: {
    gap: 12,
  },
  activityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityMeta: {
    flex: 1,
    gap: 2,
  },
  activityTeacher: {
    color: '#101828',
    fontWeight: '700',
  },
  activityClass: {
    color: '#667085',
    fontSize: 12,
  },
  activityDateChip: {
    backgroundColor: '#F2F4F7',
  },
  activityTitle: {
    color: '#101828',
    fontWeight: '800',
    fontSize: 18,
  },
  activityBody: {
    color: '#475467',
    lineHeight: 20,
  },
  viewMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  viewMoreText: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  noticeCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  noticeContent: {
    gap: 12,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noticeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF4E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeMeta: {
    flex: 1,
    gap: 2,
  },
  noticeTitle: {
    color: '#101828',
    fontWeight: '700',
  },
  noticeDate: {
    color: '#667085',
    fontSize: 12,
  },
  noticeBody: {
    color: '#475467',
    lineHeight: 20,
  },
  noticeButton: {
    borderRadius: 14,
    borderColor: '#4F46E5',
  },
  footerCard: {
    borderRadius: 22,
    backgroundColor: '#F9FAFB',
    marginTop: 4,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerText: {
    flex: 1,
    color: '#475467',
    lineHeight: 20,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    color: '#667085',
  },
  errorText: {
    color: '#B42318',
    lineHeight: 20,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
});

export default ParentHomeScreen;
