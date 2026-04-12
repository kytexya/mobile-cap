import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, SafeAreaView, Dimensions, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { Text, TextInput, Button, Card, useTheme, Title, IconButton, SegmentedButtons } from 'react-native-paper';
import { Camera, ChevronDown, ChevronUp, Trash2, Send, Calendar } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { classActivityService } from '../../services/classActivity.service';
import { useAuthStore } from '../../store/authStore';

interface Activity {
  id: number;
  title: string;
  description?: string;
  activityDate: string;
  mediaFiles?: string[];
  teacherName?: string;
  className?: string;
}

interface PendingMedia {
  uri: string;
  previewUri?: string;
  base64?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
}

const toDataUrl = async (asset: PendingMedia) => {
  if (asset.base64) {
    return `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`;
  }

  try {
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: 'base64',
    });
    if (base64) {
      return `data:${asset.mimeType ?? 'image/jpeg'};base64,${base64}`;
    }
  } catch (error) {
    console.warn('Failed to read image as base64, falling back to uri preview:', error);
  }

  return asset.uri;
};

const TeacherActivitiesScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  const spacing = isTablet ? 24 : 16;
  const { user } = useAuthStore();
  const classId = Number(user?.classId ?? user?.ClassId ?? user?.currentClassId ?? 0);
  const accountKey = [user?.classId, user?.ClassId, user?.currentClassId]
    .map((value) => Number(value))
    .find((value) => Number.isFinite(value) && value > 0);
  const [view, setView] = useState<'create' | 'history'>('create');
  
  // Create form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [media, setMedia] = useState<PendingMedia[]>([]);
  
  // History state
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);

  // Load activities when switching to history view
  useEffect(() => {
    if (view === 'history') {
      loadActivities();
    }
  }, [view, accountKey, classId]);

  const loadActivities = async () => {
    setLoadingHistory(true);
    try {
      if (!classId) {
        setActivities([]);
        setSelectedActivityId(null);
        return;
      }
      const data = await classActivityService.getByClass(classId);
      setActivities(data);
      setSelectedActivityId((prev) => (prev && data.some((item) => item.id === prev) ? prev : null));
    } catch (e: any) {
      Alert.alert('Lỗi', 'Không thể tải hoạt động. Vui lòng thử lại.');
      console.error('Load activities error:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handlePost = async () => {
    if (!title || !description) {
      Alert.alert('Chưa đầy đủ', 'Vui lòng nhập tên hoạt động và mô tả.');
      return;
    }

    if (!classId) {
      Alert.alert('Chua xac dinh lop', 'Khong the dang hoat dong khi chua tai duoc lop cua giao vien.');
      return;
    }

    setLoading(true);
    try {
      const created = await classActivityService.create({
        classId,
        title,
        content: description,
        activityDate: new Date().toISOString().split('T')[0],
      });

      const createdActivityId = Number(
        (created as any)?.activityId ??
        (created as any)?.ActivityId ??
        (created as any)?.id ??
        (created as any)?.data?.activityId ??
        (created as any)?.data?.ActivityId ??
        0
      );

      const todayString = new Date().toISOString().split('T')[0];
      const resolveActivityId = async () => {
        if (createdActivityId > 0) {
          return createdActivityId;
        }

        try {
          const recentActivities = await classActivityService.getByClass(classId, todayString);
          const matchedActivity = recentActivities
            .slice()
            .reverse()
            .find((activity) =>
              activity.title?.trim().toLowerCase() === title.trim().toLowerCase() ||
              activity.content?.trim().toLowerCase() === description.trim().toLowerCase()
            );

          return Number(matchedActivity?.id ?? 0);
        } catch {
          return 0;
        }
      };

      const activityIdToUpload = await resolveActivityId();

      if (activityIdToUpload > 0 && media.length > 0) {
        const uploadPayloads = await Promise.all(
          media.map(async (item) => ({
            mediaUrl: await toDataUrl(item),
            mediaType: item.mimeType ?? 'image/jpeg',
            caption: title,
          }))
        );

        const uploadResults = await Promise.allSettled(
          uploadPayloads.map((payload) =>
            classActivityService.addMedia(activityIdToUpload, {
              mediaUrl: payload.mediaUrl,
              mediaType: payload.mediaType,
              caption: payload.caption,
            })
          )
        );

        const failedUploads = uploadResults.filter((result) => result.status === 'rejected');
        if (failedUploads.length > 0) {
          Alert.alert(
            'Đã đăng hoạt động',
            `${media.length - failedUploads.length} ảnh đã tải lên thành công, ${failedUploads.length} ảnh thất bại.`
          );
        } else {
          Alert.alert('Thành công', 'Đã đăng hoạt động lớp thành công.');
        }
      } else {
        Alert.alert('Thành công', 'Đã đăng hoạt động lớp thành công.');
      }

      setTitle('');
      setDescription('');
      setMedia([]);
      setView('history');
      await loadActivities();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể đăng hoạt động. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const addPhotosFromDevice = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép truy cập thư viện ảnh để chọn ảnh cho hoạt động.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const pickedMedia = result.assets.map((asset) => ({
      uri: asset.uri,
      previewUri: asset.base64
        ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`
        : asset.uri,
      base64: asset.base64 ?? null,
      mimeType: asset.mimeType ?? 'image/jpeg',
      fileName: asset.fileName ?? null,
    }));

    setMedia((current) => {
      const merged = [...current, ...pickedMedia];
      return merged.slice(0, 6);
    });
  };

  const removePhoto = (index: number) => {
    setMedia((current) => current.filter((_, i) => i !== index));
  };

  const renderActivityItem = ({ item }: { item: Activity }) => {
    const isActive = item.id === selectedActivityId;
    return (
      <Pressable onPress={() => setSelectedActivityId((prev) => (prev === item.id ? null : item.id))}>
        <Card style={[styles.activityCard, isActive && styles.activityCardActive]}>
          <Card.Content>
            <View style={styles.activityHeader}>
              <View style={{flex: 1}}>
                <Text variant="titleMedium" numberOfLines={2}>{item.title}</Text>
                <View style={styles.dateRow}>
                  <Calendar size={14} color="#666" />
                  <Text variant="labelSmall" style={styles.dateText}>
                    {item.activityDate ? new Date(item.activityDate).toLocaleDateString('vi-VN') : 'N/A'}
                  </Text>
                </View>
              </View>
              {isActive ? <ChevronUp size={18} color="#6B21A8" /> : <ChevronDown size={18} color="#667085" />}
            </View>
            
            <Text variant="bodyMedium" style={styles.description} numberOfLines={3}>
              {item.description}
            </Text>

            {item.mediaFiles?.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
                {item.mediaFiles.map((uri, index) => (
                  <Image
                    key={`${item.id}-${index}`}
                    source={{ uri }}
                    style={styles.activityMediaThumb}
                    resizeMode="cover"
                    onError={() => console.warn('Activity media failed to load:', uri)}
                  />
                ))}
              </ScrollView>
            ) : null}

            {isActive ? (
              <View style={styles.expandedPanel}>
                <Text style={styles.expandedTitle}>Chi tiet hoat dong</Text>
                <Text style={styles.expandedDescription}>{item.description}</Text>
                <View style={styles.expandedMetaRow}>
                  <Text style={styles.expandedMetaText}>{item.teacherName}</Text>
                  <Text style={styles.expandedMetaText}>{item.className}</Text>
                </View>
              </View>
            ) : null}
          </Card.Content>
        </Card>
      </Pressable>
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
            <Title style={styles.headerTitle}>Đăng hoạt động lớp</Title>
            
            <Card style={styles.formCard}>
              <Card.Content>
                <TextInput
                  label="Tên hoạt động"
                  value={title}
                  onChangeText={setTitle}
                  mode="outlined"
                  placeholder="VD: Giờ tập vẽ, Hoạt động ngoài trời..."
                  style={styles.input}
                />
                
                <TextInput
                  label="Mô tả chi tiết"
                  value={description}
                  onChangeText={setDescription}
                  mode="outlined"
                  multiline
                  numberOfLines={5}
                  placeholder="Bé hôm nay được làm gì, cảm xúc của bé..."
                  style={styles.input}
                />

                <View style={styles.mediaContainer}>
                  <View style={styles.mediaHeader}>
                    <Text variant="titleSmall" style={styles.mediaLabel}>Ảnh hoạt động</Text>
                    <Text variant="labelSmall" style={styles.mediaHint}>Tối đa 6 ảnh</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
                    <TouchableOpacity style={styles.addMediaBtn} onPress={addPhotosFromDevice}>
                      <Camera size={24} color={theme.colors.primary} />
                      <Text variant="labelSmall" style={{ color: theme.colors.primary, textAlign: 'center' }}>Chọn ảnh</Text>
                    </TouchableOpacity>
                    
                    {media.map((item, index) => (
                      <View key={index} style={styles.mediaItem}>
                        <Image
                          source={{ uri: item.previewUri ?? item.uri }}
                          style={styles.mediaPreview}
                          resizeMode="cover"
                          onError={() => console.warn('Preview image failed to load:', item.fileName ?? item.uri)}
                        />
                        <IconButton 
                          icon={() => <Trash2 size={16} color="white" />} 
                          containerColor="rgba(0,0,0,0.5)"
                          style={styles.deleteBtn}
                          onPress={() => removePhoto(index)}
                        />
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </Card.Content>
            </Card>

            <Button
              mode="contained"
              onPress={handlePost}
              loading={loading}
              disabled={loading}
              icon={() => <Send size={20} color="white" />}
              style={styles.submitBtn}
              contentStyle={styles.submitBtnContent}
            >
              Đăng thông tin
            </Button>
          </ScrollView>
        ) : (
          <View style={[styles.content, { paddingHorizontal: spacing }]}>
            {loadingHistory ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : activities.length === 0 ? (
              <View style={styles.centerContainer}>
                <Text variant="bodyLarge" style={{ color: '#999' }}>Chưa có hoạt động nào</Text>
              </View>
            ) : (
              <FlatList
                data={activities}
                renderItem={renderActivityItem}
                keyExtractor={(item, index) => String(item.id ?? item.title ?? item.activityDate ?? index)}
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
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  mediaContainer: {
    marginTop: 8,
  },
  mediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  mediaLabel: {
    flex: 1,
  },
  mediaHint: {
    color: '#667085',
  },
  mediaScroll: {
    flexDirection: 'row',
    minHeight: 124,
  },
  addMediaBtn: {
    aspectRatio: 1,
    width: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mediaItem: {
    position: 'relative',
    marginRight: 12,
  },
  mediaPreview: {
    aspectRatio: 1,
    width: 96,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  activityMediaThumb: {
    width: 88,
    height: 88,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: '#E5E7EB',
  },
  deleteBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    margin: 0,
  },
  submitBtn: {
    borderRadius: 8,
    marginBottom: 24,
    backgroundColor: '#6200ee',
    width: '100%',
  },
  submitBtnContent: {
    paddingVertical: 8,
  },
  // Activity list styles
  activityCard: {
    borderRadius: 12,
    elevation: 2,
    marginBottom: 12,
  },
  activityCardActive: {
    borderWidth: 1,
    borderColor: '#6200ee',
    backgroundColor: '#f8f4ff',
  },
  activityHeader: {
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
  description: {
    marginBottom: 12,
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
  expandedDescription: {
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
  activityImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
});

export default TeacherActivitiesScreen;
