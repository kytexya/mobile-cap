import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View, SafeAreaView, Dimensions } from 'react-native';
import { ActivityIndicator, Button, Chip, Text } from 'react-native-paper';
import { Info, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { notificationService } from '../../services/notification.service';

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
};

const ProfileNotificationsScreen = () => {
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  const spacing = isTablet ? 24 : 16;
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterUnread, setFilterUnread] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await notificationService.getMyNotifications();
      const data = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
      setItems(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Khong tai duoc thong bao.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = useMemo(() => items.filter((x) => !x.isRead).length, [items]);
  const visibleItems = useMemo(
    () => (filterUnread ? items.filter((x) => !x.isRead) : items),
    [items, filterUnread]
  );

  const markAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
    } catch {
      // Keep UI stable if API fails.
    }
  };

  const renderIcon = (item: NotificationItem) => {
    if (item.isRead) return <CheckCircle size={20} color="#6b7280" />;
    if (/kh.n|c.nh b.o|alert/i.test(item.title)) return <AlertTriangle size={20} color="#dc2626" />;
    return <Info size={20} color="#2563eb" />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.topBar, { padding: spacing }]}>
        <Chip selected={!filterUnread} onPress={() => setFilterUnread(false)} style={styles.chip}>
          Tat ca
        </Chip>
        <Chip selected={filterUnread} onPress={() => setFilterUnread(true)} style={styles.chip}>
          Chua doc ({unreadCount})
        </Chip>
        <Button onPress={fetchNotifications}>Tai lai</Button>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text>{error}</Text>
        </View>
      ) : (
        <FlatList
          key={isTablet ? 'tablet' : 'mobile'}
          numColumns={isTablet ? 2 : 1}
          columnWrapperStyle={isTablet ? { gap: spacing, marginBottom: spacing } : undefined}
          data={visibleItems}
          keyExtractor={(item, index) => String(item.id ?? item.title ?? item.createdAt ?? index)}
          contentContainerStyle={[styles.list, { padding: spacing }]}
          ListEmptyComponent={<Text>Khong co thong bao.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.item, isTablet && styles.itemTablet, !item.isRead && styles.unreadItem]}
              onPress={() => !item.isRead && markAsRead(item.id)}
            >
              <View style={styles.iconWrap}>{renderIcon(item)}</View>
              <View style={styles.content}>
                <Text style={[styles.title, !item.isRead && styles.unreadTitle]}>{item.title}</Text>
                <Text>{item.message}</Text>
                <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
  },
  chip: { backgroundColor: '#f3f4f6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 24, gap: 10 },
  item: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    width: '100%',
  },
  itemTablet: { flex: 1 },
  unreadItem: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  iconWrap: { marginRight: 10, marginTop: 2 },
  content: { flex: 1, gap: 4 },
  title: { fontWeight: '500' },
  unreadTitle: { fontWeight: '700' },
  time: { color: '#6b7280', fontSize: 12 },
});

export default ProfileNotificationsScreen;
