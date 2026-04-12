import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Text, useTheme } from 'react-native-paper';
import { Calendar, Image as ImageIcon, User2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { classActivityService } from '../../services/classActivity.service';
import { useAuthStore } from '../../store/authStore';
import { studentService } from '../../services/student.service';

interface ActivityItem {
  key: string;
  id?: string | number;
  title: string;
  description: string;
  images: string[];
  activityDate: string;
  teacherName: string;
  className: string;
}

const ParentActivitiesScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const accountKey = [
    user?.id,
    user?.parentId,
    user?.ParentId,
    user?.studentId,
    user?.StudentId,
  ]
    .map((value) => Number(value))
    .find((value) => Number.isFinite(value) && value > 0);

  useEffect(() => {
    loadActivities();
  }, [accountKey, user?.parentId, user?.ParentId, user?.studentId, user?.StudentId]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      const primaryChild = await studentService.getPrimaryForAccount(user);
      const classId = Number(primaryChild?.classId ?? primaryChild?.ClassId ?? 0);
      if (!classId) {
        setActivities([]);
        setError('Khong tim thay lop lien ket cho hoc sinh nay.');
        return;
      }
      const response = await classActivityService.getByClass(classId);
      const rawItems = Array.isArray(response)
        ? response
        : Array.isArray((response as any)?.data)
          ? (response as any).data
          : [];

      const normalized = rawItems
        .map((item: any, index: number) => {
          const activityDate = item.activityDate || item.createdDate || new Date().toISOString();
          const id = item.id ?? item.activityId ?? item.classActivityId ?? `${activityDate}-${index}`;
          return {
            key: String(id),
            id,
            title: item.title || 'Hoat dong lop hoc',
            description: item.description || 'Chua co mo ta.',
            images: Array.isArray(item.images)
              ? item.images
              : Array.isArray(item.mediaFiles)
                ? item.mediaFiles
                : [],
            activityDate,
            teacherName: item.createdBy || item.teacherName || 'Giao vien',
            className: item.className || 'Dang cap nhat',
          };
        })
        .sort(
          (a: ActivityItem, b: ActivityItem) =>
            new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime()
        );

      setActivities(normalized);
    } catch (e) {
      setError('Khong the tai danh sach hoat dong.');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Hom nay, ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    }

    if (date.toDateString() === yesterday.toDateString()) {
      return 'Hom qua';
    }

    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const renderItem = ({ item }: { item: ActivityItem }) => (
    <Card style={styles.card}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.metaRow}>
          <View style={styles.avatar}>
            <User2 size={18} color="#4338CA" />
          </View>
          <View style={styles.metaText}>
            <Text style={styles.teacherText}>{item.teacherName}</Text>
            <Text style={styles.classText}>{item.className}</Text>
          </View>
          <Chip compact style={styles.dateChip} icon={() => <Calendar size={12} color="#475467" />}>
            {formatDate(item.activityDate)}
          </Chip>
        </View>

        <Text variant="titleMedium" style={styles.title}>
          {item.title}
        </Text>
        <Text style={styles.description}>{item.description}</Text>

        {item.images.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            {item.images.map((uri, index) => (
              <Image
                key={`${item.key}-${index}`}
                source={{ uri }}
                style={styles.image}
                resizeMode="cover"
                onError={() => console.warn('Parent activity image failed to load:', uri)}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyMedia}>
            <ImageIcon size={18} color="#667085" />
            <Text style={styles.emptyMediaText}>No media attached</Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={activities}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: 24 + insets.bottom + 72 }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.screenTitle}>
              Hoat dong lop
            </Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Chua co hoat dong nao</Text>
            <Button mode="outlined" onPress={loadActivities} style={styles.retryButton}>
              Tai lai
            </Button>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 14,
  },
  header: {
    marginBottom: 4,
    gap: 6,
  },
  screenTitle: {
    fontWeight: '700',
    color: '#101828',
  },
  screenSubtitle: {
    color: '#667085',
    lineHeight: 20,
  },
  errorText: {
    color: '#B42318',
    lineHeight: 20,
  },
  card: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
  },
  cardContent: {
    padding: 16,
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaText: {
    flex: 1,
    gap: 2,
  },
  teacherText: {
    color: '#101828',
    fontWeight: '700',
  },
  classText: {
    color: '#667085',
    fontSize: 12,
  },
  dateChip: {
    backgroundColor: '#F2F4F7',
  },
  title: {
    color: '#101828',
    fontWeight: '700',
  },
  description: {
    color: '#475467',
    lineHeight: 20,
  },
  imageScroll: {
    marginTop: 2,
  },
  image: {
    width: 220,
    height: 150,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: '#E5E7EB',
  },
  emptyMedia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
  },
  emptyMediaText: {
    color: '#667085',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: {
    color: '#667085',
  },
  retryButton: {
    borderRadius: 14,
  },
});

export default ParentActivitiesScreen;
