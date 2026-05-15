import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import {
  ArrowLeft,
  HeartPulse,
  Ruler,
  Weight,
  Thermometer,
  Activity,
  CalendarDays,
  Users,
  Search,
} from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { studentService, Student } from '../../services/student.service';
import {
  healthRecordService,
  HealthRecord,
  HealthRecordBatch,
} from '../../services/healthRecord.service';
import { classTeacherService } from '../../services/classTeacher.service';

const TeacherHealthRecordScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [batches, setBatches] = useState<HealthRecordBatch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [classId, setClassId] = useState<number | null>(null);

  const loadClassAndStudents = useCallback(async () => {
    try {
      setLoading(true);
      const classInfo = await classTeacherService.getPrimaryForAccount(user);
      const cid = classInfo?.classId ?? 0;
      setClassId(cid || null);
      if (cid) {
        const [studentList, batchList] = await Promise.all([
          studentService.getByClass(cid),
          healthRecordService.getBatches(),
        ]);
        setStudents(studentList);
        setBatches(batchList);
        if (studentList.length > 0) {
          setSelectedStudent(studentList[0]);
          const recs = await healthRecordService.getByStudent(studentList[0].id);
          setRecords(recs);
        }
      }
    } catch (err) {
      console.warn('[TeacherHealthRecord] load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadClassAndStudents();
  }, [loadClassAndStudents]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadClassAndStudents();
    setRefreshing(false);
  };

  const selectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setRecords([]);
    const recs = await healthRecordService.getByStudent(student.id);
    setRecords(recs);
  };

  const filteredStudents = students.filter((s) =>
    s.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const latestRecord = records[0];

  const MetricCard = ({
    icon,
    label,
    value,
    unit,
  }: {
    icon: React.ReactNode;
    label: string;
    value?: string | number;
    unit?: string;
  }) => (
    <View style={styles.metricCard}>
      <View style={styles.metricIconWrap}>{icon}</View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {value ?? '--'} {unit ?? ''}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Quản lý sổ sức khỏe</Text>
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
                {isSelected && <Activity size={16} color="#4F46E5" />}
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
        {batches.length > 0 && (
          <View style={styles.batchRow}>
            <Text style={styles.batchLabel}>Đợt khám:</Text>
            {batches.map((b) => (
              <View key={b.batchId} style={styles.batchTag}>
                <Text style={styles.batchTagText}>{b.batchName}</Text>
                <Text style={styles.batchDate}>
                  {new Date(b.startDate).toLocaleDateString('vi-VN')} - {new Date(b.endDate).toLocaleDateString('vi-VN')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {selectedStudent && latestRecord && (
          <View style={styles.latestCard}>
            <View style={styles.latestHeader}>
              <HeartPulse size={20} color="#EF4444" />
              <Text style={styles.latestTitle}>{selectedStudent.fullName}</Text>
              <Text style={styles.latestDate}>
                {latestRecord.checkupDate ? new Date(latestRecord.checkupDate).toLocaleDateString('vi-VN') : ''}
              </Text>
            </View>
            <View style={styles.metricGrid}>
              <MetricCard icon={<Ruler size={18} color="#4F46E5" />} label="Chiều cao" value={latestRecord.height} unit="cm" />
              <MetricCard icon={<Weight size={18} color="#4F46E5" />} label="Cân nặng" value={latestRecord.weight} unit="kg" />
              <MetricCard icon={<Activity size={18} color="#4F46E5" />} label="BMI" value={latestRecord.bmi} />
              <MetricCard icon={<Thermometer size={18} color="#4F46E5" />} label="Nhiệt độ" value={latestRecord.temperature} unit="°C" />
            </View>
            {latestRecord.notes ? <Text style={styles.notes}>Ghi chú: {latestRecord.notes}</Text> : null}
            {latestRecord.doctorName ? <Text style={styles.doctor}>Bác sĩ: {latestRecord.doctorName}</Text> : null}
          </View>
        )}

        <Text style={styles.sectionTitle}>Lịch sử khám</Text>
        {records.length === 0 ? (
          <View style={styles.emptyState}>
            <CalendarDays size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Chưa có hồ sơ sức khỏe</Text>
            <Text style={styles.emptySub}>Hồ sơ sẽ hiển thị khi nhà trường cập nhật</Text>
          </View>
        ) : (
          records.map((rec) => (
            <View key={rec.id} style={styles.recordRow}>
              <View style={styles.recordBadge}>
                <Text style={styles.recordBadgeText}>
                  {rec.checkupDate ? new Date(rec.checkupDate).getDate() : '--'}
                </Text>
              </View>
              <View style={styles.recordInfo}>
                <Text style={styles.recordDate}>
                  {rec.checkupDate ? new Date(rec.checkupDate).toLocaleDateString('vi-VN') : 'Không rõ ngày'}
                </Text>
                <Text style={styles.recordMeta}>
                  {rec.height ? `Cao: ${rec.height}cm` : ''}
                  {rec.weight ? `  •  Nặng: ${rec.weight}kg` : ''}
                  {rec.bmi ? `  •  BMI: ${rec.bmi}` : ''}
                  {rec.heartRate ? `  •  Nhịp tim: ${rec.heartRate}` : ''}
                </Text>
                {rec.checkupBatch ? <Text style={styles.recordBatch}>Đợt: {rec.checkupBatch}</Text> : null}
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
    backgroundColor: '#EEF2FF',
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
    backgroundColor: '#4F46E5',
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
    color: '#1E293B',
    fontWeight: '800',
  },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  batchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  batchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#101828',
  },
  batchTag: {
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  batchTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  batchDate: {
    fontSize: 10,
    color: '#6B7280',
  },
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
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '23%',
    minWidth: 72,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
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
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  notes: {
    marginTop: 12,
    fontSize: 13,
    color: '#475467',
    lineHeight: 20,
  },
  doctor: {
    marginTop: 6,
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '600',
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
  recordRow: {
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
  recordBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  recordInfo: {
    flex: 1,
    gap: 4,
  },
  recordDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#101828',
  },
  recordMeta: {
    fontSize: 12,
    color: '#475467',
  },
  recordBatch: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '600',
    marginTop: 2,
  },
});

export default TeacherHealthRecordScreen;
