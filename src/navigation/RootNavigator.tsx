import React from 'react';
import { Platform, Dimensions, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BellRing,
  Camera,
  ClipboardList,
  CreditCard,
  Home,
  Settings,
  User2,
  UtensilsCrossed
} from 'lucide-react-native';

// Stores
import { useAuthStore } from '../store/authStore';

// Screens
import LoginScreen from '../screens/LoginScreen';
import ParentActivitiesScreen from '../screens/parent/ParentActivitiesScreen';
import ParentAttendanceScreen from '../screens/parent/ParentAttendanceScreen';
import ParentHomeScreen from '../screens/parent/ParentHomeScreen';
import ParentProfileScreen from '../screens/parent/ParentProfileScreen';
import ParentTuitionScreen from '../screens/parent/ParentTuitionScreen';
import ParentMenuScreen from '../screens/parent/ParentMenuScreen';

import ChangePasswordScreen from '../screens/profile/ChangePasswordScreen';
import ProfileNotificationsScreen from '../screens/profile/ProfileNotificationsScreen';
import SystemSettingsScreen from '../screens/profile/SystemSettingsScreen';

import TeacherActivitiesScreen from '../screens/teacher/TeacherActivitiesScreen';
import TeacherAnnouncementsScreen from '../screens/teacher/TeacherAnnouncementsScreen';
import TeacherAttendanceScreen from '../screens/teacher/TeacherAttendanceScreen';
import TeacherHomeScreen from '../screens/teacher/TeacherHomeScreen';
import TeacherProfileScreen from '../screens/teacher/TeacherProfileScreen';
import TeacherMealHubScreen from '../screens/teacher/TeacherMealHubScreen';
import TeacherMealEvaluationScreen from '../screens/teacher/TeacherMealEvaluationScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const getTabBarStyle = (insets: any) => ({
  backgroundColor: '#FFFFFF',
  borderTopWidth: 1,
  borderTopColor: '#F3F4F6',
  height: Platform.OS === 'ios' ? 64 + insets.bottom : 70,
  paddingBottom: Platform.OS === 'ios' ? insets.bottom : 12,
  paddingTop: 8,
  elevation: 15,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.08,
  shadowRadius: 10,
});

const TeacherTabs = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const iconSize = SCREEN_WIDTH < 380 ? 22 : 24; // Giảm size icon cho máy nhỏ
          if (route.name === 'Home') return <Home size={iconSize} color={color} />;
          if (route.name === 'Attendance') return <ClipboardList size={iconSize} color={color} />;
          if (route.name === 'Activities') return <Camera size={iconSize} color={color} />;
          if (route.name === 'Announcements') return <BellRing size={iconSize} color={color} />;
          if (route.name === 'Menu') return <UtensilsCrossed size={iconSize} color={color} />;
          if (route.name === 'Profile') return <User2 size={iconSize} color={color} />;
          return null;
        },
        tabBarActiveTintColor: '#6200EE',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: getTabBarStyle(insets),
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -4,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={TeacherHomeScreen} options={{ title: 'Trang chủ' }} />
      <Tab.Screen name="Menu" component={TeacherMealHubScreen} options={{ title: 'Bữa ăn' }} />
      <Tab.Screen name="Attendance" component={TeacherAttendanceScreen} options={{ title: 'Điểm danh' }} />
      <Tab.Screen name="Activities" component={TeacherActivitiesScreen} options={{ title: 'Hoạt động' }} />
      <Tab.Screen name="Announcements" component={TeacherAnnouncementsScreen} options={{ title: 'Thông báo' }} />
      <Tab.Screen name="Profile" component={TeacherProfileScreen} options={{ title: 'Cá nhân' }} />
    </Tab.Navigator>
  );
};

const ParentTabs = () => {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const iconSize = SCREEN_WIDTH < 380 ? 22 : 24;
          if (route.name === 'Home') return <Home size={iconSize} color={color} />;
          if (route.name === 'Menu') return <UtensilsCrossed size={iconSize} color={color} />;
          if (route.name === 'Attendance') return <ClipboardList size={iconSize} color={color} />;
          if (route.name === 'Activities') return <Camera size={iconSize} color={color} />;
          if (route.name === 'Tuition') return <CreditCard size={iconSize} color={color} />;
          if (route.name === 'Profile') return <Settings size={iconSize} color={color} />;
          return null;
        },
        tabBarActiveTintColor: '#6200EE',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: getTabBarStyle(insets),
        tabBarHideOnKeyboard: true,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={ParentHomeScreen} />
      <Tab.Screen name="Menu" component={ParentMenuScreen} />
      <Tab.Screen name="Attendance" component={ParentAttendanceScreen} />
      <Tab.Screen name="Activities" component={ParentActivitiesScreen} />
      <Tab.Screen name="Tuition" component={ParentTuitionScreen} />
      <Tab.Screen name="Profile" component={ParentProfileScreen} />
    </Tab.Navigator>
  );
};

const RootNavigator = () => {
  const { token, user } = useAuthStore();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerTitleAlign: 'center', // Luôn căn giữa tiêu đề cho đẹp mọi dòng máy
        animation: 'slide_from_right' // Hiệu ứng mượt mà
      }}
    >
      {token ? (
        <Stack.Group>
          {user?.role === 'Teacher' ? (
            <Stack.Screen name="TeacherApp" component={TeacherTabs} />
          ) : (
            <Stack.Screen name="ParentApp" component={ParentTabs} />
          )}

          {/* Screens dùng chung hoặc Modal */}
          <Stack.Screen
            name="SystemSettings"
            component={SystemSettingsScreen}
            options={{ headerShown: true, title: 'Cài đặt hệ thống' }}
          />
          <Stack.Screen
            name="ProfileNotifications"
            component={ProfileNotificationsScreen}
            options={{ headerShown: true, title: 'Thông báo' }}
          />
          <Stack.Screen
            name="ChangePassword"
            component={ChangePasswordScreen}
            options={{ headerShown: true, title: 'Đổi mật khẩu' }}
          />
          <Stack.Screen
            name="TeacherMealEvaluation"
            component={TeacherMealEvaluationScreen}
            options={{
              headerShown: true,
              title: 'Chi tiết đánh giá',
              headerShadowVisible: false
            }}
          />
        </Stack.Group>
      ) : (
        <Stack.Screen name="Auth" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;