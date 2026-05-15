import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  Pressable,
  Platform,
  StatusBar,
  useWindowDimensions
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useAuthStore } from '../../store/authStore';
import { useAttendanceSyncStore } from '../../store/attendanceSyncStore';
import {
  Bell,
  ClipboardList,
  Megaphone,
  Utensils,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Camera,
  BookOpen,
  HeartPulse,
  Star
} from 'lucide-react-native';
import { attendanceService, parseAttendanceSheet } from '../../services/attendance.service';
import { classInfoService, TeacherInClass } from '../../services/classInfo.service';
import { notificationService } from '../../services/notification.service';

const CONTAINER_PADDING = 16;
const COLUMN_GAP = 12;

const TeacherHomeScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const attendanceSyncVersion = useAttendanceSyncStore((state) => state.version);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, loading: true });
  const [coTeachers, setCoTeachers] = useState<TeacherInClass[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Helper to get unread notification count
  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await notificationService.getMyNotifications();
      if (response?.success && Array.isArray(response.data)) {
        const unread = response.data.filter((n: any) => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('[TeacherHome] Failed to load unread count:', err);
    }
  }, []);

  // Kiểm tra orientation
  const isLandscape = screenWidth > screenHeight;
  const isSmallScreen = screenWidth < 380;

  const classId = Number(user?.classId || user?.currentClassId || 0);
  const teacherName = user?.fullName || 'Giáo viên';
  const className = user?.className || 'Đang cập nhật';

  // Tính toán kích thước card động dựa trên orientation
  const getCardWidth = () => {
    const availableWidth = screenWidth - (CONTAINER_PADDING * 2) - COLUMN_GAP;
    return isLandscape ? availableWidth / 2 - COLUMN_GAP / 2 : availableWidth / 2;
  };

  const CARD_WIDTH = getCardWidth();

  const loadTodayStats = useCallback(async () => {
    if (!classId) {
      setStats(s => ({ ...s, loading: false }));
      return;
    }
    try {
      setStats(s => ({ ...s, loading: true }));
      const today = new Date().toISOString().split('T')[0];
      const response = await attendanceService.getClassSheet(classId, today);
      const sheet = parseAttendanceSheet(response);
      setStats({
        total: Number(sheet.totalStudents || 0),
        present: Number(sheet.presentCount || 0),
        absent: Number(sheet.absentCount || 0),
        late: Number(sheet.lateCount || 0),
        loading: false
      });

      // Fetch co-teachers with better error handling
      const teacherId = Number(user?.teacherId ?? user?.TeacherId ?? user?.userId ?? user?.id ?? 0);
      if (__DEV__) {
        console.log('[TeacherHome] Fetching co-teachers for classId:', classId, 'teacherId:', teacherId);
      }

      const others = await classInfoService.getCoTeachers(classId, teacherId);
      if (__DEV__) {
        console.log('[TeacherHome] Co-teachers fetched:', others.length, others);
      }
      setCoTeachers(others);
    } catch (err) {
      console.error('[TeacherHome] Error loading data:', err);
      setStats(s => ({ ...s, loading: false }));
    }
  }, [classId, user]);

  useEffect(() => {
    loadTodayStats();
    loadUnreadCount();
  }, [loadTodayStats, attendanceSyncVersion, loadUnreadCount]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: CONTAINER_PADDING }]}
        scrollEventThrottle={16}
      >
        {/* Header Section - Responsive */}
        <View style={[styles.header, isLandscape && styles.headerLandscape]}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.welcomeText}>Xin chào,</Text>
            <Text
              style={[
                styles.teacherName,
                isSmallScreen && { fontSize: 20 }
              ]}
              numberOfLines={1}
            >
              {teacherName} 👋
            </Text>
            <View style={styles.classBadge}>
              <Users size={14} color="#4F46E5" />
              <Text style={styles.className} numberOfLines={1}>{className}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => navigation.navigate('ProfileNotifications')}
            activeOpacity={0.7}
          >
            <Bell size={24} color="#1E293B" />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Stats Grid - Responsive 2 cột trên cả landscape và portrait */}
        <View style={[styles.statsGrid, isLandscape && styles.statsGridLandscape]}>
          <StatItem
            label="Sĩ số lớp"
            value={stats.total}
            icon={Users}
            color="#4F46E5"
            bgColor="#EEF2FF"
            loading={stats.loading}
            width={CARD_WIDTH}
            isSmallScreen={isSmallScreen}
          />
          <StatItem
            label="Hiện diện"
            value={stats.present}
            icon={CheckCircle2}
            color="#10B981"
            bgColor="#ECFDF5"
            loading={stats.loading}
            width={CARD_WIDTH}
            isSmallScreen={isSmallScreen}
          />
          <StatItem
            label="Vắng mặt"
            value={stats.absent}
            icon={XCircle}
            color="#EF4444"
            bgColor="#FEF2F2"
            loading={stats.loading}
            width={CARD_WIDTH}
            isSmallScreen={isSmallScreen}
          />
          <StatItem
            label="Đi muộn"
            value={stats.late}
            icon={AlertCircle}
            color="#F59E0B"
            bgColor="#FFFBEB"
            loading={stats.loading}
            width={CARD_WIDTH}
            isSmallScreen={isSmallScreen}
          />
        </View>

        {/* Main Actions */}
        <Text style={[styles.sectionTitle, isLandscape && { marginTop: 12, marginBottom: 12 }]}>
          Chức năng chính
        </Text>
        <View style={[styles.actionGrid, isLandscape && styles.actionGridLandscape]}>
          <ActionCard
            title="Điểm danh"
            subtitle="Học sinh lớp"
            icon={<ClipboardList size={isSmallScreen ? 24 : 28} color="#FFF" />}
            color="#6366F1"
            onPress={() => navigation.navigate('Attendance')}
            width={CARD_WIDTH}
          />
          <ActionCard
            title="Hoạt động"
            subtitle="Ảnh & Video"
            icon={<Camera size={isSmallScreen ? 24 : 28} color="#FFF" />}
            color="#3B82F6"
            onPress={() => navigation.navigate('Activities')}
            width={CARD_WIDTH}
          />
          <ActionCard
            title="Thông báo"
            subtitle="Gửi phụ huynh"
            icon={<Megaphone size={isSmallScreen ? 24 : 28} color="#FFF" />}
            color="#F59E0B"
            onPress={() => navigation.navigate('Announcements')}
            width={CARD_WIDTH}
          />
          <ActionCard
            title="Bữa ăn"
            subtitle="Dinh dưỡng"
            icon={<Utensils size={isSmallScreen ? 24 : 28} color="#FFF" />}
            color="#EC4899"
            onPress={() => navigation.navigate('Menu')}
            width={CARD_WIDTH}
          />
          <ActionCard
            title="Bài học"
            subtitle="Kế hoạch giảng dạy"
            icon={<BookOpen size={isSmallScreen ? 24 : 28} color="#FFF" />}
            color="#10B981"
            onPress={() => navigation.navigate('TeacherLessonPlan')}
            width={CARD_WIDTH}
          />
          <ActionCard
            title="Phiếu bé ngoan"
            subtitle="Đánh giá học sinh"
            icon={<Star size={isSmallScreen ? 24 : 28} color="#FFF" />}
            color="#F59E0B"
            onPress={() => navigation.navigate('TeacherEvaluation')}
            width={CARD_WIDTH}
          />
          <ActionCard
            title="Sổ sức khỏe"
            subtitle="Hồ sơ sức khỏe"
            icon={<HeartPulse size={isSmallScreen ? 24 : 28} color="#FFF" />}
            color="#EF4444"
            onPress={() => navigation.navigate('TeacherHealthRecord')}
            width={CARD_WIDTH}
          />
        </View>

        <>
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Giáo viên cùng lớp</Text>
          {coTeachers.length > 0 ? (
            <View style={styles.coTeacherList}>
              {coTeachers.map((t) => (
                <View key={t.teacherId} style={styles.coTeacherChip}>
                  <Users size={14} color="#4F46E5" />
                  <Text style={styles.coTeacherText}>
                    {t.fullName}{t.roleInClass ? ` (${t.roleInClass})` : ''}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noCoTeachersContainer}>
              <Users size={16} color="#9CA3AF" />
              <Text style={styles.noCoTeachersText}>
                {classId ? 'Chưa có giáo viên cùng lớp khác' : 'Chưa gán lớp học'}
              </Text>
            </View>
          )}
        </>

        {/* Padding bottom */}
        <View style={{ height: isLandscape ? 60 : 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// Sub-component StatItem
const StatItem = ({ label, value, icon: Icon, color, bgColor, loading, width, isSmallScreen }: any) => (
  <Surface
    style={[
      styles.statCard,
      {
        backgroundColor: bgColor,
        width,
        paddingVertical: isSmallScreen ? 12 : 14,
        paddingHorizontal: isSmallScreen ? 12 : 14
      }
    ]}
    elevation={0}
  >
    <View style={styles.statHeader}>
      <Icon size={isSmallScreen ? 16 : 18} color={color} />
      <Text
        style={[
          styles.statValue,
          {
            color,
            fontSize: isSmallScreen ? 18 : 22
          }
        ]}
        numberOfLines={1}
      >
        {loading ? '...' : value}
      </Text>
    </View>
    <Text style={[styles.statLabel, { fontSize: isSmallScreen ? 11 : 12 }]} numberOfLines={1}>
      {label}
    </Text>
  </Surface>
);

// Sub-component ActionCard
const ActionCard = ({ title, subtitle, icon, color, onPress, width }: any) => (
  <Pressable
    style={({ pressed }) => [
      styles.actionCard,
      {
        width,
      },
      pressed && { transform: [{ scale: 0.96 }], opacity: 0.8 }
    ]}
    onPress={onPress}
  >
    <Surface style={[styles.iconBox, { backgroundColor: color }]} elevation={3}>
      {icon}
    </Surface>
    <View style={styles.actionInfo}>
      <Text style={styles.actionTitle} numberOfLines={1}>{title}</Text>
      <Text style={styles.actionSubTitle} numberOfLines={1}>{subtitle}</Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  scrollContent: {
    paddingTop: CONTAINER_PADDING,
    paddingBottom: 0
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: Platform.OS === 'android' ? 10 : 0
  },
  headerLandscape: {
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500'
  },
  teacherName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 32
  },
  classBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 6
  },
  className: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5'
  },
  notifBtn: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Stats Grid - LUÔN 2 cột
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: COLUMN_GAP,
    marginBottom: 28
  },
  statsGridLandscape: {
    marginBottom: 16
  },
  statCard: {
    borderRadius: 16,
    justifyContent: 'center'
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  statValue: {
    fontWeight: '800'
  },
  statLabel: {
    color: '#64748B',
    fontWeight: '600'
  },

  // Action Grid - LUÔN 2 cột
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 16
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: COLUMN_GAP
  },
  actionGridLandscape: {
    gap: COLUMN_GAP
  },
  actionCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  actionInfo: {
    alignItems: 'center'
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B'
  },
  actionSubTitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2
  },
  coTeacherList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  coTeacherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  coTeacherText: {
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '600',
  },
  noCoTeachersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noCoTeachersText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default TeacherHomeScreen;