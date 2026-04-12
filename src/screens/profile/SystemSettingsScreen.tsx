import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, SafeAreaView, Dimensions } from 'react-native';
import { ActivityIndicator, Button, Text, Card } from 'react-native-paper';
import { systemSettingsService, SystemSettingItem } from '../../services/systemSettings.service';

const SystemSettingsScreen = () => {
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  const spacing = isTablet ? 24 : 16;
  const [items, setItems] = useState<SystemSettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await systemSettingsService.getAll();
      const data = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
      setItems(data);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setError('Tai khoan hien tai khong co quyen xem cau hinh he thong.');
      } else {
        setError(err?.response?.data?.message || err?.message || 'Khong tai duoc cau hinh he thong.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Button mode="outlined" onPress={loadSettings} style={styles.retryBtn}>
          Thu lai
        </Button>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={items}
        key={isTablet ? 'tablet' : 'mobile'}
        numColumns={isTablet ? 2 : 1}
        columnWrapperStyle={isTablet ? { gap: spacing, marginBottom: spacing } : undefined}
        keyExtractor={(item, index) => String(item.settingId ?? (item as any).key ?? (item as any).name ?? index)}
        contentContainerStyle={[styles.list, { padding: spacing }]}
        ListEmptyComponent={<Text>Khong co du lieu cau hinh.</Text>}
        renderItem={({ item }) => (
          <Card style={[styles.item, isTablet && styles.itemTablet]}>
            <Card.Content>
              <Text style={styles.key}>{item.settingKey}</Text>
              <Text style={styles.value}>{item.settingValue || '-'}</Text>
              {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
            </Card.Content>
          </Card>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  list: { paddingBottom: 24, gap: 16 },
  item: { marginBottom: 16, borderRadius: 12 },
  itemTablet: { flex: 1, marginBottom: 0 },
  key: { fontWeight: '700' },
  value: { color: '#111827' },
  description: { color: '#6b7280', fontSize: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  error: { textAlign: 'center' },
  retryBtn: { marginTop: 12 },
});

export default SystemSettingsScreen;
