import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, SafeAreaView, Dimensions, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Card, useTheme, Title, IconButton, RadioButton, SegmentedButtons, Divider } from 'react-native-paper';
import { Bell, Calendar, CheckCircle, ChevronDown, ChevronUp, Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { announcementService, type Announcement } from '../../services/announcement.service';
import { useAuthStore } from '../../store/authStore';

const TeacherAnnouncementsScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  const spacing = isTablet ? 24 : 16;
  const { user } = useAuthStore();
  const currentClassId = Number(user?.classId ?? user?.ClassId ?? user?.currentClassId ?? 0);
  const accountKey = [user?.classId, user?.ClassId, user?.currentClassId]
    .map((value) => Number(value))
    .find((value) => Number.isFinite(value) && value > 0);
  const [view, setView] = useState<'create' | 'history'>('create');
  
  // Create form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState('class'); // 'class' or 'all-campus'
  
  // History state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<number | null>(null);

  // Load announcements when switching to history view
  useEffect(() => {
    if (view === 'history') {
      loadAnnouncements();
    }
  }, [view, accountKey, currentClassId]);

  const loadAnnouncements = async () => {
    setLoadingHistory(true);
    try {
      if (!currentClassId) {
        setAnnouncements([]);
        setSelectedAnnouncementId(null);
        return;
      }
      const data = await announcementService.getAll({ classId: currentClassId });
      setAnnouncements(data);
      setSelectedAnnouncementId((prev) => (prev && data.some((item) => item.id === prev) ? prev : null));
    } catch (e: any) {
      Alert.alert('Lỗi', 'Không thể tải thông báo. Vui lòng thử lại.');
      console.error('Load announcements error:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCreate = async () => {
    if (!title || !content) {
      Alert.alert('Chưa đầy đủ', 'Vui lòng nhập tiêu đề và nội dung thông báo.');
      return;
    }

    if (target === 'class' && !currentClassId) {
      Alert.alert('Chua xac dinh lop', 'Khong the gui thong bao lop khi chua tai duoc lop cua giao vien.');
      return;
    }

    setLoading(true);
    try {
      await announcementService.create({
        title,
        content,
        targetAudience: target === 'class' ? 'Class' : 'School',
        targetClassId: target === 'class' ? currentClassId : null,
        priority: 'Normal',
        isPublished: false,
      });
      
      Alert.alert('Đã gởi', 'Thông báo đã được gởi đến phụ huynh thành công.');
      setTitle('');
      setContent('');
      setView('history');
      await loadAnnouncements();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể gởi thông báo. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const renderAnnouncementItem = ({ item }: { item: Announcement }) => {
    const isActive = item.id === selectedAnnouncementId;

    return (
      <TouchableOpacity onPress={() => setSelectedAnnouncementId((prev) => (prev === item.id ? null : item.id))}>
        <Card style={[styles.announcementCard, isActive && styles.announcementCardActive]}>
          <Card.Content>
            <View style={styles.announcementHeader}>
              <View style={{flex: 1}}>
                <Text variant="titleMedium" numberOfLines={2}>{item.title}</Text>
                <View style={styles.dateRow}>
                  <Calendar size={14} color="#666" />
                  <Text variant="labelSmall" style={styles.dateText}>
                    {item.publishedDate ? new Date(item.publishedDate).toLocaleDateString('vi-VN') : 'N/A'}
                  </Text>
                </View>
              </View>
              {isActive ? <ChevronUp size={18} color="#6B21A8" /> : <ChevronDown size={18} color="#667085" />}
            </View>
            
            <Text variant="bodyMedium" style={styles.announcementContent} numberOfLines={4}>
              {item.content}
            </Text>

            {isActive ? (
              <View style={styles.expandedPanel}>
                <Text style={styles.expandedTitle}>Chi tiet thong bao</Text>
                <Text style={styles.expandedContent}>{item.content}</Text>
                <View style={styles.expandedMetaRow}>
                  <Text style={styles.expandedMetaText}>
                    {item.targetAudience || 'Class'}
                  </Text>
                  <Text style={styles.expandedMetaText}>
                    {item.isPublished ? 'Da dang' : 'Ban thao'}
                  </Text>
                </View>
              </View>
            ) : null}
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <SegmentedButtons
          value={view}
          onValueChange={(value) => setView(value as 'create' | 'history')}
          buttons={[
            { value: 'create', label: 'Thêm mới' },
            { value: 'history', label: 'Lịch sử' }
          ]}
          style={styles.segmentedButtons}
        />

        {view === 'create' ? (
          <ScrollView style={styles.content} contentContainerStyle={{ padding: spacing, paddingBottom: 120 }}>
            <Title style={styles.headerTitle}>Tạo thông báo mới</Title>
            
            <Card style={styles.formCard}>
              <Card.Title 
                title="Đối tượng nhận" 
                left={(props) => <Bell color={theme.colors.primary} {...props} />}
              />
              <Card.Content>
                <RadioButton.Group onValueChange={value => setTarget(value)} value={target}>
                  <View style={styles.radioRow}>
                    <RadioButton value="class" />
                    <Text>Lớp của tôi (Mầm non A)</Text>
                  </View>
                  <View style={styles.radioRow}>
                    <RadioButton value="all-campus" />
                    <Text>Tất cả lớp trong cơ sở</Text>
                  </View>
                </RadioButton.Group>

                <Divider style={styles.divider} />

                <TextInput
                  label="Tiêu đề thông báo"
                  value={title}
                  onChangeText={setTitle}
                  mode="outlined"
                  placeholder="VD: Thông báo nghỉ lễ, Họp phụ huynh..."
                  style={styles.input}
                />
                
                <TextInput
                  label="Nội dung"
                  value={content}
                  onChangeText={setContent}
                  mode="outlined"
                  multiline
                  numberOfLines={10}
                  placeholder="Nội dung chi tiết gởi đến phụ huynh..."
                  style={styles.input}
                />
              </Card.Content>
            </Card>

            <Button
              mode="contained"
              onPress={handleCreate}
              loading={loading}
              disabled={loading}
              icon={() => <Send size={20} color="white" />}
              style={styles.submitBtn}
              contentStyle={styles.submitBtnContent}
            >
              Gởi thông báo ngay
            </Button>

            <View style={styles.tipCard}>
              <CheckCircle size={20} color="#4caf50" />
              <Text style={styles.tipText}>Thông báo sẽ được gởi qua ứng dụng (Push notification) đến tất cả phụ huynh liên quan.</Text>
            </View>
          </ScrollView>
        ) : (
          <View style={[styles.content, { paddingHorizontal: spacing }]}>
            {loadingHistory ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : announcements.length === 0 ? (
              <View style={styles.centerContainer}>
                <Text variant="bodyLarge" style={{ color: '#999' }}>Chưa có thông báo nào</Text>
              </View>
            ) : (
              <FlatList
                data={announcements}
                renderItem={renderAnnouncementItem}
                keyExtractor={(item, index) => String(item.id ?? item.title ?? item.publishedDate ?? index)}
                style={{ marginTop: spacing / 2 }}
                ItemSeparatorComponent={() => <View style={{ height: spacing / 2 }} />}
                contentContainerStyle={{ paddingBottom: 24 + insets.bottom + 72 }}
              />
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  segmentedButtons: {
    margin: 16,
    marginBottom: 8,
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    marginBottom: 24,
    fontSize: 24,
    fontWeight: 'bold',
  },
  formCard: {
    borderRadius: 12,
    elevation: 3,
    marginBottom: 24,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  divider: {
    marginVertical: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  submitBtn: {
    borderRadius: 8,
    backgroundColor: '#6200ee',
    marginBottom: 24,
    width: '100%',
  },
  submitBtnContent: {
    paddingVertical: 8,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: '#2e7d32',
  },
  // Announcement list styles
  announcementCard: {
    borderRadius: 12,
    elevation: 2,
    marginBottom: 12,
  },
  announcementCardActive: {
    borderWidth: 1,
    borderColor: '#6200ee',
    backgroundColor: '#f8f4ff',
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  dateText: {
    color: '#666',
  },
  announcementContent: {
    lineHeight: 20,
  },
  expandedPanel: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    gap: 8,
  },
  expandedTitle: {
    color: '#6B21A8',
    fontWeight: '700',
  },
  expandedContent: {
    lineHeight: 20,
    color: '#374151',
  },
  expandedMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  expandedMetaText: {
    color: '#6B7280',
    fontSize: 12,
  },
});

export default TeacherAnnouncementsScreen;
