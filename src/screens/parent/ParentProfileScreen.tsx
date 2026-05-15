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
  ParentId?: number;
  userId?: number;
  UserId?: number;
  fullName?: string;
  FullName?: string;
  username?: string;
  Username?: string;
  email?: string;
  Email?: string;
  phone?: string;
  Phone?: string;
  occupation?: string;
  Occupation?: string;
  workAddress?: string;
  WorkAddress?: string;
  emergencyContact?: string;
  EmergencyContact?: string;
  relationship?: string;
  Relationship?: string;
  address?: string;
  Address?: string;
  createdAt?: string;
  CreatedAt?: string;
  children?: Array<any>;
  child?: any;
  [key: string]: any;
};

type ChildProfile = {
  id: number;
  studentId?: number;
  studentCode?: string;
  fullName: string;
  classId?: number;
  className?: string;
  currentClass?: string;
  dateOfBirth?: string;
  age?: number;
  gender?: string;
  photo?: string;
  healthNote?: string;
  bloodType?: string;
  address?: string;
  enrollmentDate?: string;
  medicalNotes?: string;
  allergies?: string;
  active?: boolean;
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

      // If response contains parents array (from student endpoint), extract first parent
      const parentData = profile?.parents?.[0] ?? profile?.parent ?? profile;
      setParentProfile(parentData);

      const linkedChild = await studentService.getPrimaryForAccount({
        ...user,
        parentId: profile?.parentId ?? profile?.ParentId ?? user?.parentId ?? user?.ParentId,
        userId: profile?.userId ?? profile?.UserId ?? user?.id ?? user?.userId,
      });
      setChildProfile(
        linkedChild
          ? {
            id: linkedChild.id,
            studentId: linkedChild.studentId ?? linkedChild.StudentId,
            studentCode: linkedChild.studentCode ?? linkedChild.StudentCode,
            fullName: linkedChild.fullName ?? linkedChild.FullName,
            classId: linkedChild.classId ?? linkedChild.ClassId,
            className: (linkedChild.className ?? linkedChild.ClassName) || (linkedChild.currentClass ?? linkedChild.CurrentClass),
            currentClass: (linkedChild.currentClass ?? linkedChild.CurrentClass) || (linkedChild.className ?? linkedChild.ClassName),
            dateOfBirth: linkedChild.dateOfBirth ?? linkedChild.DateOfBirth,
            age: linkedChild.age ?? linkedChild.Age,
            gender: linkedChild.gender ?? linkedChild.Gender,
            photo: linkedChild.photo ?? linkedChild.Photo,
            healthNote: linkedChild.healthNote ?? linkedChild.HealthNote,
            bloodType: linkedChild.bloodType ?? linkedChild.BloodType,
            address: linkedChild.address ?? linkedChild.Address,
            enrollmentDate: linkedChild.enrollmentDate ?? linkedChild.EnrollmentDate,
            medicalNotes: linkedChild.medicalNotes ?? linkedChild.MedicalNotes,
            allergies: linkedChild.allergies ?? linkedChild.Allergies,
            active: linkedChild.active ?? linkedChild.Active,
          }
          : null
      );
    } catch (error) {
      setProfileError('Không tải được thông tin tài khoản.');
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
        parentProfile?.FullName ||
        parentProfile?.username ||
        parentProfile?.Username ||
        user?.fullName ||
        user?.username ||
        'Phụ huynh',
      email:
        parentProfile?.email ||
        parentProfile?.Email ||
        user?.email ||
        `${String(parentProfile?.username || parentProfile?.Username || user?.username || 'parent').toLowerCase().replace(/\s+/g, '')}@kms.edu.vn`,
      phone: parentProfile?.phone || parentProfile?.Phone || user?.phone || 'Đang cập nhật',
      address: parentProfile?.address || parentProfile?.Address || parentProfile?.workAddress || parentProfile?.WorkAddress || 'Đang cập nhật',
      relationship: parentProfile?.relationship || parentProfile?.Relationship || 'Cha đẻ',
      occupation: parentProfile?.occupation || parentProfile?.Occupation || 'Đang cập nhật',
      workAddress: parentProfile?.workAddress || parentProfile?.WorkAddress || 'Đang cập nhật',
      emergencyContact: parentProfile?.emergencyContact || parentProfile?.EmergencyContact || 'Đang cập nhật',
      parentId: parentProfile?.parentId ?? parentProfile?.ParentId ?? user?.parentId ?? user?.ParentId,
      userId: parentProfile?.userId ?? parentProfile?.UserId ?? user?.id,
      createdAt: parentProfile?.createdAt || parentProfile?.CreatedAt || '',
    }),
    [parentProfile, user]
  );

  const childInfo = useMemo(
    () => ({
      name: childProfile?.fullName || '',
      studentCode: childProfile?.studentCode || 'Đang cập nhật',
      dateOfBirth: childProfile?.dateOfBirth || '',
      className: childProfile?.className || childProfile?.currentClass || 'Đang cập nhật',
      gender: childProfile?.gender || 'Đang cập nhật',
      bloodType: childProfile?.bloodType || 'Đang cập nhật',
      healthNote: childProfile?.healthNote || 'Đang cập nhật',
      childId: childProfile?.id,
      classId: childProfile?.classId,
      photo: childProfile?.photo || '',
      age: childProfile?.age,
      // address: childProfile?.address || 'Dang cap nhat',
      // enrollmentDate: childProfile?.enrollmentDate || '',
      // medicalNotes: childProfile?.medicalNotes || 'Dang cap nhat',
      allergies: childProfile?.allergies || 'Không có',
      active: childProfile?.active ?? true,
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
          <Dialog.Title style={styles.dialogTitle}>Đăng xuất</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng không?
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              mode="outlined"
              onPress={() => setLogoutDialogVisible(false)}
              disabled={loggingOut}
              style={styles.dialogButton}
            >
              Hủy
            </Button>
            <Button
              mode="contained"
              onPress={handleLogout}
              loading={loggingOut}
              disabled={loggingOut}
              style={[styles.dialogButton, styles.dialogDangerButton]}
            >
              Đăng xuất
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
                Tải lại
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
                Phụ huynh học sinh
              </Text>
              <Text variant="bodySmall" style={styles.heroEmail}>
                {parentInfo.email}
              </Text>
              <Text variant="bodySmall" style={styles.heroMeta}>
                Nghề nghiệp: {parentInfo.occupation}
              </Text>
            </View>
            <Chip icon="shield-check" compact style={styles.statusChip}>
              Tài khoản hoạt động
            </Chip>
          </Card.Content>
        </Card>

        <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: spacing + 8 }]}>
          Thông tin phụ huynh
        </Text>
        <Card style={styles.sectionCard}>
          <Card.Content style={styles.sectionContent}>
            <InfoRow
              icon={<UserRound size={18} color="#155EEF" />}
              iconBg="#EAF2FF"
              label="Họ tên"
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
              label="Số điện thoại"
              value={parentInfo.phone}
            />
            <Divider />
            <InfoRow
              icon={<MapPin size={18} color="#B54708" />}
              iconBg="#FFF6ED"
              label="Địa chỉ / Nơi làm việc"
              value={parentInfo.address}
            />
            <Divider />
            <InfoRow
              icon={<Heart size={18} color="#C11574" />}
              iconBg="#FDF2FA"
              label="Mối quan hệ"
              value={parentInfo.relationship}
            />
            {/* <Divider />
            <InfoRow
              icon={<Phone size={18} color="#027A48" />}
              iconBg="#ECFDF3"
              label="Liên hệ khẩn cấp"
              value={parentInfo.emergencyContact}
            /> */}
            {/* <Divider /> */}
            {/* <InfoRow
              icon={<ShieldCheck size={18} color="#4F46E5" />}
              iconBg="#EEF2FF"
              label="Mã phụ huynh"
              value={String(parentInfo.parentId || 'Dang cap nhat')}
            /> */}
            {/* <Divider /> */}
            {/* <InfoRow
              icon={<UserRound size={18} color="#6B7280" />}
              iconBg="#F3F4F6"
              label="Mã người dùng"
              value={String(parentInfo.userId || 'Dang cap nhat')}
            /> */}
            {/* <Divider />
            <InfoRow
              icon={<BadgeInfo size={18} color="#7C3AED" />}
              iconBg="#F3E8FF"
              label="Ngày tạo tài khoản"
              value={parentInfo.createdAt ? new Date(parentInfo.createdAt).toLocaleDateString('vi-VN') : 'Đang cập nhật'}
            /> */}
          </Card.Content>
        </Card>

        <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: spacing + 8 }]}>
          Thông tin con em
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
                  {childInfo.name || 'Thông tin học sinh đang cập nhật'}
                </Text>
                <Text variant="bodySmall" style={styles.childClass}>
                  Lớp: {childInfo.className}
                </Text>
                <Text variant="bodySmall" style={styles.childClass}>
                  Mã học sinh: {childInfo.childId ?? 'Đang cập nhật'}
                </Text>
                <View style={styles.childChips}>
                  {calculateAge(childInfo.dateOfBirth) !== null ? (
                    <Chip compact style={styles.ageChip}>
                      {calculateAge(childInfo.dateOfBirth)} tuổi
                    </Chip>
                  ) : (
                    <Chip compact style={styles.ageChip}>
                      Đang cập nhật
                    </Chip>
                  )}
                  <Chip compact style={styles.genderChip}>
                    {childInfo.gender}
                  </Chip>
                </View>
              </View>
            </View>
            {/* <Divider style={styles.childDivider} /> */}
            <SimpleRow
              label="Mã học sinh"
              value={childInfo.studentCode}
            />
            <Divider />
            <SimpleRow
              label="Ngày sinh"
              value={childInfo.dateOfBirth ? new Date(childInfo.dateOfBirth).toLocaleDateString('vi-VN') : 'Dang cap nhat'}
            />
            <Divider />
            <SimpleRow label="Tuổi" value={childInfo.age ? `${childInfo.age} tuổi` : 'Đang cập nhật'} />
            <Divider />
            <SimpleRow label="Giới tính" value={childInfo.gender === 'Male' ? 'Nam' : childInfo.gender === 'Female' ? 'Nữ' : childInfo.gender} />
            <Divider />
            {/* <SimpleRow label="Nhóm máu" value={childInfo.bloodType} />
            <Divider />
            <SimpleRow label="Địa chỉ" value={childInfo.address} />
            <Divider />
            <SimpleRow label="Ngày nhập học" value={childInfo.enrollmentDate ? new Date(childInfo.enrollmentDate).toLocaleDateString('vi-VN') : 'Đang cập nhật'} />
            <Divider /> */}
            <SimpleRow label="Dị ứng" value={childInfo.allergies} />
            <Divider />
            {/* <SimpleRow label="Ghi chú sức khỏe" value={childInfo.medicalNotes} /> */}
          </Card.Content>
        </Card>

        <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: spacing + 8 }]}>
          Tổng quan
        </Text>
        <View style={styles.statsRow}>
          <Card style={[styles.statCard, styles.statPurple]}>
            <Card.Content style={styles.statContent}>
              <Text style={styles.statValue}>92%</Text>
              <Text style={styles.statLabel}>Điểm danh</Text>
            </Card.Content>
          </Card>
          <Card style={[styles.statCard, styles.statGreen]}>
            <Card.Content style={styles.statContent}>
              <ShieldCheck size={26} color="#067647" />
              <Text style={[styles.statValue, styles.statValueSuccess]}>Đã đóng</Text>
              <Text style={styles.statLabel}>Học phí tháng 3</Text>
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
          Đăng xuất
        </Button>

        <Text style={styles.footerHint}>
          Nếu cần cập nhật thông tin phụ huynh hoặc học sinh, vui lòng liên hệ văn phòng nhà trường.
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
