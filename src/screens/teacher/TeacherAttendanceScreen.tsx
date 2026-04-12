import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, SafeAreaView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Chip, SegmentedButtons, Text } from 'react-native-paper';
import { Check, Clock3, Filter, PencilLine, RefreshCw, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { attendanceService, parseAttendanceSheet } from '../../services/attendance.service';
import { useAuthStore } from '../../store/authStore';
import { useAttendanceSyncStore } from '../../store/attendanceSyncStore';

type AttendanceStatus = 'Present' | 'Absent' | 'Late' | null;
type AttendanceView = 'today' | 'history';

interface StudentRow {
  id: number;
  name: string;
  status: AttendanceStatus;
}

interface HistoryDay {
  id: string;
  dateLabel: string;
  subtitle: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  students: StudentRow[];
}

const HISTORY_LOOKBACK_DAYS = 7;

const formatISODate = (date: Date) => date.toISOString().split('T')[0];

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const buildAttendanceCacheKey = (classId: number, date: string) => `attendance:snapshot:${classId}:${date}`;

const readCachedAttendance = async (classId: number, date: string) => {
  const key = buildAttendanceCacheKey(classId, date);
  try {
    const raw =
      Platform.OS === 'web' ? localStorage.getItem(key) : await SecureStore.getItemAsync(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.students) ? parsed : null;
  } catch {
    return null;
  }
};

const saveCachedAttendance = async (classId: number, date: string, students: StudentRow[], submitted: boolean) => {
  const key = buildAttendanceCacheKey(classId, date);
  const payload = JSON.stringify({ students, submitted, savedAt: new Date().toISOString() });
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, payload);
    } else {
      await SecureStore.setItemAsync(key, payload);
    }
  } catch (error) {
    console.warn('Failed to cache attendance snapshot:', error);
  }
};

const dayHasSavedStatuses = (rows: StudentRow[]) => rows.length > 0 && rows.every((student) => student.status !== null);

const mapAttendanceRows = (source: any[]): StudentRow[] =>
  source
    .map((item: any, index: number) => ({
      id: Number(item.studentId ?? item.id ?? index + 1),
      name: item.studentName ?? item.fullName ?? item.name ?? `Hoc sinh ${index + 1}`,
      status:
        item.status === 'Present' || item.status === 'Absent' || item.status === 'Late'
          ? item.status
          : null,
    }))
    .filter((item: StudentRow) => Number.isFinite(item.id));

const buildHistoryDay = (date: Date, rows: StudentRow[]): HistoryDay => {
  const present = rows.filter((student) => student.status === 'Present').length;
  const absent = rows.filter((student) => student.status === 'Absent').length;
  const late = rows.filter((student) => student.status === 'Late').length;
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);

  return {
    id: formatISODate(date),
    dateLabel: formatDateLabel(date),
    subtitle: diffDays === 0 ? 'Hom nay' : diffDays === 1 ? 'Hom qua' : `${diffDays} ngay truoc`,
    total: rows.length,
    present,
    absent,
    late,
    students: rows,
  };
};

const mergeRowsByStudentId = (baseRows: StudentRow[], overrideRows: StudentRow[]) => {
  const overrideMap = new Map<number, StudentRow>();
  overrideRows.forEach((row) => {
    overrideMap.set(row.id, row);
  });

  const merged = baseRows.map((row) => {
    const override = overrideMap.get(row.id);
    return override ? { ...row, ...override } : row;
  });

  const mergedIds = new Set(merged.map((row) => row.id));
  overrideRows.forEach((row) => {
    if (!mergedIds.has(row.id)) {
      merged.push(row);
    }
  });

  return merged;
};

const getBestRows = (liveRows: StudentRow[], cachedRows: StudentRow[], expectedTotal?: number | null) => {
  if (expectedTotal && liveRows.length === expectedTotal) return liveRows;
  if (expectedTotal && cachedRows.length === expectedTotal) return cachedRows;
  if (cachedRows.length > liveRows.length) return cachedRows;
  return liveRows;
};

const TeacherAttendanceScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [view, setView] = useState<AttendanceView>('today');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [historyDays, setHistoryDays] = useState<HistoryDay[]>([]);
  const [selectedHistoryDayId, setSelectedHistoryDayId] = useState<string | null>(null);
  const [editingHistoryToday, setEditingHistoryToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const markAttendanceSynced = useAttendanceSyncStore((state) => state.markAttendanceSynced);
  const classId = Number(
    user?.classId ??
    user?.ClassId ??
    user?.currentClassId ??
    user?.currentClass?.id ??
    user?.currentClass?.classId ??
    user?.assignedClass?.id ??
    user?.assignedClass?.classId ??
    user?.teachingClass?.id ??
    user?.teachingClass?.classId ??
    0
  );
  const className =
    (user?.className as string | undefined) ||
    (user?.ClassName as string | undefined) ||
    (user?.currentClass?.name as string | undefined) ||
    (user?.currentClass?.className as string | undefined) ||
    (user?.assignedClass?.name as string | undefined) ||
    (user?.assignedClass?.className as string | undefined) ||
    (user?.teachingClass?.name as string | undefined) ||
    (user?.teachingClass?.className as string | undefined) ||
    'Dang cap nhat';
  const accountKey = [user?.classId, user?.ClassId, user?.currentClassId]
    .map((value) => Number(value))
    .find((value) => Number.isFinite(value) && value > 0);

  useEffect(() => {
    loadTodaySheet();
  }, [classId, accountKey]);

  useEffect(() => {
    if (view === 'history') {
      loadHistoryDays();
    }
  }, [view, classId, accountKey]);

  const progress = useMemo(() => {
    const answered = students.filter((student) => student.status !== null).length;
    return students.length ? Math.round((answered / students.length) * 100) : 0;
  }, [students]);

  const unansweredCount = students.filter((student) => student.status === null).length;
  const currentTodayId = formatISODate(new Date());
  const isTodayHistorySelected = view === 'history' && selectedHistoryDayId === currentTodayId;
  const isTodayHistoryEditable = isTodayHistorySelected && editingHistoryToday;

  const loadTodaySheet = async () => {
    try {
      setLoading(true);
      setValidationError(null);
      if (!classId) {
        setStudents([]);
        setSubmitted(false);
        return;
      }
      const cached = await readCachedAttendance(classId, formatISODate(new Date()));
      const response = await attendanceService.getClassSheet(classId, formatISODate(new Date()));
      const sheet = parseAttendanceSheet(response);
      const source = Array.isArray(sheet.students) ? sheet.students : [];
      if (__DEV__) {
        console.log('[attendance] today sheet', {
          classId,
          date: formatISODate(new Date()),
          records: source.length,
          sheet,
        });
      }
      const mapped = mapAttendanceRows(source);
      const fallbackRows = cached?.students ?? [];
      const mergedRows = cached?.students?.length ? mergeRowsByStudentId(mapped, cached.students) : mapped;
      const rowsToUse = getBestRows(mergedRows, fallbackRows, sheet.totalStudents ?? null);
      setStudents(rowsToUse);
      setSubmitted(
        mergedRows.length > 0
          ? dayHasSavedStatuses(mergedRows) || Boolean(cached?.submitted && fallbackRows.length)
          : Boolean(cached?.submitted && fallbackRows.length)
      );
    } catch (error) {
      console.error('Load today attendance failed:', error);
      const cached = await readCachedAttendance(classId, formatISODate(new Date()));
      setStudents(cached?.students ?? []);
      setSubmitted(Boolean(cached?.submitted && cached?.students?.length));
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryDays = async () => {
    try {
      setHistoryLoading(true);
      setValidationError(null);
      if (!classId) {
        setHistoryDays([]);
        setSelectedHistoryDayId(null);
        setEditingHistoryToday(false);
        return;
      }

      const dates = Array.from({ length: HISTORY_LOOKBACK_DAYS }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - index);
        return date;
      });

      const results = await Promise.all(
        dates.map(async (date) => {
          try {
            const response = await attendanceService.getClassSheet(classId, formatISODate(date));
            const sheet = parseAttendanceSheet(response);
            const source = Array.isArray(sheet.students) ? sheet.students : [];
            if (__DEV__) {
              console.log('[attendance] history day', {
                classId,
                date: formatISODate(date),
                records: source.length,
                sheet,
              });
            }
            const todayCache = date.toDateString() === new Date().toDateString()
              ? await readCachedAttendance(classId, formatISODate(date))
              : null;
            const liveRows = mapAttendanceRows(source);
            const cacheRows = todayCache?.students ?? [];
            const mergedRows = cacheRows.length ? mergeRowsByStudentId(liveRows, cacheRows) : liveRows;
            const rows = getBestRows(mergedRows, cacheRows, sheet.totalStudents ?? null);
            return rows.length ? buildHistoryDay(date, rows) : null;
          } catch {
            return null;
          }
        })
      );

      const normalized = results.filter((item): item is HistoryDay => Boolean(item));
      setHistoryDays(normalized);
      setSelectedHistoryDayId((current) =>
        current && normalized.some((day) => day.id === current) ? current : null
      );
      setEditingHistoryToday(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  const updateStatus = (id: number, status: Exclude<AttendanceStatus, null>, editable: boolean) => {
    if (!editable) return;
    setValidationError(null);
    setStudents((prev) => {
      const next = prev.map((student) => (student.id === id ? { ...student, status } : student));
      void saveCachedAttendance(classId, formatISODate(new Date()), next, false);
      setHistoryDays((current) =>
        current.map((day) =>
          day.id === currentTodayId ? { ...day, students: next } : day
        )
      );
      return next;
    });
    setSubmitted(false);
  };

  const markAllPresent = (editable: boolean) => {
    if (!editable) return;
    setValidationError(null);
    setStudents((prev) => {
      const next = prev.map((student) => ({ ...student, status: 'Present' as const }));
      void saveCachedAttendance(classId, formatISODate(new Date()), next, false);
      setHistoryDays((current) =>
        current.map((day) =>
          day.id === currentTodayId ? { ...day, students: next } : day
        )
      );
      return next;
    });
    setSubmitted(false);
  };

  const handleSubmit = async () => {
    if (students.length === 0) {
      setValidationError('Khong co danh sach hoc sinh de diem danh.');
      return;
    }

    if (unansweredCount > 0) {
      setValidationError('Vui long diem danh du tat ca hoc sinh truoc khi xac nhan.');
      return;
    }

    setValidationError(null);
    setSaving(true);
    try {
      await attendanceService.submitBulk({
        classId,
        date: formatISODate(new Date()),
        records: students
          .filter((student) => student.status !== null)
          .map((student) => ({
            studentId: student.id,
            status: student.status as Exclude<AttendanceStatus, null>,
          })),
      });
      setSubmitted(true);
      setEditingHistoryToday(false);
      await saveCachedAttendance(classId, formatISODate(new Date()), students, true);
      markAttendanceSynced();
      setHistoryDays((current) =>
        current.map((day) =>
          day.id === currentTodayId
            ? {
              ...day,
              students,
              present: students.filter((student) => student.status === 'Present').length,
              absent: students.filter((student) => student.status === 'Absent').length,
              late: students.filter((student) => student.status === 'Late').length,
              total: students.length,
            }
            : day
        )
      );
      await loadHistoryDays();
    } catch (error) {
      console.error('Submit attendance failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <Text variant="headlineSmall" style={styles.title}>
        Diem danh hom nay
      </Text>
      <Text style={styles.subtitle}>Lop: {className}</Text>

      <View style={styles.progressRow}>
        <View>
          <Text style={styles.progressValue}>{progress}%</Text>
          <Text style={styles.progressLabel}>Hoan thanh</Text>
        </View>
        <Chip style={styles.progressChip} icon="account-multiple">
          {students.length} hoc sinh
        </Chip>
      </View>

      <SegmentedButtons
        value={view}
        onValueChange={(next) => setView(next as AttendanceView)}
        style={styles.segment}
        buttons={[
          { value: 'today', label: 'Hom nay' },
          { value: 'history', label: 'Lich su' },
        ]}
      />

      {view === 'today' ? (
        <View style={styles.quickActions}>
          <Button
            mode="outlined"
            icon={() => <Filter size={16} color="#4F46E5" />}
            onPress={() => markAllPresent(!submitted)}
            disabled={submitted}
          >
            Mark all present
          </Button>
          <Button
            mode="text"
            icon={() => <RefreshCw size={16} color="#4F46E5" />}
            onPress={loadTodaySheet}
            disabled={submitted}
          >
            Tai lai
          </Button>
        </View>
      ) : (
        <View style={styles.historyInlineSummary}>
          <Text style={styles.historyInlineTitle}>Lich su diem danh</Text>
          <Text style={styles.historyInlineText}>
            Chon mot ngay ben duoi de mo rong va xem chi tiet ngay do ngay trong cung man hinh nay.
          </Text>
          <Text style={styles.historyInlineText}>
            Chi ngay hom nay moi co the chinh sua lai du lieu.
          </Text>
        </View>
      )}

      {validationError ? <Text style={styles.validationError}>{validationError}</Text> : null}
    </View>
  );

  const renderTodayCard = ({ item }: { item: StudentRow }) => (
    <Card style={styles.studentCard} elevation={0}>
      <Card.Content style={styles.studentCardContent}>
        <View style={styles.studentHeader}>
          <Avatar.Text size={40} label={item.name.slice(0, 1).toUpperCase()} style={styles.avatar} />
          <View style={styles.studentTextWrap}>
            <Text variant="titleMedium" style={styles.studentName}>
              {item.name}
            </Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <StatusPill
            label="Present"
            icon={<Check size={14} color={item.status === 'Present' ? '#FFF' : '#16A34A'} />}
            active={item.status === 'Present'}
            onPress={() => updateStatus(item.id, 'Present', !submitted)}
            activeColor="#16A34A"
          />
          <StatusPill
            label="Absent"
            icon={<X size={14} color={item.status === 'Absent' ? '#FFF' : '#DC2626'} />}
            active={item.status === 'Absent'}
            onPress={() => updateStatus(item.id, 'Absent', !submitted)}
            activeColor="#DC2626"
          />
          <StatusPill
            label="Late"
            icon={<Clock3 size={14} color={item.status === 'Late' ? '#FFF' : '#F59E0B'} />}
            active={item.status === 'Late'}
            onPress={() => updateStatus(item.id, 'Late', !submitted)}
            activeColor="#F59E0B"
          />
        </View>
      </Card.Content>
    </Card>
  );

  const renderHistoryDay = ({ item }: { item: HistoryDay }) => {
    const active = item.id === selectedHistoryDayId;
    const editable = item.id === currentTodayId;
    const canEdit = editable && active && editingHistoryToday;
    const rows = editable && active ? students : item.students;
    const summary = rows.reduce(
      (acc, student) => {
        if (student.status === 'Present') acc.present += 1;
        if (student.status === 'Absent') acc.absent += 1;
        if (student.status === 'Late') acc.late += 1;
        return acc;
      },
      { present: 0, absent: 0, late: 0 }
    );
    const total = rows.length;

    return (
      <View style={[styles.historyDayCard, active && styles.historyDayCardActive]}>
        <Pressable
          onPress={() => {
            setSelectedHistoryDayId(item.id);
            setEditingHistoryToday(false);
          }}
          style={({ pressed }) => [pressed && styles.historyDayPressed]}
        >
          <View style={styles.historyDayTop}>
            <View>
              <Text style={styles.historyDayDate}>{item.dateLabel}</Text>
              <Text style={styles.historyDaySubtitle}>{item.subtitle}</Text>
            </View>
            <Chip style={styles.historyDayChip} compact>
              {total} hoc sinh
            </Chip>
          </View>

          <View style={styles.historySummaryRow}>
            <View style={styles.historySummaryItem}>
              <Text style={styles.historySummaryValueGreen}>{summary.present}</Text>
              <Text style={styles.historySummaryLabel}>Co mat</Text>
            </View>
            <View style={styles.historySummaryItem}>
              <Text style={styles.historySummaryValueRed}>{summary.absent}</Text>
              <Text style={styles.historySummaryLabel}>Vang</Text>
            </View>
            <View style={styles.historySummaryItem}>
              <Text style={styles.historySummaryValueOrange}>{summary.late}</Text>
              <Text style={styles.historySummaryLabel}>Tre</Text>
            </View>
          </View>
        </Pressable>

        {active ? (
          <View style={styles.historyExpanded}>
            <View style={styles.historyActionBar}>
              <View style={styles.historyExpandedHeader}>
                <View>
                  <Text style={styles.historyRosterLabel}>Danh sach hoc sinh</Text>
                  <Text style={styles.historyActionHint}>
                    {editable
                      ? 'Bam de mo che do chinh sua ngay hom nay.'
                      : 'Chi co ngay hom nay moi co the chinh sua.'}
                  </Text>
                </View>
                {editable ? (
                  <Pressable
                    onPress={() => setEditingHistoryToday((prev) => !prev)}
                    style={({ pressed }) => [
                      styles.historyEditPill,
                      canEdit ? styles.historyEditPillActive : styles.historyEditPillIdle,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    {canEdit ? (
                      <X size={13} color="#FFF" strokeWidth={2.5} />
                    ) : (
                      <PencilLine size={13} color="#4F46E5" strokeWidth={2.5} />
                    )}
                    <Text style={[styles.historyEditPillLabel, canEdit && styles.historyEditPillLabelActive]}>
                      {canEdit ? 'Huy sua' : 'Sua'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
            <View style={styles.historyStudentList}>
              {rows.map((student) => {
                const color =
                  student.status === 'Present' ? '#16A34A' : student.status === 'Absent' ? '#DC2626' : '#F59E0B';
                const label = student.status || 'Unknown';

                return (
                  <View key={`${item.id}-${student.id}`} style={styles.historyStudentRow}>
                    <Avatar.Text size={40} label={student.name.slice(0, 1).toUpperCase()} style={styles.avatar} />
                    <View style={styles.historyStudentMeta}>
                      <Text variant="titleMedium" style={styles.studentName}>
                        {student.name}
                      </Text>
                      {canEdit ? (
                        <View style={styles.historyStatusRow}>
                          <StatusPill
                            label="Present"
                            icon={<Check size={14} color={student.status === 'Present' ? '#FFF' : '#16A34A'} />}
                            active={student.status === 'Present'}
                            onPress={() => updateStatus(student.id, 'Present', true)}
                            activeColor="#16A34A"
                          />
                          <StatusPill
                            label="Absent"
                            icon={<X size={14} color={student.status === 'Absent' ? '#FFF' : '#DC2626'} />}
                            active={student.status === 'Absent'}
                            onPress={() => updateStatus(student.id, 'Absent', true)}
                            activeColor="#DC2626"
                          />
                          <StatusPill
                            label="Late"
                            icon={<Clock3 size={14} color={student.status === 'Late' ? '#FFF' : '#F59E0B'} />}
                            active={student.status === 'Late'}
                            onPress={() => updateStatus(student.id, 'Late', true)}
                            activeColor="#F59E0B"
                          />
                        </View>
                      ) : (
                        <Chip style={[styles.historyStudentStatus, { borderColor: color }]}>{label}</Chip>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.mainContainer}>
        {view === 'today' ? (
          submitted ? (
            <View style={styles.todaySavedScreen}>
              {renderHeader()}
              <View style={styles.todaySavedCard}>
                <View style={styles.todaySavedIconWrap}>
                  <Check size={26} color="#16A34A" strokeWidth={2.6} />
                </View>
                <Text style={styles.todaySavedTitle}>Hom nay da diem danh roi</Text>
                <Text style={styles.todaySavedText}>
                  {`Bé trong lớp hôm nay đã được điểm danh. `}
                  Ban co the vao Lich su de xem lai va chi sua ngay hom nay neu can.
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setView('history');
                    setSelectedHistoryDayId(currentTodayId);
                  }}
                  style={styles.todaySavedAction}
                  contentStyle={styles.todaySavedActionContent}
                  labelStyle={styles.todaySavedActionLabel}
                >
                  Mo lich su hom nay
                </Button>
              </View>
            </View>
          ) : (
            <FlatList
              data={students}
              renderItem={renderTodayCard}
              keyExtractor={(item, index) => String(item.id ?? item.name ?? index)}
              ListHeaderComponent={renderHeader}
              contentContainerStyle={[styles.listPadding, { paddingBottom: 24 + insets.bottom + 112 }]}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.centerEmpty}>
                  <Text style={styles.emptyTitle}>Chua co du lieu diem danh</Text>
                  <Text style={styles.emptyText}>Chua co du lieu diem danh cho lop nay.</Text>
                </View>
              }
            />
          )
        ) : historyLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : historyDays.length ? (
          <FlatList
            data={historyDays}
            renderItem={renderHistoryDay}
            keyExtractor={(item, index) => String(item.id ?? item.dateLabel ?? index)}
            ListHeaderComponent={
              <View>
                {renderHeader()}
              </View>
            }
            contentContainerStyle={[styles.listPadding, { paddingBottom: 24 + insets.bottom + 72 }]}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.centerEmpty}>
            <Text style={styles.emptyTitle}>Khong co lich su diem danh</Text>
            <Text style={styles.emptyText}>Chua co du lieu trong khoang thoi gian hien tai.</Text>
          </View>
        )}

        {((view === 'today' && !submitted) || (view === 'history' && isTodayHistoryEditable)) && (
          <View style={[styles.footerBar, { bottom: insets.bottom + 64, paddingBottom: 12 }]}>
            <Button
              mode="contained"
              onPress={handleSubmit}
              disabled={saving || unansweredCount > 0}
              loading={saving}
              style={styles.submitButton}
              contentStyle={styles.submitButtonContent}
              labelStyle={styles.submitButtonLabel}
            >
              {view === 'history' ? 'Cap nhat diem danh' : 'Xac nhan diem danh'}
            </Button>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const StatusPill = ({
  label,
  icon,
  active,
  onPress,
  activeColor,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
  activeColor: string;
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.statusPill,
      { borderColor: activeColor, backgroundColor: active ? activeColor : '#fff' },
      pressed && { opacity: 0.7 },
    ]}
  >
    <View style={styles.pillInner}>
      {icon}
      <Text style={[styles.pillLabel, active && { color: '#FFF' }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F7FB' },
  mainContainer: { flex: 1 },
  headerSection: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  todaySavedScreen: {
    flex: 1,
    paddingHorizontal: 16,
  },
  todaySavedCard: {
    marginTop: 14,
    borderRadius: 22,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    alignItems: 'center',
    gap: 10,
  },
  todaySavedIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
  },
  todaySavedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  todaySavedText: {
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  todaySavedAction: {
    marginTop: 4,
    borderRadius: 14,
    borderColor: '#C4B5FD',
  },
  todaySavedActionContent: {
    height: 42,
    paddingHorizontal: 14,
  },
  todaySavedActionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  centerEmptyInline: {
    marginTop: 8,
    marginBottom: 12,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  title: { fontWeight: '700', color: '#111827' },
  subtitle: { color: '#6B7280', marginBottom: 8 },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressValue: { color: '#4F46E5', fontSize: 24, fontWeight: '800' },
  progressLabel: { color: '#6B7280', fontSize: 12 },
  progressChip: { backgroundColor: '#EEF2FF' },
  segment: { marginBottom: 16 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  historyInlineSummary: {
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  historyInlineTitle: { color: '#111827', fontWeight: '800', fontSize: 15 },
  historyInlineText: { color: '#6B7280', marginTop: 4, lineHeight: 18, fontSize: 12 },
  validationError: {
    marginTop: 8,
    marginHorizontal: 16,
    color: '#B42318',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  listPadding: { paddingHorizontal: 16, paddingBottom: 20 },
  emptyTitle: { color: '#111827', fontWeight: '700', fontSize: 16, textAlign: 'center' },
  emptyText: { color: '#6B7280', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  historyDayCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 12,
  },
  historyDayCardActive: {
    borderColor: '#C4B5FD',
    backgroundColor: '#F5F3FF',
  },
  historyDayPressed: { opacity: 0.92 },
  historyDayTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  historyDayDate: {
    fontWeight: '800',
    color: '#111827',
    fontSize: 16,
  },
  historyDaySubtitle: {
    marginTop: 2,
    color: '#6B7280',
    fontSize: 12,
  },
  historyDayChip: {
    backgroundColor: '#EEF2FF',
  },
  historySummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  historySummaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  historySummaryValueGreen: {
    color: '#16A34A',
    fontWeight: '800',
    fontSize: 18,
  },
  historySummaryValueRed: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 18,
  },
  historySummaryValueOrange: {
    color: '#F59E0B',
    fontWeight: '800',
    fontSize: 18,
  },
  historySummaryLabel: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  historyExpanded: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  historyActionBar: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#FAFAFF',
    borderWidth: 1,
    borderColor: '#E9E5FF',
  },
  historyExpandedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  historyRosterLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  historyActionHint: {
    marginTop: 3,
    color: '#6B7280',
    fontSize: 11,
    lineHeight: 16,
    maxWidth: 190,
  },
  historyStudentList: {
    gap: 12,
  },
  historyStudentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  historyStudentMeta: {
    flex: 1,
    gap: 6,
  },
  historyStudentStatus: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    minWidth: 88,
  },
  historyStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyEditPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 1,
  },
  historyEditPillIdle: {
    backgroundColor: '#F5F3FF',
    borderColor: '#C4B5FD',
  },
  historyEditPillActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  historyEditPillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  historyEditPillLabelActive: {
    color: '#FFF',
  },
  studentCard: {
    borderRadius: 20,
    marginBottom: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  studentCardContent: { paddingVertical: 12 },
  studentHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  studentTextWrap: { flex: 1 },
  avatar: { backgroundColor: '#EDE9FE' },
  studentName: { fontWeight: '700', color: '#111827' },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusPill: { flex: 1, borderRadius: 12, borderWidth: 1, height: 44, justifyContent: 'center' },
  pillInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  pillLabel: { fontSize: 12, fontWeight: '700', color: '#111827' },
  footerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    zIndex: 1000,
    elevation: 12,
  },
  submitButton: { borderRadius: 14, backgroundColor: '#4F46E5', elevation: 0 },
  submitButtonContent: { height: 54 },
  submitButtonLabel: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  savedBanner: {
    marginTop: 12,
    marginBottom: 8,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  savedBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  savedBannerText: {
    marginTop: 6,
    color: '#4B5563',
    lineHeight: 18,
    fontSize: 12,
  },
});

export default TeacherAttendanceScreen;
