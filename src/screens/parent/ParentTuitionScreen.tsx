import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  View,
  Dimensions,
  Platform
} from 'react-native';
import { Avatar, Button, Card, Chip, Text, useTheme } from 'react-native-paper';
import { CreditCard, ReceiptText, Smartphone } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { invoiceService } from '../../services/invoice.service';
import { studentService } from '../../services/student.service';

// Lấy kích thước màn hình để tính toán Responsive
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallDevice = SCREEN_WIDTH < 380; // Điểm gãy cho các máy nhỏ như iPhone SE

type InvoiceItem = {
  id: number;
  month: string;
  total: number;
  status: 'Paid' | 'Unpaid' | 'Pending';
  dueDate: string;
  paidDate?: string;
  items?: Array<{ name: string; cost: number }>;
};

const ParentTuitionScreen = () => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [tuition, setTuition] = useState<InvoiceItem[]>([]);
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
    loadInvoices();
  }, [accountKey, user?.parentId, user?.ParentId, user?.studentId, user?.StudentId]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);

      const primaryChild = await studentService.getPrimaryForAccount(user);
      const studentId = primaryChild?.studentId ?? primaryChild?.id;

      if (studentId == null || Number(studentId) <= 0) {
        setTuition([]);
        setError('Không tìm thấy học sinh liên kết với tài khoản này.');
        return;
      }

      const response = await invoiceService.getByStudentId(studentId);
      const mapped = Array.isArray(response) ? response : response ? [response] : [];

      const normalized = mapped.map((item: any, index: number) => ({
        id: Number(item.id ?? item.invoiceId ?? index + 1),
        month: item.monthYear ?? item.month ?? item.title ?? '03/2026',
        total: Number(item.totalAmount ?? item.finalAmount ?? item.amount ?? item.total ?? 0),
        status: normalizeStatus(item.status),
        dueDate: item.dueDate ?? item.deadline ?? '',
        paidDate: item.paidDate ?? item.paidAt ?? item.payments?.[0]?.paymentDate,
        items: Array.isArray(item.items) ? item.items : [],
      }));

      setTuition(normalized);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải thông tin học phí.');
      setTuition([]);
    } finally {
      setLoading(false);
    }
  };

  const normalizeStatus = (status?: string): InvoiceItem['status'] => {
    if (!status) return 'Pending';
    const value = status.toLowerCase();
    if (value === 'paid') return 'Paid';
    if (value === 'unpaid') return 'Unpaid';
    return 'Pending';
  };

  const paidCount = tuition.filter((item) => item.status === 'Paid').length;
  const unpaidCount = tuition.filter((item) => item.status === 'Unpaid').length;
  const totalDue = tuition
    .filter((item) => item.status !== 'Paid')
    .reduce((sum, item) => sum + item.total, 0);

  const handlePay = async (item: InvoiceItem) => {
    try {
      const response = await invoiceService.pay(item.id, 'VNPay');
      if (response?.success) {
        loadInvoices();
      }
    } catch (err) { }
  };

  const renderInvoice = ({ item, index }: { item: InvoiceItem; index: number }) => {
    const isCurrent = index === 0;

    return (
      <Card style={[styles.invoiceCard, isCurrent && styles.currentInvoiceCard]}>
        <Card.Content style={styles.invoiceContent}>
          <View style={styles.invoiceTopRow}>
            <View style={styles.invoiceMonthBlock}>
              <Avatar.Icon
                size={isSmallDevice ? 36 : 42}
                icon="file-document"
                style={isCurrent ? styles.currentIcon : styles.historyIcon}
                color={isCurrent ? '#FFFFFF' : '#4F46E5'}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.invoiceMonth} numberOfLines={1}>{item.month}</Text>
                <Text style={styles.invoiceMeta} numberOfLines={1}>
                  {isCurrent ? 'Hóa đơn hiện tại' : `Đã đóng ${item.paidDate || item.dueDate || ''}`}
                </Text>
              </View>
            </View>

            <Chip
              compact
              style={[styles.statusChip, statusChipStyle(item.status)]}
              textStyle={[styles.statusChipText, { color: statusTextColor(item.status) }]}
            >
              {statusLabel(item.status)}
            </Chip>
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.amountValue} numberOfLines={1}>{formatMoney(item.total)}</Text>
            <Text style={styles.amountLabel}>Tổng học phí</Text>
          </View>

          <View style={styles.invoiceFooterRow}>
            <Text style={styles.footerText} numberOfLines={1}>
              Hạn: {item.dueDate ? formatDate(item.dueDate) : '...'}
            </Text>
            {item.status === 'Paid' ? (
              <Text style={styles.footerTextSuccess}>Đã thanh toán</Text>
            ) : (
              <Button
                mode="contained"
                onPress={() => handlePay(item)}
                labelStyle={{ fontSize: isSmallDevice ? 11 : 13 }}
                style={styles.payButton}
                contentStyle={{ height: 36 }}
              >
                Thanh toán
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={tuition}
        renderItem={renderInvoice}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.title}>Thông tin học phí</Text>
            <Text style={styles.subtitle}>Xem hóa đơn và trạng thái thanh toán của con.</Text>

            <Card style={styles.summaryCard}>
              <Card.Content style={styles.summaryContent}>
                <SummaryStat label="Đã đóng" value={paidCount} color="#16A34A" />
                <SummaryDivider />
                <SummaryStat label="Chưa đóng" value={unpaidCount} color="#DC2626" />
                <SummaryDivider />
                <SummaryStat label="Cần trả" value={formatMoney(totalDue)} color="#4F46E5" big />
              </Card.Content>
            </Card>

            <View style={styles.tipBox}>
              <Smartphone size={16} color="#475467" />
              <Text style={styles.tipText}>Phụ huynh có thể thanh toán online.</Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <ReceiptText size={28} color="#4F46E5" />
              </View>
              <Text style={styles.emptyTitle}>Chưa có hóa đơn nào</Text>
              <Button mode="outlined" onPress={loadInvoices} style={styles.retryButton}>Tải lại</Button>
            </View>
          )
        }
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
};

// --- Sub-components & Helpers ---

const SummaryStat = ({ label, value, color, big }: any) => (
  <View style={styles.summaryStat}>
    <Text style={[styles.summaryValue, { color }, big && styles.summaryValueBig]} numberOfLines={1}>
      {value}
    </Text>
    <Text style={styles.summaryLabel} numberOfLines={1}>{label}</Text>
  </View>
);

const SummaryDivider = () => <View style={styles.summaryDivider} />;

const formatMoney = (v: number) => `${Number(v || 0).toLocaleString('vi-VN')} đ`;
const formatDate = (v: string) => new Date(v).toLocaleDateString('vi-VN');

const statusLabel = (s: string) => (s === 'Paid' ? 'Đã đóng' : s === 'Unpaid' ? 'Chưa đóng' : 'Xử lý');
const statusChipStyle = (s: string) => ({ backgroundColor: s === 'Paid' ? '#ECFDF3' : s === 'Unpaid' ? '#FEF3F2' : '#EEF2FF' });
const statusTextColor = (s: string) => (s === 'Paid' ? '#067647' : s === 'Unpaid' ? '#B42318' : '#4F46E5');

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F6FB' },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 12 },
  header: { gap: 8, marginBottom: 12 },
  title: { fontSize: isSmallDevice ? 20 : 24, fontWeight: '700', color: '#101828' },
  subtitle: { color: '#667085', fontSize: 13 },

  // Tối ưu Summary Card cho mọi kích thước
  summaryCard: { borderRadius: 20, backgroundColor: '#FFFFFF', elevation: 2 },
  summaryContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  summaryStat: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { fontSize: isSmallDevice ? 18 : 22, fontWeight: '800' },
  summaryValueBig: { fontSize: isSmallDevice ? 14 : 18 },
  summaryLabel: { fontSize: 11, color: '#667085' },
  summaryDivider: { width: 1, height: 30, backgroundColor: '#EAECF0' },

  // Invoice Card
  invoiceCard: { borderRadius: 20, backgroundColor: '#FFFFFF' },
  currentInvoiceCard: { borderWidth: 1, borderColor: '#D6BBFB' },
  invoiceContent: { gap: 12 },
  invoiceTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  invoiceMonthBlock: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  currentIcon: { backgroundColor: '#6D28D9' },
  historyIcon: { backgroundColor: '#EEF2FF' },
  invoiceMonth: { fontWeight: '700', fontSize: isSmallDevice ? 14 : 16 },
  invoiceMeta: { color: '#667085', fontSize: 11 },
  statusChip: { height: 26 },
  statusChipText: { fontWeight: '700', fontSize: 10 },

  amountRow: { marginTop: 4 },
  amountValue: { fontSize: isSmallDevice ? 24 : 32, fontWeight: '800' },
  amountLabel: { fontSize: 11, color: '#667085' },

  invoiceFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  footerText: { fontSize: 12, color: '#667085', flex: 1 },
  footerTextSuccess: { color: '#067647', fontWeight: '700' },
  payButton: { borderRadius: 12 },

  tipBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, backgroundColor: '#F9FAFB' },
  tipText: { fontSize: 12, color: '#475467', flex: 1 },
  errorText: { color: '#B42318', fontSize: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontWeight: '700' },
  retryButton: { borderRadius: 12 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)' },
});

export default ParentTuitionScreen;