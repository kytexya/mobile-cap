import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, SafeAreaView, Dimensions } from 'react-native';
import { Button, HelperText, Snackbar, TextInput, Title } from 'react-native-paper';
import { passwordService } from '../../services/password.service';

const ChangePasswordScreen = () => {
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  const spacing = isTablet ? 24 : 16;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Vui long nhap day du thong tin.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mat khau moi va xac nhan mat khau khong khop.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await passwordService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (response?.success) {
        setSuccess(response.message || 'Doi mat khau thanh cong.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(response?.message || 'Khong the doi mat khau.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Khong the doi mat khau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { padding: spacing }]}>
      <Title style={styles.title}>Doi mat khau</Title>

      <TextInput
        label="Mat khau hien tai"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="Mat khau moi"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="Xac nhan mat khau moi"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        mode="outlined"
        style={styles.input}
      />

      <HelperText type="error" visible={!!error}>
        {error || ' '}
      </HelperText>

      <Button
        mode="contained"
        onPress={handleChangePassword}
        loading={loading}
        disabled={loading}
        style={styles.fullWidthButton}
        contentStyle={styles.fullWidthButtonContent}
      >
        Cap nhat mat khau
      </Button>

      <Snackbar visible={!!success} onDismiss={() => setSuccess(null)} duration={3000}>
        {success}
      </Snackbar>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingBottom: 24,
  },
  title: {
    marginBottom: 20,
    fontWeight: '700',
  },
  input: {
    marginBottom: 12,
  },
  fullWidthButton: {
    width: '100%',
  },
  fullWidthButtonContent: {
    paddingVertical: 8,
  },
});

export default ChangePasswordScreen;
