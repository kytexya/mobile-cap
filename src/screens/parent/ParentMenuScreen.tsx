import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  SafeAreaView, 
  FlatList,
  RefreshControl,
  Animated,
  ActivityIndicator
} from 'react-native';
import { Text, Card, Title, Paragraph, Divider, useTheme } from 'react-native-paper';
import { Coffee, Utensils, Cookie, Info, CalendarX2 } from 'lucide-react-native';
import { menuService, MenuDay } from '../../services/menu.service';
import { useAuthStore } from '../../store/authStore';
import { studentService } from '../../services/student.service';
import { useFocusEffect } from '@react-navigation/native';

// --- Types ---
type WeekDay = {
  date: Date;
  isoDate: string;
  dayLabel: string;
  dayNumber: number;
};

// --- Helpers ---
const generateCurrentWeek = (): WeekDay[] => {
  const current = new Date();
  const week: WeekDay[] = [];
  // Adjust to make Monday the start of the week:
  const dayOfWeek = current.getDay() === 0 ? 7 : current.getDay();
  const diff = current.getDate() - dayOfWeek + 1; // +1 to start the week on Monday

  const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(current.getFullYear(), current.getMonth(), diff + i);
    const isoDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0];
    
    week.push({
      date: d,
      isoDate,
      dayLabel: labels[i],
      dayNumber: d.getDate(),
    });
  }
  return week;
};

// --- Components ---
const EmptyMenuState = () => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconCircle}>
      <CalendarX2 size={48} color="#9CA3AF" />
    </View>
    <Text style={styles.emptyTitle}>Menu chưa có</Text>
    <Text style={styles.emptySubtitle}>Nhà trường chưa cập nhật thực đơn cho ngày này</Text>
  </View>
);

const MealCard = ({ 
  title, 
  content, 
  icon, 
  color, 
  iconBg 
}: { 
  title: string; 
  content: string; 
  icon: React.ReactNode; 
  color: string;
  iconBg: string;
}) => (
  <Card style={[styles.mealCard, { borderColor: color }]}>
    <Card.Content style={styles.mealCardContent}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <View style={styles.mealInfo}>
        <Text style={[styles.mealType, { color: color }]}>{title}</Text>
        <Text style={styles.mealName}>{content || 'Chưa cập nhật'}</Text>
      </View>
    </Card.Content>
  </Card>
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
      <Info size={18} color="#D97706" style={styles.noteIcon} />
      <Text style={styles.noteTitle}>Ghi chú dinh dưỡng</Text>
    </View>
    <Paragraph style={styles.notePara}>
      Nguyên liệu hôm nay được nhập từ các nông trại hữu cơ, đảm bảo an toàn vệ sinh thực phẩm. Thực đơn được chuyên gia thiết kế cân bằng nhóm chất, giúp bé phát triển toàn diện.
    </Paragraph>
  </View>
);


// --- Main Screen ---
const ParentMenuScreen = () => {
  const theme = useTheme();
  const { user } = useAuthStore();
  
  // State
  const weekDays = useMemo(() => generateCurrentWeek(), []);
  
  // Find index of today. If today is not in the generated week (due to timezone etc), default to 0 (Monday)
  const todayIso = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const initialIndex = weekDays.findIndex(d => d.isoDate === todayIso);
  const selectedIndex = initialIndex >= 0 ? initialIndex : 0;
  
  const [selectedDate, setSelectedDate] = useState<WeekDay>(weekDays[selectedIndex]);
  const [menuData, setMenuData] = useState<MenuDay | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useState(new Animated.Value(1))[0];

  const fadeOutIn = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.3, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      callback();
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

 const loadMenuForDate = useCallback(async (dateStr: string, isRefresh = false) => {
  try {
    if (loading && !isRefresh) return; 

    const primaryChild = await studentService.getPrimaryForAccount(user);
    let classId = Number(primaryChild?.classId ?? primaryChild?.ClassId ?? 0);
    if (!classId && __DEV__) {
      classId = 1; // Fallback for dev testing
    }

    if (!classId) {
      setMenuData(null);
      return;
    }

    const response = await menuService.getForClass(classId, dateStr);

    const foundMenu = response?.find(item => {
      const itemDate = String(item.date).split('T')[0];
      return itemDate === dateStr;
    });

    setMenuData(foundMenu ?? null);

  } catch (err) {
    console.warn('Failed to load menu:', err);
    setMenuData(null);
  } finally {
    if (!isRefresh) setLoading(false);
  }
}, [user]);

  // Initial Load focusing on selectedDate
  useEffect(() => {
  loadMenuForDate(selectedDate.isoDate);
}, [selectedDate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMenuForDate(selectedDate.isoDate, true);
    setRefreshing(false);
  };

  const onSelectDay = (day: WeekDay) => {
    if (day.isoDate === selectedDate.isoDate) return;
    fadeOutIn(() => {
      setSelectedDate(day);
    });
  };

  const renderWeekDay = ({ item }: { item: WeekDay }) => {
    const isSelected = item.isoDate === selectedDate.isoDate;
    
    return (
      <Pressable 
        style={({ pressed }) => [
          styles.dayPill,
          isSelected && styles.dayPillSelected,
          pressed && { transform: [{ scale: 0.95 }] }
        ]}
        onPress={() => onSelectDay(item)}
      >
        <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>
          {item.dayLabel}
        </Text>
        <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
          {item.dayNumber}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Thực đơn trong tuần</Title>
        <FlatList
          horizontal
          data={weekDays}
          keyExtractor={(item) => item.isoDate}
          renderItem={renderWeekDay}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekListContent}
          style={styles.weekList}
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
        ) : menuData && (menuData.breakfast || menuData.lunch || menuData.snack) ? (
          <View style={styles.mealsContainer}>
            <Text style={styles.dateSelectorText}>
              Thực đơn ngày {new Date(selectedDate.date).toLocaleDateString('vi-VN')}
            </Text>
            
            <MealCard 
              title="Bữa sáng" 
              content={menuData.breakfast} 
              icon={<Coffee size={24} color="#D97706" />} 
              color="#F59E0B" 
              iconBg="#FEF3C7" 
            />
            
            <MealCard 
              title="Bữa trưa" 
              content={menuData.lunch} 
              icon={<Utensils size={24} color="#16A34A" />} 
              color="#22C55E" 
              iconBg="#DCFCE7" 
            />
            
            <MealCard 
              title="Bữa xế" 
              content={menuData.snack} 
              icon={<Cookie size={24} color="#EA580C" />} 
              color="#F97316" 
              iconBg="#FFEDD5" 
            />
            
            <NutritionNoteCard />
          </View>
        ) : (
          <EmptyMenuState />
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6', // light gray modern background
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  weekList: {
    flexGrow: 0,
  },
  weekListContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  dayPill: {
    width: 58,
    height: 78,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dayPillSelected: {
    backgroundColor: '#6D28D9', // primary purple
    borderColor: '#6D28D9',
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  dayLabelSelected: {
    color: '#EEDCFF',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#374151',
  },
  dayNumberSelected: {
    color: '#FFFFFF',
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  mealsContainer: {
    flex: 1,
  },
  dateSelectorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  mealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    borderLeftWidth: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  mealCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  mealInfo: {
    flex: 1,
  },
  mealType: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mealName: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    lineHeight: 22,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 22,
  },
  noteCard: {
    backgroundColor: '#FEF3C7', // light yellow
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteIcon: {
    marginRight: 8,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
  },
  notePara: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 22,
  },
  loadingWrapper: {
    gap: 16,
    marginTop: 10,
  },
  skeletonCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  skeletonIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 16,
  },
  skeletonLines: {
    flex: 1,
    gap: 12,
  },
  skeletonLineShort: {
    width: '40%',
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  skeletonLineLong: {
    width: '80%',
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
});

export default ParentMenuScreen;
