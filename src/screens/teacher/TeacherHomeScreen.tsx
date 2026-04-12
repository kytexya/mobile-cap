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
  StatusBar
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
  Camera
} from 'lucide-react-native';
import { attendanceService, parseAttendanceSheet } from '../../services/attendance.service';

// Lấy kích thước màn hình để tính toán động
const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Tính toán kích thước card dựa trên chiều rộng màn hình (trừ đi padding 2 bên và gap giữa)
const COLUMN_GAP = 12;
const CONTAINER_PADDING = 16;
const STAT_CARD_WIDTH = (SCREEN_WIDTH - (CONTAINER_PADDING * 2) - COLUMN_GAP) / 2;

const TeacherHomeScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const attendanceSyncVersion = useAttendanceSyncStore((state) => state.version);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, loading: true });

  const classId = Number(user?.classId || user?.currentClassId || 0);
  const teacherName = user?.fullName || 'Giáo viên';
  const className = user?.className || 'Đang cập nhật';

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
    } catch (err) {
      setStats(s => ({ ...s, loading: false }));
    }
  }, [classId]);

  useEffect(() => {
    loadTodayStats();
  }, [loadTodayStats, attendanceSyncVersion]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.welcomeText}>Xin chào,</Text>
            <Text style={styles.teacherName} numberOfLines={1}>{teacherName} 👋</Text>
            <View style={styles.classBadge}>
              <Users size={14} color="#4F46E5" />
              <Text style={styles.className} numberOfLines={1}>{className}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => navigation.navigate('ProfileNotifications')}
          >
            <Bell size={24} color="#1E293B" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* Stats Grid - Dùng FlexWrap để tự thích nghi */}
        <View style={styles.statsGrid}>
          <StatItem label="Sĩ số lớp" value={stats.total} icon={Users} color="#4F46E5" bgColor="#EEF2FF" loading={stats.loading} />
          <StatItem label="Hiện diện" value={stats.present} icon={CheckCircle2} color="#10B981" bgColor="#ECFDF5" loading={stats.loading} />
          <StatItem label="Vắng mặt" value={stats.absent} icon={XCircle} color="#EF4444" bgColor="#FEF2F2" loading={stats.loading} />
          <StatItem label="Đi muộn" value={stats.late} icon={AlertCircle} color="#F59E0B" bgColor="#FFFBEB" loading={stats.loading} />
        </View>

        {/* Main Actions */}
        <Text style={styles.sectionTitle}>Chức năng chính</Text>
        <View style={styles.actionGrid}>
          <ActionCard
            title="Điểm danh"
            subtitle="Học sinh lớp"
            icon={<ClipboardList size={SCREEN_WIDTH < 380 ? 24 : 28} color="#FFF" />}
            color="#6366F1"
            onPress={() => navigation.navigate('Attendance')}
          />
          <ActionCard
            title="Hoạt động"
            subtitle="Ảnh & Video"
            icon={<Camera size={SCREEN_WIDTH < 380 ? 24 : 28} color="#FFF" />}
            color="#3B82F6"
            onPress={() => navigation.navigate('Activities')}
          />
          <ActionCard
            title="Thông báo"
            subtitle="Gửi phụ huynh"
            icon={<Megaphone size={SCREEN_WIDTH < 380 ? 24 : 28} color="#FFF" />}
            color="#F59E0B"
            onPress={() => navigation.navigate('Announcements')}
          />
          <ActionCard
            title="Bữa ăn"
            subtitle="Dinh dưỡng"
            icon={<Utensils size={SCREEN_WIDTH < 380 ? 24 : 28} color="#FFF" />}
            color="#EC4899"
            onPress={() => navigation.navigate('Menu')}
          />
        </View>

        {/* Padding bottom để không bị che bởi TabBar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// Sub-component StatItem
const StatItem = ({ label, value, icon: Icon, color, bgColor, loading }: any) => (
  <Surface style={[styles.statCard, { backgroundColor: bgColor, width: STAT_CARD_WIDTH }]} elevation={0}>
    <View style={styles.statHeader}>
      <Icon size={SCREEN_WIDTH < 380 ? 16 : 18} color={color} />
      <Text style={[styles.statValue, { color }]} numberOfLines={1}>
        {loading ? '...' : value}
      </Text>
    </View>
    <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
  </Surface>
);

// Sub-component ActionCard
const ActionCard = ({ title, subtitle, icon, color, onPress }: any) => (
  <Pressable
    style={({ pressed }) => [
      styles.actionCard,
      { width: STAT_CARD_WIDTH },
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
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: CONTAINER_PADDING },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: Platform.OS === 'android' ? 10 : 0
  },
  welcomeText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  teacherName: { fontSize: SCREEN_WIDTH < 380 ? 20 : 24, fontWeight: '800', color: '#1E293B' },
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
  className: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
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
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFF'
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: COLUMN_GAP,
    marginBottom: 28
  },
  statCard: {
    padding: 14,
    borderRadius: 16,
    justifyContent: 'center'
  },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  statValue: { fontSize: SCREEN_WIDTH < 380 ? 18 : 22, fontWeight: '800' },
  statLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },

  // Action Grid
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 16 },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    width: SCREEN_WIDTH < 380 ? 48 : 56,
    height: SCREEN_WIDTH < 380 ? 48 : 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  actionInfo: { alignItems: 'center' },
  actionTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  actionSubTitle: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
});

export default TeacherHomeScreen;