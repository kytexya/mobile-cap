import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, SafeAreaView, ScrollView, RefreshControl } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { ArrowLeft, HeartPulse, Ruler, Weight, Activity, CalendarDays, Eye } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { studentService } from '../../services/student.service';
import { healthRecordService, HealthRecord, HealthRecordBatch } from '../../services/healthRecord.service';

const formatDate = (value?: string) => {
  if (!value) return 'Chưa rõ';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa rõ' : date.toLocaleDateString('vi-VN');
};

const ParentHealthRecordScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [batches, setBatches] = useState<HealthRecordBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [studentName, setStudentName] = useState('');

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const primaryChild = await studentService.getPrimaryForAccount(user);
      const sid = Number(primaryChild?.studentId ?? primaryChild?.id ?? 0);
      setStudentName(primaryChild?.fullName || '');
      if (sid > 0) {
        const [recs, batchList] = await Promise.all([
          healthRecordService.getByStudent(sid),
          healthRecordService.getBatches(sid),
        ]);
        setRecords(recs);
        setBatches(batchList);
      }
    } catch (err) {
      console.warn('[ParentHealthRecord] load failed:', err);
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

  const filteredRecords = selectedBatchId
    ? records.filter((r) => Number(r.checkupBatch) === selectedBatchId)
    : records;
  const latestRecord = filteredRecords[0];

  const MetricCard = ({ icon, label, value, unit }: {
    icon: React.ReactNode;
    label: string;
    value?: string | number;
    unit?: string;
  }) => (
    <View style={styles.metricCard}>
      <View style={styles.metricIconWrap}>{icon}</View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value ?? '--'} {unit ?? ''}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Sổ sức khỏe</Text>
        <Text style={styles.headerSub}>{studentName}</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        {batches.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.batchScroller}
            contentContainerStyle={styles.batchSelector}
          >
            <Pressable
              style={[styles.batchChip, selectedBatchId === null && styles.batchChipActive]}
              onPress={() => setSelectedBatchId(null)}
            >
              <Text style={[styles.batchChipText, selectedBatchId === null && styles.batchChipTextActive]}>Tất cả</Text>
            </Pressable>
            {batches.map((b) => (
              <Pressable
                key={b.batchId}
                style={[styles.batchChip, selectedBatchId === b.batchId && styles.batchChipActive]}
                onPress={() => setSelectedBatchId(b.batchId)}
              >
                <Text style={[styles.batchChipText, selectedBatchId === b.batchId && styles.batchChipTextActive]}>
                  {b.batchName}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {latestRecord && (
          <View style={styles.latestCard}>
            <View style={styles.latestHeader}>
              <HeartPulse size={20} color="#EF4444" />
              <Text style={styles.latestTitle}>Chỉ số gần nhất</Text>
              <Text style={styles.latestDate}>{formatDate(latestRecord.checkupDate)}</Text>
            </View>
            <View style={styles.metricGrid}>
              <MetricCard icon={<Ruler size={18} color="#4F46E5" />} label="Chiều cao" value={latestRecord.height} unit="cm" />
              <MetricCard icon={<Weight size={18} color="#4F46E5" />} label="Cân nặng" value={latestRecord.weight} unit="kg" />
              <MetricCard icon={<Activity size={18} color="#4F46E5" />} label="BMI" value={latestRecord.bmi} />
              <MetricCard icon={<Eye size={18} color="#4F46E5" />} label="Thị lực" value={latestRecord.vision} />
            </View>
            <View style={styles.detailBlock}>
              <View style={styles.detailLine}>
                <Text style={styles.detailLabel}>Đợt khám</Text>
                <Text style={styles.detailValue}>{latestRecord.checkupBatchName}</Text>
              </View>
              <View style={styles.detailLine}>
                <Text style={styles.detailLabel}>Thời gian</Text>
                <Text style={styles.detailValue}>{formatDate(latestRecord.checkupDate)}</Text>
              </View>
              {latestRecord.dentalStatus ? (
                <View style={styles.detailLine}>
                  <Text style={styles.detailLabel}>Răng miệng</Text>
                  <Text style={styles.detailValue}>{latestRecord.dentalStatus}</Text>
                </View>
              ) : null}
              {latestRecord.heightChange !== null ? (
                <View style={styles.detailLine}>
                  <Text style={styles.detailLabel}>Chiều cao đổi</Text>
                  <Text style={styles.detailValue}>{latestRecord.heightChange! >= 0 ? '+' : ''}{latestRecord.heightChange} cm</Text>
                </View>
              ) : null}
              {latestRecord.weightChange !== null ? (
                <View style={styles.detailLine}>
                  <Text style={styles.detailLabel}>Cân nặng đổi</Text>
                  <Text style={styles.detailValue}>{latestRecord.weightChange! >= 0 ? '+' : ''}{latestRecord.weightChange} kg</Text>
                </View>
              ) : null}
            </View>
            {latestRecord.notes ? <Text style={styles.notes}>Ghi chú: {latestRecord.notes}</Text> : null}
            {latestRecord.doctorName ? <Text style={styles.doctor}>Người khám: {latestRecord.doctorName}</Text> : null}
          </View>
        )}

        <Text style={styles.sectionTitle}>Lịch sử khám</Text>
        {filteredRecords.length === 0 ? (
          <View style={styles.emptyState}>
            <CalendarDays size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>{loading ? 'Đang tải hồ sơ...' : 'Chưa có hồ sơ sức khỏe'}</Text>
            <Text style={styles.emptySub}>Hồ sơ sẽ hiển thị khi nhà trường cập nhật</Text>
          </View>
        ) : (
          filteredRecords.map((rec) => (
            <View key={`${rec.id}-${rec.checkupDate}`} style={styles.recordRow}>
              <View style={styles.recordBadge}>
                <Text style={styles.recordBadgeText}>{rec.checkupDate ? new Date(rec.checkupDate).getDate() : '--'}</Text>
              </View>
              <View style={styles.recordInfo}>
                <Text style={styles.recordDate}>{formatDate(rec.checkupDate)}</Text>
                <Text style={styles.recordMeta}>
                  {rec.height ? `Cao: ${rec.height}cm` : ''}
                  {rec.weight ? `  •  Nặng: ${rec.weight}kg` : ''}
                  {rec.bmi ? `  •  BMI: ${rec.bmi}` : ''}
                  {rec.vision ? `  •  Thị lực: ${rec.vision}` : ''}
                </Text>
                {rec.checkupBatchName ? (
                  <Text style={styles.recordBatch}>
                    {rec.checkupBatchName}
                    {rec.checkupStartDate && rec.checkupEndDate ? ` (${formatDate(rec.checkupStartDate)} - ${formatDate(rec.checkupEndDate)})` : ''}
                  </Text>
                ) : null}
                {rec.notes ? <Text style={styles.recordNote}>{rec.notes}</Text> : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7FB' },
  header: {
    backgroundColor: '#1A1F36',
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  backBtn: { padding: 8, marginBottom: 8, alignSelf: 'flex-start' },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: '#A5B4FC', fontSize: 13, marginTop: 4 },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  batchScroller: { marginBottom: 16, marginHorizontal: -16 },
  batchSelector: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  batchChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  batchChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  batchChipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  batchChipTextActive: { color: '#FFFFFF' },
  latestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  latestHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  latestTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: '#101828' },
  latestDate: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: {
    width: '48%',
    flexGrow: 1,
    minHeight: 92,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  metricValue: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  detailBlock: { marginTop: 12, padding: 12, borderRadius: 16, backgroundColor: '#F8FAFC', gap: 8 },
  detailLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  detailLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  detailValue: { flex: 1, textAlign: 'right', fontSize: 12, color: '#1F2937', fontWeight: '800' },
  notes: { marginTop: 12, fontSize: 13, color: '#475467', lineHeight: 20 },
  doctor: { marginTop: 6, fontSize: 13, color: '#4F46E5', fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#101828', marginBottom: 12, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptySub: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recordBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  recordInfo: { flex: 1, gap: 4 },
  recordDate: { fontSize: 14, fontWeight: '700', color: '#101828' },
  recordMeta: { fontSize: 12, color: '#475467' },
  recordBatch: { fontSize: 11, color: '#4F46E5', fontWeight: '600', marginTop: 2 },
  recordNote: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
});

export default ParentHealthRecordScreen;
