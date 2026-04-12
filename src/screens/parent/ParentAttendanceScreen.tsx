import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, View } from 'react-native';
import { Button, Card, Text, useTheme } from 'react-native-paper';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, CircleCheckBig, CircleX } from 'lucide-react-native';
import { attendanceService } from '../../services/attendance.service';
import { useAuthStore } from '../../store/authStore';
import { studentService } from '../../services/student.service';

// Định nghĩa kiểu dữ liệu chuẩn
type AttendanceStatus = 'Present' | 'Absent' | 'Late';

type AttendanceItem = {
  id: string | number;
  date: string;
  status: AttendanceStatus;
  checkIn: string;
  checkOut: string;
};

const ParentAttendanceScreen = () => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [history, setHistory] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  // Memoize nhãn tháng và month key để tránh tính toán lại lãng phí
  const monthLabel = useMemo(() =>
    currentMonth.toLocaleString('vi-VN', { month: 'long', year: 'numeric' }),
    [currentMonth]
  );

  const monthKey = useMemo(() =>
    `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`,
    [currentMonth]
  );

  // Helper: Format thởi gian hiển thị gọn gàng
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

  const loadHistory = async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const primaryChild = await studentService.getPrimaryForAccount(user);
      const studentId = primaryChild?.studentId ?? primaryChild?.id;

      if (!studentId || Number(studentId) <= 0) {
        setHistory([]);
        setError('Không tìm thấy dữ liệu học sinh.');
        return;
      }

      // Lấy range tháng hiện tại
      const first = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const last = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const fromDate = first.toISOString().split('T')[0];
      const toDate = last.toISOString().split('T')[0];

      const response = await attendanceService.getStudentHistory(studentId, fromDate, toDate);

      if (requestId !== requestIdRef.current) return;

      // Map dữ liệu từ API
      const rawData = Array.isArray(response) ? response : [];
      const mapped = rawData.map((item: any, index: number) => ({
        id: item.id || `${index}`,
        date: item.date || item.attendanceDate || new Date().toISOString(),
        status: (item.status?.charAt(0).toUpperCase() + item.status?.slice(1).toLowerCase()) as AttendanceStatus,
        checkIn: formatTimeDisplay(item.checkIn || item.checkInTime),
        checkOut: formatTimeDisplay(item.checkOut || item.checkOutTime),
      })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setHistory(mapped);
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return;
      setError(err?.message || 'Không thể tải lịch sử.');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [monthKey, user?.id]);

  const summary = useMemo(() => ({
    present: history.filter(i => i.status === 'Present').length,
    absent: history.filter(i => i.status === 'Absent').length,
    late: history.filter(i => i.status === 'Late').length,
  }), [history]);

  const getStatusTheme = (status: AttendanceStatus) => {
    switch (status) {
      case 'Present': return { color: '#16A34A', bg: '#DCFCE7', icon: <CircleCheckBig size={18} color="#16A34A" /> };
      case 'Absent': return { color: '#DC2626', bg: '#FEE2E2', icon: <CircleX size={18} color="#DC2626" /> };
      default: return { color: '#F59E0B', bg: '#FEF3C7', icon: <Clock3 size={18} color="#F59E0B" /> };
    }
  };

  const renderItem = useCallback(({ item }: { item: AttendanceItem }) => {
    const { color, bg, icon } = getStatusTheme(item.status);
    const dateObj = new Date(item.date);

    return (
      <Card style={styles.recordCard} mode="contained">
        <Card.Content style={styles.recordContent}>
          <View style={styles.dateColumn}>
            <Text style={styles.dayText}>{dateObj.getDate()}</Text>
            <Text style={styles.dayLabel}>
              {dateObj.toLocaleString('vi-VN', { weekday: 'short' })}
            </Text>
          </View>

          <View style={styles.recordBody}>
            <View style={styles.recordTopRow}>
              <View style={[styles.statusBadge, { backgroundColor: bg }]}>
                <View style={[styles.statusDot, { backgroundColor: color }]} />
                <Text style={[styles.statusBadgeText, { color }]}>{item.status}</Text>
              </View>
              <Text style={styles.timeRangeHint}>{item.checkIn} — {item.checkOut}</Text>
            </View>

            <View style={styles.timeInfoCard}>
              <View style={styles.timeBox}>
                <Text style={styles.timeLabel}>Vào lớp</Text>
                <Text style={styles.timeValue}>{item.checkIn}</Text>
              </View>
              <View style={styles.timeDivider} />
              <View style={styles.timeBox}>
                <Text style={styles.timeLabel}>Ra lớp</Text>
                <Text style={styles.timeValue}>{item.checkOut}</Text>
              </View>
            </View>
          </View>

          <View style={styles.iconIndicator}>{icon}</View>
        </Card.Content>
      </Card>
    );
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>Lịch sử điểm danh</Text>
          <Text style={styles.subtitle}>Theo dõi check-in, check-out của con hàng ngày.</Text>

          <Card style={styles.monthSelector} mode="contained">
            <Card.Content style={styles.monthContent}>
              <Pressable onPress={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} style={styles.navButton}>
                <ChevronLeft size={22} color="#475467" />
              </Pressable>
              <View style={styles.monthCenter}>
                <Text style={styles.monthText}>{monthLabel}</Text>
                <Text style={styles.monthHint}>Tháng hiện tại của học sinh</Text>
              </View>
              <Pressable onPress={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} style={styles.navButton}>
                <ChevronRight size={22} color="#475467" />
              </Pressable>
            </Card.Content>
          </Card>

          <View style={styles.summaryRow}>
            <SummaryItem label="Có mặt" value={summary.present} color="#16A34A" />
            <SummaryItem label="Vắng" value={summary.absent} color="#DC2626" />
            <SummaryItem label="Trễ" value={summary.late} color="#F59E0B" />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} color={theme.colors.primary} />
        ) : (
          <FlatList
            data={history}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <CalendarDays size={40} color="#CBD5E1" />
                <Text style={styles.emptyText}>Không có dữ liệu điểm danh tháng này</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const SummaryItem = ({ label, value, color }: any) => (
  <Card style={styles.summaryCard} mode="contained">
    <View style={styles.summaryContent}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  </Card>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  page: { flex: 1, paddingHorizontal: 16 },
  header: { paddingTop: 20, marginBottom: 16 },
  title: { fontWeight: '800', color: '#0F172A' },
  subtitle: { color: '#64748B', marginTop: 4, fontSize: 14 },
  monthSelector: { marginTop: 20, borderRadius: 16, backgroundColor: '#FFFFFF' },
  monthContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  navButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  monthCenter: { alignItems: 'center' },
  monthText: { fontSize: 16, fontWeight: '700', color: '#1E293B', textTransform: 'capitalize' },
  monthHint: { fontSize: 11, color: '#94A3B8' },
  summaryRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  summaryCard: { flex: 1, borderRadius: 16, backgroundColor: '#FFFFFF' },
  summaryContent: { paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { fontSize: 12, color: '#64748B', marginTop: 2 },
  listContent: { paddingBottom: 40, gap: 12 },
  recordCard: { borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 0 },
  recordContent: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  dateColumn: { width: 50, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 24, fontWeight: '800', color: '#1E293B' },
  dayLabel: { fontSize: 12, color: '#64748B', textTransform: 'capitalize' },
  recordBody: { flex: 1, marginLeft: 12 },
  recordTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  timeRangeHint: { fontSize: 11, color: '#94A3B8' },
  timeInfoCard: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10 },
  timeBox: { flex: 1 },
  timeLabel: { fontSize: 10, color: '#94A3B8', marginBottom: 2 },
  timeValue: { fontSize: 14, fontWeight: '700', color: '#334155' },
  timeDivider: { width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 12 },
  iconIndicator: { marginLeft: 8, paddingTop: 4 },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { color: '#94A3B8', fontSize: 14 },
});

export default ParentAttendanceScreen;