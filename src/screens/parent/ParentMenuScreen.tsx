import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { CalendarX2, ChevronLeft, ChevronRight, Coffee, Cookie, Info, Utensils } from 'lucide-react-native';
import axiosClient from '../../api/axiosClient';
import { menuService, MenuDay } from '../../services/menu.service';
import { studentService } from '../../services/student.service';
import { useAuthStore } from '../../store/authStore';
import { extractArray } from '../../utils/normalization';

type WeekDay = {
  date: Date;
  isoDate: string;
  dayLabel: string;
  dayNumber: number;
};

const startOfWeekMonday = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay() === 0 ? 7 : d.getDay();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - day + 1);
  return d;
};

const toIsoDate = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];

const generateWeekFromStart = (weekStart: Date): WeekDay[] => {
  const labels = ['T2', 'T3', 'T4', 'T5', 'T6'];
  return labels.map((label, index) => {
    const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index);
    return {
      date,
      isoDate: toIsoDate(date),
      dayLabel: label,
      dayNumber: date.getDate(),
    };
  });
};

const getPositiveNumber = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
};

const resolveStudentClassId = async (user: any) => {
  const primaryChild = await studentService.getPrimaryForAccount(user);
  console.log('[menu] primaryChild:', primaryChild);

  let classId = getPositiveNumber(primaryChild?.classId, primaryChild?.ClassId);
  const studentId = getPositiveNumber(primaryChild?.studentId, primaryChild?.id);

  if (!classId && studentId) {
    try {
      const response = await axiosClient.get(`/ClassStudent/student/${studentId}`);
      const latestClass = extractArray<any>(response.data).sort((a, b) => {
        const db = new Date(b?.enrolledAt ?? b?.EnrolledAt ?? 0).getTime();
        const da = new Date(a?.enrolledAt ?? a?.EnrolledAt ?? 0).getTime();
        return db - da;
      })[0];
      classId = getPositiveNumber(latestClass?.classId, latestClass?.ClassId);
      console.log('[menu] class from ClassStudent:', latestClass);
    } catch (err) {
      console.warn('[menu] ClassStudent lookup failed:', err);
    }
  }

  console.log('[menu] resolved classId:', classId);
  return classId;
};

const pickMenuForDate = (list: MenuDay[], dateStr: string) =>
  list.find((item) => String(item.date).split('T')[0] === dateStr) ?? null;

const EmptyMenuState = ({ message }: { message?: string }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconCircle}>
      <CalendarX2 size={42} color="#94A3B8" />
    </View>
    <Text style={styles.emptyTitle}>Chưa có thực đơn</Text>
    <Text style={styles.emptySubtitle}>{message || 'Nhà trường chưa cập nhật thực đơn cho ngày này'}</Text>
  </View>
);

const MealCard = ({
  title,
  content,
  icon,
  color,
  iconBg,
}: {
  title: string;
  content: string;
  icon: React.ReactNode;
  color: string;
  iconBg: string;
}) => (
  <View style={styles.mealCard}>
    <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
      {icon}
    </View>
    <View style={styles.mealInfo}>
      <Text style={[styles.mealType, { color }]}>{title}</Text>
      <Text style={styles.mealName}>{content || 'Chưa cập nhật'}</Text>
    </View>
  </View>
);

const SkeletonCard = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonIcon} />
    <View style={styles.skeletonLines}>
      <View style={styles.skeletonLineShort} />
      <View style={styles.skeletonLineLong} />
    </View>
  </View>
);

const NutritionNoteCard = () => (
  <View style={styles.noteCard}>
    <View style={styles.noteHeader}>
      <Info size={18} color="#D97706" />
      <Text style={styles.noteTitle}>Ghi chú dinh dưỡng</Text>
    </View>
    <Text style={styles.notePara}>
      Thực đơn được nhà trường cập nhật theo từng ngày, cân bằng nhóm chất và lưu ý an toàn thực phẩm cho bé.
    </Text>
  </View>
);

const ParentMenuScreen = () => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeekMonday(new Date()));
  const weekDays = useMemo(() => generateWeekFromStart(weekStart), [weekStart]);
  const todayIso = toIsoDate(new Date());
  const initialIndex = weekDays.findIndex((d) => d.isoDate === todayIso);
  const [selectedIndex, setSelectedIndex] = useState<number>(initialIndex >= 0 ? initialIndex : 0);
  const selectedDate = weekDays[selectedIndex] ?? weekDays[0];
  const [menuData, setMenuData] = useState<MenuDay | null>(null);
  const [menuDays, setMenuDays] = useState<MenuDay[] | null>(null);
  const [menuClassId, setMenuClassId] = useState<number | null>(null);
  const [emptyMessage, setEmptyMessage] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useState(new Animated.Value(1))[0];

  const loadMenuForDate = useCallback(async (dateStr: string, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setEmptyMessage(undefined);

    try {
      let classId = menuClassId ?? 0;
      let days = menuDays;

      if (!classId) {
        classId = await resolveStudentClassId(user);
        setMenuClassId(classId || null);
      }

      if (!classId) {
        setMenuDays([]);
        setMenuData(null);
        setEmptyMessage('Chưa xác định được lớp của bé nên chưa thể tải thực đơn');
        return;
      }

      if (isRefresh || !days || menuClassId !== classId) {
        const response = await menuService.getForClass(classId);
        console.log('[menu] normalized days:', response);
        setMenuDays(response);
        days = response;
        setMenuClassId(classId);
      }

      setMenuData(days ? pickMenuForDate(days, dateStr) : null);
    } catch (err) {
      console.warn('[menu] Failed to load menu:', err);
      setMenuData(null);
      setEmptyMessage('Không thể tải thực đơn. Kéo xuống để thử lại.');
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, [menuClassId, menuDays, user]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (selectedDate?.isoDate) loadMenuForDate(selectedDate.isoDate);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [selectedDate?.isoDate, loadMenuForDate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (selectedDate?.isoDate) await loadMenuForDate(selectedDate.isoDate, true);
    setRefreshing(false);
  };

  const onSelectDay = (index: number) => {
    const day = weekDays[index];
    if (!day || day.isoDate === selectedDate?.isoDate) return;
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.35, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setSelectedIndex(index);
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  };

  const changeWeek = (deltaWeeks: number) => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + deltaWeeks * 7);
    setWeekStart(startOfWeekMonday(next));
    setSelectedIndex(0);
    setMenuDays(null);
  };

  const weekRangeLabel = useMemo(() => {
    const start = weekDays[0]?.date;
    const end = weekDays[weekDays.length - 1]?.date;
    if (!start || !end) return '';
    return `${start.toLocaleDateString('vi-VN')} - ${end.toLocaleDateString('vi-VN')}`;
  }, [weekDays]);

  const renderWeekDay = ({ item, index }: { item: WeekDay; index: number }) => {
    const isSelected = item.isoDate === selectedDate?.isoDate;
    return (
      <Pressable
        style={({ pressed }) => [styles.dayPill, isSelected && styles.dayPillSelected, pressed && styles.pressed]}
        onPress={() => onSelectDay(index)}
      >
        <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>{item.dayLabel}</Text>
        <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>{item.dayNumber}</Text>
      </Pressable>
    );
  };

  const hasMenu = Boolean(menuData && (menuData.breakfast || menuData.lunch || menuData.snack));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thực đơn trong tuần</Text>
        <View style={styles.weekNav}>
          <Pressable style={styles.weekNavBtn} onPress={() => changeWeek(-1)}>
            <ChevronLeft size={18} color="#111827" />
          </Pressable>
          <Text style={styles.weekRange}>{weekRangeLabel}</Text>
          <Pressable style={styles.weekNavBtn} onPress={() => changeWeek(1)}>
            <ChevronRight size={18} color="#111827" />
          </Pressable>
        </View>
        <FlatList
          horizontal
          data={weekDays}
          keyExtractor={(item) => item.isoDate}
          renderItem={renderWeekDay}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekListContent}
        />
      </View>

      <Animated.ScrollView
        style={[styles.mainScroll, { opacity: fadeAnim }]}
        contentContainerStyle={styles.mainScrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary]} />}
      >
        {loading ? (
          <View style={styles.loadingWrapper}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : hasMenu ? (
          <View style={styles.mealsContainer}>
            <Text style={styles.dateSelectorText}>Thực đơn ngày {selectedDate.date.toLocaleDateString('vi-VN')}</Text>
            <MealCard
              title="Bữa sáng"
              content={menuData?.breakfast ?? ''}
              icon={<Coffee size={22} color="#D97706" />}
              color="#D97706"
              iconBg="#FEF3C7"
            />
            <MealCard
              title="Bữa trưa"
              content={menuData?.lunch ?? ''}
              icon={<Utensils size={22} color="#16A34A" />}
              color="#16A34A"
              iconBg="#DCFCE7"
            />
            <MealCard
              title="Bữa xế"
              content={menuData?.snack ?? ''}
              icon={<Cookie size={22} color="#EA580C" />}
              color="#EA580C"
              iconBg="#FFEDD5"
            />
            <NutritionNoteCard />
          </View>
        ) : (
          <EmptyMenuState message={emptyMessage} />
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 18,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    paddingHorizontal: 24,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  weekNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRange: { flex: 1, textAlign: 'center', color: '#64748B', fontWeight: '800', fontSize: 13 },
  weekListContent: { paddingHorizontal: 20, gap: 12 },
  dayPill: {
    width: 62,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillSelected: { 
    backgroundColor: '#4F46E5', 
    borderColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  dayLabel: { fontSize: 12, fontWeight: '800', color: '#94A3B8', marginBottom: 4, textTransform: 'uppercase' },
  dayLabelSelected: { color: '#C7D2FE' },
  dayNumber: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  dayNumberSelected: { color: '#FFFFFF' },
  mainScroll: { flex: 1 },
  mainScrollContent: { padding: 20, paddingBottom: 100, flexGrow: 1 },
  mealsContainer: { flex: 1, gap: 16 },
  dateSelectorText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealInfo: { flex: 1, gap: 4 },
  mealType: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  mealName: { fontSize: 16, color: '#1E293B', fontWeight: '700', lineHeight: 24 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 12 },
  emptySubtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', maxWidth: '75%', lineHeight: 22 },
  noteCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 24,
    padding: 18,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    gap: 10,
  },
  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noteTitle: { fontSize: 16, fontWeight: '800', color: '#92400E' },
  notePara: { fontSize: 14, color: '#B45309', lineHeight: 22, opacity: 0.9 },
  loadingWrapper: { gap: 16 },
  skeletonCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    height: 88,
  },
  skeletonIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#F8FAFC', marginRight: 16 },
  skeletonLines: { flex: 1, gap: 12 },
  skeletonLineShort: { width: '35%', height: 12, borderRadius: 6, backgroundColor: '#F8FAFC' },
  skeletonLineLong: { width: '85%', height: 12, borderRadius: 6, backgroundColor: '#F8FAFC' },
  pressed: { transform: [{ scale: 0.98 }] },
});

export default ParentMenuScreen;
