import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { ENDPOINTS } from '../../src/config/api';

type Step = 'email' | 'otp';

export default function RegisterScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const sendOtp = async () => {
    if (!email.trim()) { Alert.alert('Error', 'Email is required.'); return; }
    if (!agreed) {
      Alert.alert('Required', 'Please accept the Privacy Policy and Terms of Service to continue.');
      return;
    }
    setLoading(true);
    try {
      await axios.post(ENDPOINTS.sendOtp, { email: email.trim() });
      Alert.alert('OTP Sent', `Check your email ${email} for the verification code.`);
      setStep('otp');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const verifyAndRegister = async () => {
    if (!otp.trim() || !password.trim()) {
      Alert.alert('Error', 'OTP and password are required.');
      return;
    }
    setLoading(true);
    try {
      await axios.post(ENDPOINTS.verifyAndRegister, {
        email: email.trim(),
        password,
        otp: otp.trim(),
        adminKey: adminKey.trim() || undefined,
      });
      Alert.alert('Success!', 'Account created. Please sign in.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>Task Tracker</Text>
          <Text style={styles.tagline}>Create your account</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{step === 'email' ? 'Get Started' : 'Verify Email'}</Text>
          <Text style={styles.subtitle}>
            {step === 'email' ? 'Enter your email to receive an OTP' : `Enter the code sent to ${email}`}
          </Text>

          {step === 'email' ? (
            <>
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor="#64748B"
                value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

              <Text style={styles.label}>Password</Text>
              <TextInput style={styles.input} placeholder="Create a password" placeholderTextColor="#64748B"
                value={password} onChangeText={setPassword} secureTextEntry />

              <Text style={styles.label}>Admin Key <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput style={styles.input} placeholder="Leave blank for regular account" placeholderTextColor="#64748B"
                value={adminKey} onChangeText={setAdminKey} />

              {/* ── Agreement checkbox ── */}
              <TouchableOpacity style={styles.checkRow} onPress={() => setAgreed(v => !v)} activeOpacity={0.7}>
                <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                  {agreed && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={styles.checkLabel}>
                  I have read and agree to the{' '}
                  <Text style={styles.checkLink} onPress={() => router.push('/(auth)/privacy-policy')}>
                    Privacy Policy
                  </Text>
                  {' '}and{' '}
                  <Text style={styles.checkLink} onPress={() => router.push('/(auth)/terms-of-service')}>
                    Terms of Service
                  </Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, !agreed && styles.btnDisabled]}
                onPress={sendOtp}
                disabled={loading || !agreed}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send OTP</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput style={[styles.input, styles.otpInput]} placeholder="000000" placeholderTextColor="#64748B"
                value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} />

              <TouchableOpacity style={styles.btn} onPress={verifyAndRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep('email')} style={styles.link}>
                <Text style={styles.linkText}>← Back</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.link}>
            <Text style={styles.linkText}>Already have an account? <Text style={styles.linkAccent}>Sign In</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0F0F1A' },
  scroll:         { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header:         { alignItems: 'center', marginBottom: 32 },
  logo:           { fontSize: 32, fontWeight: '700', color: '#6C63FF', letterSpacing: 1 },
  tagline:        { fontSize: 14, color: '#94A3B8', marginTop: 8 },
  card:           { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  title:          { fontSize: 24, fontWeight: '700', color: '#E2E8F0', marginBottom: 4 },
  subtitle:       { fontSize: 14, color: '#94A3B8', marginBottom: 24 },
  label:          { fontSize: 13, color: '#94A3B8', marginBottom: 6, fontWeight: '600' },
  optional:       { color: '#475569', fontWeight: '400' },
  input:          { backgroundColor: '#0F0F1A', borderRadius: 12, padding: 14, color: '#E2E8F0', fontSize: 15, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  otpInput:       { fontSize: 24, textAlign: 'center', letterSpacing: 8 },
  // Checkbox row
  checkRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 20, marginTop: 4 },
  checkbox:       { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#6C63FF', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkboxChecked:{ backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  checkLabel:     { flex: 1, fontSize: 13, color: '#94A3B8', lineHeight: 20 },
  checkLink:      { color: '#6C63FF', fontWeight: '700' },
  // Buttons
  btn:            { backgroundColor: '#6C63FF', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  btnDisabled:    { backgroundColor: '#3D3A6B', opacity: 0.6 },
  btnText:        { color: '#fff', fontWeight: '700', fontSize: 16 },
  link:           { marginTop: 16, alignItems: 'center' },
  linkText:       { color: '#94A3B8', fontSize: 14 },
  linkAccent:     { color: '#6C63FF', fontWeight: '700' },
});
