import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions, Linking } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from './src/store/authStore';
import { authService } from './src/services/auth.service';
import { studentService } from './src/services/student.service';
import { classTeacherService } from './src/services/classTeacher.service';
import RootNavigator from './src/navigation/RootNavigator';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6200EE',
    secondary: '#6200EE',
    accent: '#6200EE',
    background: '#F8F9FA',
    surface: '#ffffff',
    error: '#F44336',
    backdrop: 'rgba(0, 0, 0, 0.58)',
  },
  roundness: 16,
};

const unwrapProfile = (payload: any, depth = 0): any => {
  if (!payload || depth > 4) {
    return payload;
  }

  const candidates = [
    payload.data,
    payload.value,
    payload.result,
    payload.payload,
    payload.user,
    payload.profile,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      const unwrapped = unwrapProfile(candidate, depth + 1);
      if (unwrapped && typeof unwrapped === 'object' && Object.keys(unwrapped).length) {
        return unwrapped;
      }
    }
  }

  return payload;
};

const pickFirstNumber = (...values: any[]) => {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
  }
  return 0;
};

const pickFirstString = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

const resolveTeacherClassName = (profile: any, user: any) => {
  const currentClass = profile?.currentClass ?? profile?.class ?? profile?.assignedClass ?? profile?.teachingClass ?? user?.currentClass ?? user?.class ?? user?.assignedClass ?? user?.teachingClass;
  return pickFirstString(
    profile?.className,
    profile?.ClassName,
    currentClass?.className,
    currentClass?.name,
    currentClass?.title,
    currentClass?.displayName,
    user?.className,
    user?.ClassName,
    user?.currentClass?.className,
    user?.currentClass?.name,
    user?.assignedClass?.className,
    user?.assignedClass?.name,
    user?.teachingClass?.className,
    user?.teachingClass?.name
  );
};

const linking = {
  prefixes: ['kmsmobile://', ...(typeof window !== 'undefined' ? [window.location.origin] : [])],
  config: {
    screens: {
      Payment: 'Payment',
      PaymentSuccess: 'payment/success',
      PaymentFailed: 'payment/failed',
      PaymentReturn: 'payment/vnpay-return',
    },
  },
};

export default function App() {
  const loadAuth = useAuthStore((state) => state.loadAuth);
  const setAuth = useAuthStore((state) => state.setAuth);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const { width } = useWindowDimensions();
  const frameWidth = Math.min(width, 480);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    loadAuth();
  }, []);

  // Handle deep links for VNPAY payment callbacks
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      console.log('[App] Deep link received:', url);

      if (url.includes('payment/success') || url.includes('payment/failed') || url.includes('payment/vnpay-return')) {
        const queryString = url.split('?')[1] || '';
        const params = new URLSearchParams(queryString);
        const responseCode = params.get('vnp_ResponseCode');
        const transactionStatus = params.get('vnp_TransactionStatus');

        // For VNPAY return, navigate to PaymentReturnScreen first to process the callback
        if (url.includes('payment/vnpay-return') && responseCode) {
          const navigateToReturn = () => {
            navigationRef.current?.navigate?.('PaymentReturn', {
              vnp_ResponseCode: responseCode,
              vnp_TransactionStatus: transactionStatus,
              vnp_TxnRef: params.get('vnp_TxnRef'),
              vnp_Amount: params.get('vnp_Amount'),
              amount: params.get('amount'),
              month: params.get('month'),
              billId: params.get('billId'),
            });
          };

          if (navigationRef.current?.isReady?.()) {
            navigateToReturn();
          } else {
            setTimeout(navigateToReturn, 250);
          }
          return;
        }

        // Determine success based on URL path and response codes
        const isSuccess =
          url.includes('payment/success') ||
          (url.includes('payment/vnpay-return') && responseCode === '00' && transactionStatus === '00');

        // Extract payment details
        const transactionId = params.get('vnp_TxnRef') || `VNP${Date.now()}`;
        const rawAmount = Number(params.get('amount') ?? params.get('vnp_Amount') ?? 0);
        const amount = params.get('vnp_Amount') ? rawAmount / 100 : rawAmount;
        const month = params.get('month') ?? '';
        const billId = params.get('billId') ?? '';

        const navigateToResult = () => {
          if (isSuccess) {
            navigationRef.current?.navigate?.('PaymentSuccess', {
              transactionId,
              amount,
              month,
              paymentMethod: 'vnpay',
              billId,
            });
          } else {
            navigationRef.current?.navigate?.('PaymentFailed', {
              transactionId,
              amount,
              month,
              paymentMethod: 'vnpay',
              errorCode: responseCode || '99',
              errorMessage: responseCode === '24' ? 'Bạn đã hủy thanh toán' : 'Thanh toán không thành công',
              billId,
            });
          }
        };

        if (navigationRef.current?.isReady?.()) {
          navigateToResult();
        } else {
          setTimeout(navigateToResult, 250);
        }
      }
    };

    // Listen for incoming links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened from a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[App] Initial deep link:', url);
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncProfile = async () => {
      const needsTeacherSync =
        user?.role === 'Teacher' && (!user?.teacherId || !user?.classId || !user?.className);
      const needsParentSync =
        user?.role === 'Parent' && (!user?.parentId || !user?.ParentId || !user?.studentId || !user?.StudentId);

      if (!token || !user || (!needsTeacherSync && !needsParentSync)) {
        return;
      }

      try {
        const profileRes = await authService.getProfile();
        const profile = unwrapProfile(profileRes?.data ?? profileRes?.value ?? profileRes ?? {});
        if (cancelled || !profile || typeof profile !== 'object') {
          return;
        }

        const normalizedParentId = Number(
          (profile as any).parentId ??
          (profile as any).ParentId ??
          (profile as any).parent?.id ??
          (profile as any).parent?.parentId ??
          (profile as any).id ??
          user.parentId ??
          user.id
        );
        const normalizedStudentId = Number(
          (profile as any).studentId ??
          (profile as any).StudentId ??
          (profile as any).student?.id ??
          (profile as any).student?.studentId ??
          user.studentId ??
          0
        );
        const normalizedClassId = Number(
          (profile as any).classId ??
          (profile as any).ClassId ??
          (profile as any).currentClassId ??
          (profile as any).currentClass?.id ??
          (profile as any).currentClass?.classId ??
          (profile as any).assignedClass?.id ??
          (profile as any).assignedClass?.classId ??
          (profile as any).teachingClass?.id ??
          (profile as any).teachingClass?.classId ??
          (profile as any).class?.id ??
          (profile as any).class?.classId ??
          user.classId ??
          0
        );
        const normalizedTeacherId = Number(
          (profile as any).teacherId ??
          (profile as any).TeacherId ??
          (profile as any).userId ??
          (profile as any).id ??
          user.teacherId ??
          user.id ??
          0
        );
        const normalizedClassName = resolveTeacherClassName(profile, user);

        const mergedUser: any = {
          ...user,
          ...profile,
          role: user.role,
          id: Number((profile as any).userId ?? (profile as any).id ?? user.id),
          username: (profile as any).username ?? user.username,
          parentId: Number.isFinite(normalizedParentId) && normalizedParentId > 0 ? normalizedParentId : user.parentId,
          studentId: Number.isFinite(normalizedStudentId) && normalizedStudentId > 0 ? normalizedStudentId : user.studentId,
          classId: Number.isFinite(normalizedClassId) && normalizedClassId > 0 ? normalizedClassId : user.classId,
          teacherId: Number.isFinite(normalizedTeacherId) && normalizedTeacherId > 0 ? normalizedTeacherId : user.teacherId,
          className: normalizedClassName || user.className,
        };

        if (user.role === 'Teacher') {
          const resolvedTeacher = await classTeacherService.getPrimaryForAccount({
            ...mergedUser,
            ...profile,
          });
          if (resolvedTeacher) {
            mergedUser.teacherId = Number.isFinite(Number(resolvedTeacher.teacherId))
              ? Number(resolvedTeacher.teacherId)
              : mergedUser.teacherId;
            mergedUser.classId = Number.isFinite(Number(resolvedTeacher.classId))
              ? Number(resolvedTeacher.classId)
              : mergedUser.classId;
            mergedUser.className = resolvedTeacher.className || mergedUser.className;
          }
        }

        if (user.role === 'Parent') {
          const resolvedChild = await studentService.getPrimaryForAccount({
            ...mergedUser,
            ...profile,
          });
          if (resolvedChild) {
            mergedUser.studentId = Number.isFinite(Number(resolvedChild.studentId))
              ? Number(resolvedChild.studentId)
              : mergedUser.studentId;
            mergedUser.classId = Number.isFinite(Number(resolvedChild.classId))
              ? Number(resolvedChild.classId)
              : mergedUser.classId;
            mergedUser.className = resolvedChild.className || resolvedChild.currentClass || mergedUser.className;
            mergedUser.fullName = resolvedChild.fullName || mergedUser.fullName;
          }
        }

        // Check if still logged in (not cancelled/logout) before setting auth
        const currentToken = useAuthStore.getState().token;
        if (cancelled || !currentToken) {
          console.log('[auth] syncProfile aborted: user logged out during sync');
          return;
        }

        await setAuth(token, mergedUser);
      } catch (error) {
        if (__DEV__) {
          console.log('[auth] profile sync skipped:', error);
        }
      }
    };

    syncProfile();

    return () => {
      cancelled = true;
    };
  }, [token, user, setAuth]);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <View style={styles.appBackground}>
          <View style={[styles.phoneFrame, { width: frameWidth }]}>
            <NavigationContainer
              ref={navigationRef}
              linking={linking}
              fallback={<View style={styles.appBackground}><StatusBar style="auto" /></View>}
            >
              <RootNavigator />
              <StatusBar style="auto" />
            </NavigationContainer>
          </View>
        </View>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appBackground: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
  },
  phoneFrame: {
    flex: 1,
    maxWidth: 480,
    width: '100%',
  },
});
