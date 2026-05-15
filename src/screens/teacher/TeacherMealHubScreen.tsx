import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { CheckCircle2, ChevronRight, User, Clock, Users } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { studentService } from '../../services/student.service';

const { width } = Dimensions.get('window');

const TeacherMealHubScreen = ({ navigation, route }: any) => {
  const { user } = useAuthStore();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    loadStudents();
  }, []);

  // Refresh when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadStudents();
    });
    return unsubscribe;
  }, [navigation]);

  const [selectedMealType, setSelectedMealType] = useState<'Breakfast' | 'Lunch' | 'Snack'>('Lunch');

  const mealTypes = [
    { key: 'Breakfast', label: 'Sáng', color: '#F59E0B' },
    { key: 'Lunch', label: 'Trưa', color: '#4F46E5' },
    { key: 'Snack', label: 'Xế', color: '#10B981' },
  ];

  const loadStudents = async () => {
    try {
      setLoading(true);
      const classId = user?.classId || 1;
      const res = await studentService.getByClass(classId);
      const data = (res || []).map((s: any) => ({
        ...s,
        // Track status per meal type
        mealStatuses: {
          Breakfast: Math.random() > 0.7 ? 'Evaluated' : 'Pending',
          Lunch: Math.random() > 0.5 ? 'Evaluated' : 'Pending',
          Snack: Math.random() > 0.6 ? 'Evaluated' : 'Pending',
        }
      }));
      setStudents(data);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.log('Error loading students', error);
      setStudents([
        { id: 1, fullName: 'Bùi Thị Hà', mealStatuses: { Breakfast: 'Pending', Lunch: 'Evaluated', Snack: 'Pending' } },
        { id: 2, fullName: 'Đặng Việt Giang', mealStatuses: { Breakfast: 'Evaluated', Lunch: 'Pending', Snack: 'Evaluated' } },
        { id: 3, fullName: 'Hoàng Thị Phương', mealStatuses: { Breakfast: 'Pending', Lunch: 'Pending', Snack: 'Pending' } },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const evaluated = students.filter((s) => s.mealStatuses?.[selectedMealType] === 'Evaluated').length;
    const total = students.length;
    const rate = total > 0 ? Math.round((evaluated / total) * 100) : 0;
    return { evaluated, pending: total - evaluated, total, rate };
  }, [students, selectedMealType]);

  const renderStudent = ({ item }: { item: any }) => {
    const isDone = item.mealStatuses?.[selectedMealType] === 'Evaluated';
    const initial = item.fullName?.charAt(0).toUpperCase() || 'U';

    return (
      <Pressable
        onPress={() => navigation.navigate('TeacherMealEvaluation', {
          student: item,
          mealType: selectedMealType
        })}
        style={({ pressed }) => [
          styles.studentCardContainer,
          pressed && { transform: [{ scale: 0.98 }] }
        ]}
      >
        <Surface style={[styles.studentCard, isDone && styles.cardDoneBorder]} elevation={1}>
          <View style={styles.cardInner}>
            {/* Avatar */}
            <View style={[styles.avatar, isDone ? styles.avatarDone : styles.avatarPending]}>
              <Text style={[styles.avatarText, { color: isDone ? '#16A34A' : '#EA580C' }]}>
                {initial}
              </Text>
            </View>

            {/* Info */}
            <View style={styles.infoSection}>
              <Text style={styles.studentName}>{item.fullName}</Text>
              <View style={styles.idBadge}>
                <Text style={styles.studentId}>MSHS: {item.id || 'N/A'}</Text>
              </View>
            </View>

            {/* Status Badge */}
            <View style={isDone ? styles.badgeDone : styles.badgePending}>
              {isDone ? <CheckCircle2 size={14} color="#16A34A" /> : <Clock size={14} color="#EA580C" />}
              <Text style={isDone ? styles.badgeTextDone : styles.badgeTextPending}>
                {isDone ? 'Xong' : 'Chờ'}
              </Text>
            </View>

            <ChevronRight size={18} color="#D1D5DB" />
          </View>
        </Surface>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Đang chuẩn bị danh sách...</Text>
        </View>
      ) : (
        <Animated.FlatList
          data={students}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderStudent}
          contentContainerStyle={styles.listContainer}
          style={{ opacity: fadeAnim }}
          ListHeaderComponent={
            <View style={styles.headerSection}>
              <View style={styles.titleRow}>
                <View>
                  <Text style={styles.headerTitle}>Bữa ăn hôm nay</Text>
                  <Text style={styles.headerSubtitle}>Theo dõi & Đánh giá chất lượng</Text>
                </View>
                <View style={styles.classBadge}>
                  <Users size={16} color="#4F46E5" />
                  <Text style={styles.classBadgeText}>Lớp 1A</Text>
                </View>
              </View>

              {/* Meal Type Selector */}
              <View style={styles.mealTypeContainer}>
                {mealTypes.map((type) => (
                  <Pressable
                    key={type.key}
                    onPress={() => setSelectedMealType(type.key as any)}
                    style={[
                      styles.mealTypeButton,
                      selectedMealType === type.key && {
                        backgroundColor: type.color + '20',
                        borderColor: type.color,
                      }
                    ]}
                  >
                    <View style={[styles.mealTypeDot, { backgroundColor: type.color }]} />
                    <Text style={[
                      styles.mealTypeText,
                      selectedMealType === type.key && { color: type.color, fontWeight: '700' }
                    ]}>
                      {type.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Surface style={styles.statsSurface} elevation={2}>
                <View style={styles.statsTop}>
                  <View style={styles.statBox}>
                    <Text style={styles.statVal}>{stats.evaluated}</Text>
                    <Text style={styles.statSub}>Đã xong</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.statBox}>
                    <Text style={[styles.statVal, { color: '#EA580C' }]}>{stats.pending}</Text>
                    <Text style={styles.statSub}>Đang chờ</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.statBox}>
                    <Text style={[styles.statVal, { color: '#4F46E5' }]}>{stats.rate}%</Text>
                    <Text style={styles.statSub}>Tiến độ</Text>
                  </View>
                </View>
                {/* Thanh tiến độ nằm ngay trong stats card */}
                <View style={styles.miniProgressBg}>
                  <View style={[styles.miniProgressFill, { width: `${stats.rate}%` }]} />
                </View>
              </Surface>

              <Text style={styles.sectionLabel}>Danh sách học sinh</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 14 },

  // Header & Stats
  headerSection: { padding: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1E293B' },
  headerSubtitle: { fontSize: 14, color: '#64748B', marginTop: 2 },
  classBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 4 },
  classBadgeText: { color: '#4F46E5', fontWeight: '600', fontSize: 12 },

  statsSurface: { backgroundColor: '#FFF', borderRadius: 20, padding: 16 },
  statsTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '800', color: '#16A34A' },
  statSub: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' },
  divider: { width: 1, height: '70%', backgroundColor: '#F1F5F9', alignSelf: 'center' },
  miniProgressBg: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 10, overflow: 'hidden' },
  miniProgressFill: { height: '100%', backgroundColor: '#4F46E5', borderRadius: 10 },

  sectionLabel: { fontSize: 16, fontWeight: '700', color: '#334155', marginTop: 24, marginBottom: 12 },

  // Meal Type Selector
  mealTypeContainer: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  mealTypeButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#FFF' },
  mealTypeDot: { width: 8, height: 8, borderRadius: 4 },
  mealTypeText: { fontSize: 14, fontWeight: '500', color: '#64748B' },

  // List & Cards
  listContainer: { paddingBottom: 10 },
  studentCardContainer: { marginHorizontal: 20, marginBottom: 12 },
  studentCard: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden' },
  cardDoneBorder: { borderLeftWidth: 4, borderLeftColor: '#16A34A' },
  cardInner: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },

  avatar: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  avatarDone: { backgroundColor: '#DCFCE7' },
  avatarPending: { backgroundColor: '#FFEDD5' },
  avatarText: { fontWeight: '800', fontSize: 18 },

  infoSection: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  idBadge: { alignSelf: 'flex-start' },
  studentId: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  badgeDone: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  badgeTextDone: { fontSize: 11, fontWeight: '700', color: '#16A34A' },
  badgePending: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEDD5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  badgeTextPending: { fontSize: 11, fontWeight: '700', color: '#EA580C' },
});

export default TeacherMealHubScreen;