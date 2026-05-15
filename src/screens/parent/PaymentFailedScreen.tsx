import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react-native';

interface PaymentFailedScreenProps {
  navigation?: any;
  route?: {
    params?: {
      amount?: number;
      month?: string;
      transactionId?: string;
      paymentMethod?: string;
      errorCode?: string;
      errorMessage?: string;
    };
  };
}

const PaymentFailedScreen: React.FC<PaymentFailedScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();

  const amount = route?.params?.amount ?? 0;
  const month = route?.params?.month ?? '';
  const transactionId = route?.params?.transactionId ?? '';
  const paymentMethod = route?.params?.paymentMethod ?? 'vnpay';
  const errorCode = route?.params?.errorCode ?? '';
  const errorMessage = route?.params?.errorMessage ?? 'Thanh toán không thành công';

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleRetryPayment = () => {
    navigation?.goBack?.();
  };

  const handleBackToTuition = () => {
    navigation?.navigate?.('Tuition');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable onPress={handleBackToTuition} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
          <Text style={styles.headerTitle}>Thanh toán không thành công</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Failed Icon */}
        <View style={styles.failedSection}>
          <View style={styles.failedIconContainer}>
            <XCircle size={64} color="#FFFFFF" strokeWidth={2} />
          </View>
          <Text style={styles.failedTitle}>Thanh toán không thành công!</Text>
          <Text style={styles.failedSubtitle}>
            {errorMessage}
          </Text>
          {errorCode && (
            <Text style={styles.errorCode}>
              Mã lõi: {errorCode}
            </Text>
          )}
        </View>

        {/* Transaction Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Thông tin giao dich</Text>
          
          <View style={styles.detailRow}>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Mã giao dich</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {transactionId || '---'}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Phuong thuc thanh toán</Text>
              <Text style={styles.detailValue}>
                {paymentMethod === 'vnpay' ? 'VNPAY' : paymentMethod}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Sô tiên thanh toán</Text>
            <Text style={styles.amountValue}>{formatMoney(amount)}</Text>
            <Text style={styles.monthLabel}>Kì: {month}</Text>
          </View>
        </View>

        {/* Failed Badge */}
        <View style={styles.badgeContainer}>
          <View style={styles.failedBadge}>
            <XCircle size={16} color="#FFFFFF" />
            <Text style={styles.badgeText}>Thanh toán thât bai</Text>
          </View>
        </View>

        {/* Help Text */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Gop ý:</Text>
          <Text style={styles.helpText}>
            - Kiê tra lai thông tin thê và tài khoan ngân hàng
          </Text>
          <Text style={styles.helpText}>
            - Dû trû sô tiên trong tài khoan
          </Text>
          <Text style={styles.helpText}>
            - Thû lai sau vài phút nêu lôi mang tính tàm thòi
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable onPress={handleRetryPayment} style={styles.retryButton}>
          <RefreshCw size={18} color="#FFFFFF" />
          <Text style={styles.retryButtonText}>Thû lai thanh toán</Text>
        </Pressable>
        <Pressable onPress={handleBackToTuition} style={styles.backButtonLarge}>
          <Text style={styles.backButtonText}>Quay lai trang hoc phí</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1A1F36',
  },
  header: {
    backgroundColor: '#1A1F36',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  headerSpacer: {
    width: 40,
  },
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  content: {
    padding: 16,
    gap: 20,
  },
  failedSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  failedIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  failedTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  failedSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorCode: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 14,
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1F36',
    marginBottom: 8,
  },
  monthLabel: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
  badgeContainer: {
    alignItems: 'center',
  },
  failedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  helpSection: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#78350F',
    marginBottom: 4,
  },
  bottomContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButtonLarge: {
    backgroundColor: '#1A1F36',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PaymentFailedScreen;
