import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Card, SegmentedButtons, Text } from 'react-native-paper';
import { Calendar, Coffee, Users, UtensilsCrossed } from 'lucide-react-native';
import { attendanceService, parseAttendanceSheet } from '../../services/attendance.service';
import { menuService } from '../../services/menu.service';
import { useAuthStore } from '../../store/authStore';

interface Student {
  id: number;
  name: string;
  status?: string | null;
}

interface MenuDay {
  day: string;
  breakfast: string;
  lunch: string;
  snack: string;
}

const mapRows = (source: any[]): Student[] =>
  source
    .map((item: any, index: number) => ({
      id: Number(item.studentId ?? item.id ?? index + 1),
      name: item.studentName ?? item.fullName ?? item.name ?? `Hoc sinh ${index + 1}`,
      status: item.status ?? null,
    }))
    .filter((item: Student) => Number.isFinite(item.id));

const TeacherClassInfoScreen = () => {
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  const spacing = isTablet ? 24 : 16;
  const { user } = useAuthStore();
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
  const accountKey = [user?.classId, user?.ClassId, user?.currentClassId]
    .map((value) => Number(value))
    .find((value) => Number.isFinite(value) && value > 0);
  const [view, setView] = useState<'students' | 'schedule' | 'menu'>('students');
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [menu, setMenu] = useState<MenuDay[]>([]);

  useEffect(() => {
    loadStudents();
    loadMenu();
  }, [accountKey, classId]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      if (!classId) {
        setStudents([]);
        return;
      }
      const response = await attendanceService.getClassSheet(classId, new Date().toISOString().split('T')[0]);
      const sheet = parseAttendanceSheet(response);
      setStudents(mapRows(Array.isArray(sheet.students) ? sheet.students : []));
    } catch (error) {
      console.error('Load class students failed:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMenu = async () => {
    try {
      if (!classId) {
        setMenu([]);
        return;
      }
      const response = await menuService.getForClass(classId);
      setMenu(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Load class menu failed:', error);
      setMenu([]);
    }
  };

  const renderStudentItem = ({ item }: { item: Student }) => (
    <Card style={styles.studentCard}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.studentRow}>
          <Avatar.Text size={48} label={item.name.slice(0, 1).toUpperCase()} />
          <View style={styles.studentInfo}>
            <Text variant="titleSmall">{item.name}</Text>
            <Text variant="labelSmall" style={styles.subText}>
              {item.status ? `Trang thai: ${item.status}` : 'Trang thai: Dang cap nhat'}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderMenuDay = ({ item }: { item: MenuDay }) => (
    <Card style={styles.menuCard}>
      <Card.Content>
        <Text variant="titleSmall" style={styles.menuDay}>
          {item.day}
        </Text>
        <View style={styles.mealRow}>
          <MealColumn icon={<Coffee size={16} color="#B45309" />} label="Sang" value={item.breakfast} />
          <MealColumn icon={<UtensilsCrossed size={16} color="#166534" />} label="Trua" value={item.lunch} />
          <MealColumn icon={<Calendar size={16} color="#92400E" />} label="Xe" value={item.snack} />
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <SegmentedButtons
          value={view}
          onValueChange={(value) => setView(value as 'students' | 'schedule' | 'menu')}
          buttons={[
            { value: 'students', label: 'Hoc sinh' },
            { value: 'schedule', label: 'Thoi khoa' },
            { value: 'menu', label: 'Thuc don' },
          ]}
          style={styles.segmentedButtons}
        />

        <View style={[styles.content, { paddingHorizontal: spacing }]}>
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" />
            </View>
          ) : view === 'students' ? (
            <View style={{ marginTop: spacing / 2 }}>
              <View style={styles.headerRow}>
                <Users size={20} color="#6200ee" />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Danh sach hoc sinh ({students.length})
                </Text>
              </View>
              {students.length ? (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stackGap}>
                  {students.map((item) => (
                    <View key={item.id}>{renderStudentItem({ item })}</View>
                  ))}
                </ScrollView>
              ) : (
                <EmptyState title="Chua co hoc sinh" description="API chua tra ve danh sach hoc sinh cho lop nay." />
              )}
            </View>
          ) : view === 'schedule' ? (
            <EmptyState
              title="Chua co lich hoc"
              description="He thong hien chua co endpoint thoi khoa bieu cho lop."
            />
          ) : (
            <View style={{ marginTop: spacing / 2 }}>
              <View style={styles.headerRow}>
                <UtensilsCrossed size={20} color="#FFA500" />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Thuc don tuan
                </Text>
              </View>
              {menu.length ? (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stackGap}>
                  {menu.map((item, index) => (
                    <View key={`${item.day}-${index}`}>{renderMenuDay({ item })}</View>
                  ))}
                </ScrollView>
              ) : (
                <EmptyState title="Chua co thuc don" description="API chua tra ve du lieu thuc don cho lop." />
              )}
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const MealColumn = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <View style={styles.mealColumn}>
    <View style={styles.mealLabelRow}>
      {icon}
      <Text style={styles.mealLabel}>{label}</Text>
    </View>
    <Text style={styles.mealValue}>{value}</Text>
  </View>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <View style={styles.centerContainer}>
    <Text variant="titleMedium" style={styles.sectionTitle}>
      {title}
    </Text>
    <Text style={styles.emptyText}>{description}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1 },
  segmentedButtons: { margin: 16, marginBottom: 8 },
  content: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionTitle: { fontWeight: 'bold', flex: 1, color: '#111827' },
  studentCard: { borderRadius: 12, elevation: 2 },
  menuCard: { borderRadius: 12, elevation: 2 },
  cardContent: { paddingVertical: 12 },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  studentInfo: { flex: 1 },
  subText: { color: '#666' },
  stackGap: { gap: 12, paddingBottom: 24 },
  menuDay: { fontWeight: '600', marginBottom: 12 },
  mealRow: { flexDirection: 'row', gap: 12 },
  mealColumn: { flex: 1, gap: 6 },
  mealLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mealLabel: { color: '#6B7280', fontWeight: '600' },
  mealValue: { color: '#111827' },
  emptyText: { textAlign: 'center', color: '#6B7280', marginTop: 8, lineHeight: 20 },
});

export default TeacherClassInfoScreen;
