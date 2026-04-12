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

      setNotifications(filtered);
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
        const notifId = notif.id ?? notif.notificationId ?? notif.NotificationId;
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
      const notificationId = notification.id ?? notification.notificationId ?? notification.NotificationId;
      if (!notificationId) {
        console.warn('No notification ID found:', notification);
        return;
      }
      await notificationService.markAsRead(notificationId);
      setNotifications(notifications.map(n =>
        (n.id === notificationId || n.notificationId === notificationId) ? { ...n, isRead: true } : n
      ));
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const getIcon = (type: string, isRead: boolean) => {
    const color = isRead ? '#999' : theme.colors.primary;
    switch (type) {
      case 'Alert': return <AlertTriangle size={24} color={isRead ? '#999' : '#f44336'} />;
      case 'Success': return <CheckCircle size={24} color={isRead ? '#999' : '#4caf50'} />;
      default: return <Info size={24} color={color} />;
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
      onPress={() => handleMarkAsRead(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>{getIcon(item.type || 'Info', item.isRead)}</View>
        <View style={styles.contentBox}>
          <View style={styles.topRow}>
            <Text variant="titleMedium" style={[styles.title, !item.isRead && styles.unreadTitle]}>{item.title}</Text>
            <Text variant="bodySmall" style={styles.date}>{item.date || 'Hiện tại'}</Text>
          </View>
          <Text variant="bodyMedium" numberOfLines={2} style={styles.contentBody}>{item.message || item.content}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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
          <TouchableOpacity style={styles.activeTab}>
            <Text style={styles.activeLabel}>Tất cả</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.inactiveTab}>
            <Text style={styles.inactiveLabel}>Chưa đọc ({notifications.filter(n => !n.isRead).length})</Text>
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
          <Text style={{ marginTop: 12, textAlign: 'center' }}>Đang hiển thị dữ liệu mặc định</Text>
        </View>
      ) : notifications.length > 0 ? (
        <FlatList
          key={isTablet ? 'tablet' : 'mobile'}
          numColumns={isTablet ? 2 : 1}
          columnWrapperStyle={isTablet ? { gap: spacing, marginBottom: spacing } : undefined}
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item, index) => String(item.id ?? item.title ?? item.createdAt ?? index)}
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
  inactiveTab: {
    paddingBottom: 8,
  },
  inactiveLabel: {
    color: '#666',
  },
  list: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  notificationCard: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    padding: 16,
    width: '100%',
    borderRadius: 12,
  },
  unreadCard: {
    backgroundColor: '#f6f0ff',
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
    fontWeight: 'normal',
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: 'bold',
    color: '#333',
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
