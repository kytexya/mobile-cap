import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Dimensions, ActivityIndicator } from 'react-native';
import { Text, Title, Button, useTheme, HelperText } from 'react-native-paper';
import { Info, AlertTriangle, CheckCircle, Check } from 'lucide-react-native';
import { notificationService } from '../../services/notification.service';
import { useAuthStore } from '../../store/authStore';
import { studentService } from '../../services/student.service';

const ParentNotificationsScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  const spacing = isTablet ? 24 : 16;

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  // Helper to normalize isRead property from backend
  const getIsRead = (item: any): boolean => {
    return item?.isRead ?? false;
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const child = await studentService.getPrimaryForAccount(user);
      const childName = String(child?.fullName ?? '').trim().toLowerCase();
      const response = await notificationService.getMyNotifications();
      console.log('[API] Raw response:', JSON.stringify(response, null, 2));

      const rawNotifications = response.success && response.data
        ? (Array.isArray(response.data) ? response.data : [response.data])
        : Array.isArray(response)
          ? response
          : [];

      const targetUserId = Number(user?.id ?? user?.parentId ?? user?.ParentId ?? 0);
      const filtered = rawNotifications.filter((item: any) => {
        const notificationUserId = Number(item.userId ?? item.UserId ?? item.parentId ?? item.ParentId ?? 0);
        if (Number.isFinite(targetUserId) && targetUserId > 0 && notificationUserId > 0 && notificationUserId === targetUserId) {
          return true;
        }

        if (!childName) return true;

        const text = String([item.title, item.message, item.content].filter(Boolean).join(' ')).toLowerCase();
        return text.includes(childName);
      });

      // Normalize notifications to always have isRead property
      const normalized = filtered.map((item: any) => ({
        ...item,
        isRead: getIsRead(item),
      }));

      console.log('[Notifications] First item:', normalized[0]);
      console.log('[Notifications] Total:', normalized.length, 'Unread:', normalized.filter((n: { isRead: boolean }) => !n.isRead).length);

      setNotifications(normalized);
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
      setError(err?.message || 'Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      for (const notif of unreadNotifications) {
        const notifId = notif.notificationId;
        if (notifId) {
          await notificationService.markAsRead(notifId);
        }
      }
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err: any) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAsRead = async (notification: any) => {
    try {
      console.log('[Click] Notification object:', notification);
      console.log('[Click] isRead value:', notification.isRead);
      console.log('[Click] notificationId:', notification.notificationId);

      // Use normalized isRead property
      if (notification.isRead) {
        console.log('[Click] Already read, skipping');
        return;
      }

      const notificationId = notification.notificationId;
      if (!notificationId) {
        console.warn('[Click] No notificationId found!');
        return;
      }

      console.log('[API] Calling markAsRead with ID:', notificationId);
      const result = await notificationService.markAsRead(Number(notificationId));
      console.log('[API] markAsRead result:', result);

      // Update local state immediately for better UX
      setNotifications(prev => prev.map(n =>
        n.notificationId === notificationId ? { ...n, isRead: true } : n
      ));
    } catch (err: any) {
      console.error('[Error] markAsRead failed:', err?.response?.data || err?.message || err);
    }
  };

  const getIcon = (type: string, read: boolean) => {
    const color = read ? '#999' : theme.colors.primary;
    switch (type) {
      case 'Alert': return <AlertTriangle size={24} color={read ? '#999' : '#f44336'} />;
      case 'Success': return <CheckCircle size={24} color={read ? '#999' : '#4caf50'} />;
      default: return <Info size={24} color={color} />;
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isRead = item.isRead; // Use normalized property
    const isUnread = !isRead;

    return (
      <TouchableOpacity
        style={[styles.notificationCard, isUnread && styles.unreadCard]}
        onPress={() => handleMarkAsRead(item)}
        activeOpacity={0.7}
      >
        {isUnread && <View style={styles.unreadIndicator} />}
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, isUnread && styles.unreadIconBox]}>
            {getIcon(item.type || 'Info', isRead)}
          </View>
          <View style={styles.contentBox}>
            <View style={styles.topRow}>
              <Text variant="titleMedium" style={[styles.title, isUnread && styles.unreadTitle]} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={styles.metaRow}>
                {isUnread && <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>Mới</Text></View>}
                <Text variant="bodySmall" style={styles.date}>{item.date || 'Hiện tại'}</Text>
              </View>
            </View>
            <Text variant="bodyMedium" numberOfLines={2} style={[styles.contentBody, isUnread && styles.unreadBody]}>
              {item.message || item.content}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { padding: spacing }]}>
        <View style={styles.headerTop}>
          <Title style={styles.headerTitle}>Thông báo</Title>
          <Button mode="text" onPress={markAllRead} icon={() => <Check size={16} color={theme.colors.primary} />}>
            Đọc tất cả
          </Button>
        </View>

        <View style={[styles.tabBar, { gap: spacing / 2 }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabLabel, activeTab === 'all' && styles.activeLabel]}>
              Tất cả ({notifications.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'unread' && styles.activeTab]}
            onPress={() => setActiveTab('unread')}
          >
            <Text style={[styles.tabLabel, activeTab === 'unread' && styles.activeLabel]}>
              Chưa đọc ({notifications.filter(n => !n.isRead).length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 12 }}>Đang tải thông báo...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <HelperText type="error">{error}</HelperText>
        </View>
      ) : notifications.length > 0 ? (
        <FlatList
          key={isTablet ? 'tablet' : 'mobile'}
          numColumns={isTablet ? 2 : 1}
          columnWrapperStyle={isTablet ? { gap: spacing, marginBottom: spacing } : undefined}
          data={activeTab === 'unread' ? notifications.filter(n => !n.isRead) : notifications}
          renderItem={renderItem}
          keyExtractor={(item, index) => String(item.notificationId ?? item.title ?? index)}
          contentContainerStyle={[styles.list, { padding: spacing }]}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text>Không có thông báo nào</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6200ee',
    paddingBottom: 8,
  },
  activeLabel: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  tab: {
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  tabLabel: {
    color: '#666',
    fontSize: 14,
  },
  unreadIconBox: {
    backgroundColor: '#EDE9FE',
  },
  unreadBody: {
    color: '#1F2937',
    fontWeight: '500',
  },
  unreadIndicator: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 4,
    backgroundColor: '#4F46E5',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  unreadBadge: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  list: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 16,
    width: '100%',
    borderRadius: 0,
    position: 'relative',
  },
  unreadCard: {
    backgroundColor: '#F5F3FF',
    borderLeftWidth: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contentBox: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontWeight: '400',
    color: '#9CA3AF',
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  date: {
    color: '#999',
    fontSize: 10,
  },
  contentBody: {
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ParentNotificationsScreen;
