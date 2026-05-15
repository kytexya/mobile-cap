import React, { useMemo, useState } from 'react';
import { Dimensions, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Button, Card, Chip, Dialog, Divider, Portal, Text } from 'react-native-paper';
import { Bell, ChevronRight, LogOut, LockKeyhole, Settings2, ShieldCheck, UserRound } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';

const TeacherProfileScreen = ({ navigation }: any) => {
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  const spacing = isTablet ? 24 : 16;
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();

  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const goToProfileNotifications = () =>
    navigation.getParent?.()?.navigate('ProfileNotifications') ?? navigation.navigate('ProfileNotifications');

  const teacherInfo = useMemo(
    () => ({
      name: user?.fullName || user?.username || 'Teacher',
      email: user?.email || 'teacher@kms.edu.vn',
      className:
        user?.className ||
        user?.ClassName ||
        user?.currentClass?.name ||
        user?.currentClass?.className ||
        user?.assignedClass?.name ||
        user?.assignedClass?.className ||
        user?.teachingClass?.name ||
        user?.teachingClass?.className ||
        'Lop dang cap nhat',
      role: 'Giao vien',
    }),
    [user]
  );

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setLogoutDialogVisible(false);
    } finally {
      setLoggingOut(false);
    }
  };

  const QuickRow = ({
    icon,
    iconColor,
    title,
    description,
    onPress,
  }: {
    icon: React.ReactNode;
    iconColor: string;
    title: string;
    description: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.rowButton, pressed && styles.rowPressed]}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${iconColor}15` }]}>{icon}</View>
      <View style={styles.rowTextWrap}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{description}</Text>
      </View>
      <ChevronRight size={18} color="#cbd5e1" />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Portal>
        <Dialog
          visible={logoutDialogVisible}
          onDismiss={() => !loggingOut && setLogoutDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Xac nhan dang xuat</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>Ban co chac chan muon dang xuat khoi ung dung khong?</Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              mode="outlined"
              onPress={() => setLogoutDialogVisible(false)}
              disabled={loggingOut}
              style={styles.dialogButton}
            >
              Huy
            </Button>
            <Button
              mode="contained"
              onPress={handleLogout}
              loading={loggingOut}
              disabled={loggingOut}
              style={[styles.dialogButton, styles.dialogDangerButton]}
            >
              Dang xuat
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingHorizontal: spacing,
          paddingTop: spacing,
          paddingBottom: spacing * 2 + insets.bottom + 96,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.heroCard}>
          <Card.Content style={[styles.heroContent, { padding: spacing + 4 }]}>
            <Avatar.Text
              size={72}
              label={teacherInfo.name.slice(0, 2).toUpperCase()}
              style={styles.heroAvatar}
              labelStyle={styles.heroAvatarLabel}
            />
            <View style={styles.heroTextWrap}>
              <Text variant="headlineSmall" style={styles.heroName}>
                {teacherInfo.name}
              </Text>
              <Text variant="bodyMedium" style={styles.heroRole}>
                {teacherInfo.role}
              </Text>
              <Text variant="bodySmall" style={styles.heroEmail}>
                {teacherInfo.email}
              </Text>
            </View>
            <View style={styles.heroChips}>
              <Chip compact style={styles.roleChip}>
                {teacherInfo.className}
              </Chip>
              <Chip icon="shield-check" compact style={styles.statusChip}>
                Tai khoan hoat dong
              </Chip>
            </View>
          </Card.Content>
        </Card>

        <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: spacing + 8 }]}>
          Cai dat nhanh
        </Text>
        <Card style={styles.sectionCard}>
          <Card.Content style={styles.sectionContent}>
            <QuickRow
              icon={<Bell size={18} color="#f59e0b" />}
              iconColor="#f59e0b"
              title="Thong bao"
              description="Quan ly thong bao toi lop"
              onPress={goToProfileNotifications}
            />
            <Divider style={styles.sectionDivider} />
            <QuickRow
              icon={<LockKeyhole size={18} color="#6366f1" />}
              iconColor="#6366f1"
              title="Doi mat khau"
              description="Cap nhat mat khau dinh ky"
              onPress={() => navigation.navigate('ChangePassword')}
            />
            <Divider style={styles.sectionDivider} />
            <QuickRow
              icon={<Settings2 size={18} color="#14b8a6" />}
              iconColor="#14b8a6"
              title="Cai dat he thong"
              description="Giao dien, ngon ngu va hien thi"
              onPress={() => navigation.navigate('SystemSettings')}
            />
          </Card.Content>
        </Card>

        <Button
          mode="contained-tonal"
          icon={() => <LogOut size={18} color="#B42318" />}
          onPress={() => setLogoutDialogVisible(true)}
          style={[styles.logoutButton, { marginTop: spacing + 12 }]}
          contentStyle={styles.logoutButtonContent}
          labelStyle={styles.logoutButtonLabel}
          disabled={loggingOut}
        >
          Dang xuat
        </Button>

        <Text style={styles.footerHint}>
          Neu can cap nhat thong tin giao vien, vui long lien he van phong nha truong.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
  },
  heroCard: {
    borderRadius: 24,
    backgroundColor: '#0f172a',
    overflow: 'hidden',
    marginBottom: 8,
  },
  heroContent: {
    alignItems: 'center',
    gap: 10,
  },
  heroAvatar: {
    backgroundColor: '#e9e4ff',
  },
  heroAvatarLabel: {
    color: '#5b2dbd',
    fontWeight: '800',
  },
  heroTextWrap: {
    alignItems: 'center',
    gap: 4,
  },
  heroName: {
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  heroRole: {
    color: '#b794f4',
    fontWeight: '700',
  },
  heroEmail: {
    color: '#cbd5e1',
  },
  heroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  roleChip: {
    backgroundColor: '#eef2ff',
  },
  statusChip: {
    backgroundColor: '#ecfdf3',
  },
  sectionTitle: {
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  sectionCard: {
    borderRadius: 24,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8edf3',
    elevation: 0,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  sectionContent: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  rowButton: {
    minHeight: 82,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    backgroundColor: '#fff',
  },
  rowIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowTextWrap: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingRight: 6,
  },
  rowTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    color: '#111827',
  },
  rowSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: '#64748b',
  },
  sectionDivider: {
    marginHorizontal: 16,
    backgroundColor: '#d6dbe4',
  },
  rowPressed: {
    backgroundColor: '#f8fafc',
  },
  logoutButton: {
    borderRadius: 18,
    backgroundColor: '#fee2e2',
  },
  logoutButtonContent: {
    minHeight: 52,
  },
  logoutButtonLabel: {
    color: '#B42318',
    fontWeight: '700',
  },
  footerHint: {
    marginTop: 14,
    color: '#667085',
    textAlign: 'center',
    lineHeight: 20,
  },
  dialog: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  dialogTitle: {
    textAlign: 'center',
    fontWeight: '700',
  },
  dialogText: {
    textAlign: 'center',
    color: '#475467',
    lineHeight: 20,
  },
  dialogActions: {
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  dialogButton: {
    minWidth: 120,
    borderRadius: 14,
  },
  dialogDangerButton: {
    backgroundColor: '#D92D20',
  },
});

export default TeacherProfileScreen;
