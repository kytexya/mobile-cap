import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, ArrowRight, Check } from 'lucide-react-native';
import axiosClient from '../api/axiosClient';

interface ForgotPasswordScreenProps {
  navigation?: any;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSendResetLink = async () => {
    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return;
    }
    if (!validateEmail(email)) {
      setError('Email không hợp lệ');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Gọi API forgot password - cho cả Teacher và Parent
      const response = await axiosClient.post('/auth/forgot-password', {
        email: email.trim(),
      });

      if (response.data?.success) {
        setSent(true);
      } else {
        setError(response.data?.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation?.goBack?.();
  };

  const handleGoToReset = () => {
    // Navigate to reset password screen with email
    navigation?.navigate?.('ResetPassword', { email });
  };

  const handleGoToLogin = () => {
    navigation?.navigate?.('Auth');
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Check size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>Đã gửi email!</Text>
          <Text style={styles.successText}>
            Vui lòng kiểm tra hộp thư <Text style={styles.emailHighlight}>{email}</Text> để nhận hướng dẫn.
          </Text>

          {/* For demo: Direct link to reset password */}
          <Pressable onPress={handleGoToReset} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>Đặt lại mật khẩu ngay</Text>
            <ArrowRight size={18} color="#FFFFFF" />
          </Pressable>

          <Pressable onPress={handleGoToLogin} style={styles.backToLoginButton}>
            <Text style={styles.backToLoginText}>Quay lại đăng nhập</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
          <Text style={styles.headerTitle}>Quên mật khẩu</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.description}>
            Nhập email đã đăng ký để nhận hướng dẫn. {'\n'}
            Áp dụng cho cả tài khoản <Text style={styles.roleText}>Giáo viên</Text> và <Text style={styles.roleText}>Phụ huynh</Text>.
          </Text>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email đăng ký</Text>
            <View style={[styles.inputWrapper, error && styles.inputError]}>
              <Mail size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="example@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onSubmitEditing={handleSendResetLink}
              />
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleSendResetLink}
            disabled={loading}
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Gửi yêu cầu</Text>
                <ArrowRight size={20} color="#FFFFFF" />
              </>
            )}
          </Pressable>

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>
              Nếu bạn không nhận được email trong vài phút, vui lòng kiểm tra thư mục Spam hoặc thử lại.
            </Text>
          </View>

          {/* Back to Login */}
          <Pressable onPress={handleGoToLogin} style={styles.loginLinkContainer}>
            <Text style={styles.loginLink}>← Quay lại đăng nhập</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
    padding: 24,
    gap: 20,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    textAlign: 'center',
  },
  roleText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  inputGroup: {
    gap: 6,
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 52,
  },
  inputError: {
    borderColor: '#DC2626',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#1A1F36',
    borderRadius: 30,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
  },
  helpText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    textAlign: 'center',
  },
  loginLinkContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  loginLink: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
  },
  // Success State
  successContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  successText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emailHighlight: {
    color: '#1A1F36',
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backToLoginButton: {
    paddingVertical: 12,
  },
  backToLoginText: {
    color: '#6B7280',
    fontSize: 14,
  },
});

export default ForgotPasswordScreen;
