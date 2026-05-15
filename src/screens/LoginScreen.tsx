import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image, Pressable } from 'react-native';
import { TextInput, Button, Text, Title, HelperText, Snackbar } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/auth.service';
import { extractUserRole } from '../utils/auth';

interface LoginScreenProps {
  navigation?: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authService.login(username, password);
      if (response.success) {
        const { token, user } = response.data;
        const normalizedRole = extractUserRole(user);

        console.log('handleLogin - API response user:', user);
        console.log('handleLogin - extracted role:', normalizedRole);

        await setAuth(token, {
          ...user,
          id: Number((user as any).userId ?? (user as any).id),
          username: user.username,
          role: normalizedRole,
        });
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        <View style={styles.header}>
          <Title style={styles.title}>KMS Mobile</Title>
          <Text variant="bodyLarge">Kindergarten Management System</Text>
        </View>

        <TextInput
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="account" />}
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="lock" />}
        />

        {error && (
          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Đăng nhập
        </Button>

        {/* Forgot Password Link */}
        <Pressable
          onPress={() => navigation?.navigate?.('ForgotPassword')}
          style={styles.forgotPasswordLink}
        >
          <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
        </Pressable>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>hoặc</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Register Link */}
        <Pressable
          onPress={() => navigation?.navigate?.('ParentRegistration')}
          style={styles.registerLink}
        >
          <Text style={styles.registerText}>
            Chưa có tài khoản? <Text style={styles.registerHighlight}>Đăng ký ngay</Text>
          </Text>
        </Pressable>

      </View>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError(null)}
        duration={3000}
      >
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  innerContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  forgotPasswordLink: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  forgotPasswordText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#9CA3AF',
    fontSize: 14,
  },
  registerLink: {
    alignSelf: 'center',
  },
  registerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  registerHighlight: {
    color: '#4F46E5',
    fontWeight: '600',
  },
});

export default LoginScreen;
