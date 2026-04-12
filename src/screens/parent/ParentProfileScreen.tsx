import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Button, Card, Chip, Dialog, Divider, Portal, Text } from 'react-native-paper';
import { Heart, LogOut, Mail, MapPin, Phone, ShieldCheck, UserRound, RefreshCw, BadgeInfo } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/auth.service';
import { studentService } from '../../services/student.service';

type ParentProfile = {
  parentId?: number;
  userId?: number;
  fullName?: string;
  username?: string;
  email?: string;
  phone?: string;
  occupation?: string;
  workAddress?: string;
  emergencyContact?: string;
  relationship?: string;
  address?: string;
  children?: Array<any>;
  child?: any;
  [key: string]: any;
};

type ChildProfile = {
  id: number;
  fullName: string;
  classId?: number;
  className?: string;
  currentClass?: string;
  dateOfBirth?: string;
  gender?: string;
  photo?: string;
  healthNote?: string;
  bloodType?: string;
};

const ParentProfileScreen = () => {
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  const spacing = isTablet ? 24 : 16;
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();

  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [parentProfile, setParentProfile] = useState<ParentProfile | null>(null);
  const [childProfile, setChildProfile] = useState<ChildProfile | null>(null);

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    setProfileError(null);
    try {
      const response = await authService.getProfile();
      const raw = response?.data ?? response?.result ?? response?.payload ?? response ?? {};
      const profile = Array.isArray(raw) ? raw[0] : raw;
      setParentProfile(profile);

      const linkedChild = await studentService.getPrimaryForAccount({
        ...user,
        parentId: profile?.parentId ?? profile?.ParentId ?? user?.parentId ?? user?.ParentId,
        userId: profile?.userId ?? profile?.UserId ?? user?.id ?? user?.userId,
      });
      setChildProfile(
        linkedChild
          ? {
              id: linkedChild.id,
              fullName: linkedChild.fullName,
              classId: linkedChild.classId,
              className: linkedChild.className ?? linkedChild.currentClass,
              currentClass: linkedChild.currentClass ?? linkedChild.className,
              dateOfBirth: linkedChild.dateOfBirth,
              gender: linkedChild.gender,
              photo: linkedChild.photo,
              healthNote: (linkedChild as any)?.healthNote,
              bloodType: (linkedChild as any)?.bloodType,
            }
          : null
      );
    } catch (error) {
      setProfileError('Khong tai duoc thong tin tai khoan.');
      console.error('Load parent profile failed:', error);
    } finally {
      setLoadingProfile(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const parentInfo = useMemo(
    () => ({
      name:
        parentProfile?.fullName ||
        parentProfile?.username ||
        user?.fullName ||
        user?.username ||
        'Phu huynh',
      email:
        parentProfile?.email ||
        user?.email ||
        `${String(parentProfile?.username || user?.username || 'parent').toLowerCase().replace(/\s+/g, '')}@kms.edu.vn`,
      phone: parentProfile?.phone || user?.phone || 'Dang cap nhat',
      address: parentProfile?.address || parentProfile?.workAddress || 'Dang cap nhat',
      relationship: parentProfile?.relationship || 'Cha de',
      occupation: parentProfile?.occupation || 'Dang cap nhat',
      workAddress: parentProfile?.workAddress || 'Dang cap nhat',
      emergencyContact: parentProfile?.emergencyContact || 'Dang cap nhat',
      parentId: parentProfile?.parentId ?? user?.parentId ?? user?.ParentId,
      userId: parentProfile?.userId ?? user?.id,
    }),
    [parentProfile, user]
  );

  const childInfo = useMemo(
    () => ({
      name: childProfile?.fullName || '',
      dateOfBirth: childProfile?.dateOfBirth || '',
      className: childProfile?.className || childProfile?.currentClass || 'Dang cap nhat',
      gender: childProfile?.gender || 'Dang cap nhat',
      bloodType: childProfile?.bloodType || 'Dang cap nhat',
      healthNote: childProfile?.healthNote || 'Dang cap nhat',
      childId: childProfile?.id,
      classId: childProfile?.classId,
      photo: childProfile?.photo || '',
    }),
    [childProfile]
  );

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) {
      return null;
    }
    const today = new Date();
    const birth = new Date(dateOfBirth);
    if (Number.isNaN(birth.getTime())) {
      return null;
    }
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    return age;
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setLogoutDialogVisible(false);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Portal>
        <Dialog
          visible={logoutDialogVisible}
          onDismiss={() => !loggingOut && setLogoutDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Dang xuat</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Ban co chac chan muon dang xuat khoi ung dung khong?
            </Text>
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
        {profileError ? (
          <Card style={styles.errorCard}>
            <Card.Content style={styles.errorCardContent}>
              <BadgeInfo size={18} color="#B42318" />
              <Text style={styles.errorText}>{profileError}</Text>
              <Button mode="text" compact onPress={loadProfile} icon={() => <RefreshCw size={16} color="#B42318" />}>
                Tai lai
              </Button>
            </Card.Content>
          </Card>
        ) : null}

        <Card style={styles.heroCard}>
          <View style={styles.heroGlowTop} />
          <Card.Content style={[styles.heroContent, { padding: spacing + 4 }]}>
            <Avatar.Text
              size={72}
              label={parentInfo.name.slice(0, 2).toUpperCase()}
              style={styles.heroAvatar}
              labelStyle={styles.heroAvatarLabel}
            />
            <View style={styles.heroTextWrap}>
              <Text variant="headlineSmall" style={styles.heroName}>
                {parentInfo.name}
              </Text>
              <Text variant="bodyMedium" style={styles.heroRole}>
                Phu huynh hoc sinh
              </Text>
              <Text variant="bodySmall" style={styles.heroEmail}>
                {parentInfo.email}
              </Text>
              <Text variant="bodySmall" style={styles.heroMeta}>
                Nghe nghiep: {parentInfo.occupation}
              </Text>
            </View>
            <Chip icon="shield-check" compact style={styles.statusChip}>
              Tai khoan hoat dong
            </Chip>
          </Card.Content>
        </Card>

        <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: spacing + 8 }]}>
          Thong tin phu huynh
        </Text>
        <Card style={styles.sectionCard}>
          <Card.Content style={styles.sectionContent}>
            <InfoRow
              icon={<UserRound size={18} color="#155EEF" />}
              iconBg="#EAF2FF"
              label="Ho ten"
              value={parentInfo.name}
            />
            <Divider />
            <InfoRow
              icon={<Mail size={18} color="#6941C6" />}
              iconBg="#F4EBFF"
              label="Email"
              value={parentInfo.email}
            />
            <Divider />
            <InfoRow
              icon={<Phone size={18} color="#027A48" />}
              iconBg="#ECFDF3"
              label="So dien thoai"
              value={parentInfo.phone}
            />
            <Divider />
            <InfoRow
              icon={<MapPin size={18} color="#B54708" />}
              iconBg="#FFF6ED"
              label="Dia chi / noi lam viec"
              value={parentInfo.address}
            />
            <Divider />
            <InfoRow
              icon={<Heart size={18} color="#C11574" />}
              iconBg="#FDF2FA"
              label="Moi quan he"
              value={parentInfo.relationship}
            />
            <Divider />
            <InfoRow
              icon={<Phone size={18} color="#027A48" />}
              iconBg="#ECFDF3"
              label="Lien he khan cap"
              value={parentInfo.emergencyContact}
            />
          </Card.Content>
        </Card>

        <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: spacing + 8 }]}>
          Thong tin con em
        </Text>
        <Card style={styles.sectionCard}>
          <Card.Content style={styles.sectionContent}>
            <View style={styles.childHeader}>
              <Avatar.Text
                size={56}
                label={childInfo.name ? childInfo.name.slice(0, 2).toUpperCase() : '--'}
                style={styles.childAvatar}
                labelStyle={styles.childAvatarLabel}
              />
              <View style={styles.childHeaderText}>
                <Text variant="titleMedium" style={styles.childName}>
                  {childInfo.name || 'Thong tin hoc sinh dang cap nhat'}
                </Text>
                <Text variant="bodySmall" style={styles.childClass}>
                  Lop: {childInfo.className}
                </Text>
                <Text variant="bodySmall" style={styles.childClass}>
                  Ma hoc sinh: {childInfo.childId ?? 'Dang cap nhat'}
                </Text>
                <View style={styles.childChips}>
                  {calculateAge(childInfo.dateOfBirth) !== null ? (
                    <Chip compact style={styles.ageChip}>
                      {calculateAge(childInfo.dateOfBirth)} tuoi
                    </Chip>
                  ) : (
                    <Chip compact style={styles.ageChip}>
                      Dang cap nhat
                    </Chip>
                  )}
                  <Chip compact style={styles.genderChip}>
                    {childInfo.gender}
                  </Chip>
                </View>
              </View>
            </View>
            <Divider style={styles.childDivider} />
            <SimpleRow
              label="Ngay sinh"
              value={childInfo.dateOfBirth ? new Date(childInfo.dateOfBirth).toLocaleDateString('vi-VN') : 'Dang cap nhat'}
            />
            <Divider />
            <SimpleRow label="Lop hien tai" value={childInfo.className} />
            <Divider />
            <SimpleRow label="Ghi chu suc khoe" value={childInfo.healthNote} />
          </Card.Content>
        </Card>

        <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: spacing + 8 }]}>
          Tong quan
        </Text>
        <View style={styles.statsRow}>
          <Card style={[styles.statCard, styles.statPurple]}>
            <Card.Content style={styles.statContent}>
              <Text style={styles.statValue}>92%</Text>
              <Text style={styles.statLabel}>Diem danh</Text>
            </Card.Content>
          </Card>
          <Card style={[styles.statCard, styles.statGreen]}>
            <Card.Content style={styles.statContent}>
              <ShieldCheck size={26} color="#067647" />
              <Text style={[styles.statValue, styles.statValueSuccess]}>Da dong</Text>
              <Text style={styles.statLabel}>Hoc phi thang 3</Text>
            </Card.Content>
          </Card>
        </View>

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
          Neu can cap nhat thong tin phu huynh hoac hoc sinh, vui long lien he van phong nha truong.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow = ({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
}) => (
  <View style={styles.infoRow}>
    <View style={[styles.infoIcon, { backgroundColor: iconBg }]}>{icon}</View>
    <View style={styles.infoTextWrap}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const SimpleRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.simpleRow}>
    <Text style={styles.simpleLabel}>{label}</Text>
    <Text style={styles.simpleValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  container: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  heroCard: {
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#111827',
  },
  heroGlowTop: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroContent: {
    gap: 14,
  },
  heroAvatar: {
    alignSelf: 'flex-start',
    backgroundColor: '#7C3AED',
  },
  heroAvatarLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  heroTextWrap: {
    gap: 4,
  },
  heroName: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  heroRole: {
    color: '#C7D2FE',
  },
  heroEmail: {
    color: '#E5E7EB',
  },
  heroMeta: {
    color: '#CBD5E1',
  },
  statusChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF3',
  },
  sectionTitle: {
    color: '#111827',
    fontWeight: '700',
    marginBottom: 10,
  },
  sectionCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  sectionContent: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextWrap: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    color: '#667085',
    fontSize: 12,
  },
  infoValue: {
    color: '#101828',
    fontSize: 16,
    fontWeight: '600',
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  childAvatar: {
    backgroundColor: '#EEF4FF',
  },
  childAvatarLabel: {
    color: '#3538CD',
    fontWeight: '700',
  },
  childHeaderText: {
    flex: 1,
    gap: 4,
  },
  childName: {
    color: '#101828',
    fontWeight: '700',
  },
  childClass: {
    color: '#667085',
  },
  childChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  ageChip: {
    backgroundColor: '#EAF2FF',
  },
  genderChip: {
    backgroundColor: '#FDF2FA',
  },
  childDivider: {
    marginTop: 2,
  },
  simpleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  simpleLabel: {
    flex: 1,
    color: '#667085',
  },
  simpleValue: {
    flex: 1,
    color: '#101828',
    textAlign: 'right',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 24,
  },
  statPurple: {
    backgroundColor: '#F5F3FF',
  },
  statGreen: {
    backgroundColor: '#ECFDF3',
  },
  statContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 132,
    gap: 6,
  },
  statValue: {
    color: '#6D28D9',
    fontSize: 32,
    fontWeight: '800',
  },
  statValueSuccess: {
    color: '#067647',
    fontSize: 24,
  },
  statLabel: {
    color: '#667085',
  },
  logoutButton: {
    borderRadius: 18,
    backgroundColor: '#FEE4E2',
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
  errorCard: {
    borderRadius: 18,
    marginBottom: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    flex: 1,
    color: '#B42318',
    lineHeight: 18,
  },
  dialog: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
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

export default ParentProfileScreen;
