import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { useAuth } from '../../src/context/AuthContext';
import { ENDPOINTS } from '../../src/config/api';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Animations
  const logoAnim   = useRef(new Animated.Value(0)).current;
  const cardAnim   = useRef(new Animated.Value(0)).current;
  const cardSlide  = useRef(new Animated.Value(40)).current;
  const btnScale   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(cardAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(cardSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const pressBtnIn  = () => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start();
  const pressBtnOut = () => Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true }).start();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(ENDPOINTS.login, { email: email.trim(), password });
      const userData = res.data;
      await login(userData);
      if (userData.role === 'ADMIN') {
        router.replace('/(admin)/dashboard');
      } else {
        router.replace('/(tabs)/dashboard');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Login failed. Please try again.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Animated logo */}
        <Animated.View style={[styles.header, { opacity: logoAnim, transform: [{ translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
          <Text style={styles.logo}>Task Tracker</Text>
          <Text style={styles.tagline}>Own today. Track priorities, finish faster.</Text>
        </Animated.View>

        {/* Animated card */}
        <Animated.View style={[styles.card, { opacity: cardAnim, transform: [{ translateY: cardSlide }] }]}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#64748B"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#64748B"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={styles.btn}
              onPress={handleLogin}
              onPressIn={pressBtnIn}
              onPressOut={pressBtnOut}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.link}>
            <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkAccent}>Register</Text></Text>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 32, fontWeight: '700', color: '#6C63FF', letterSpacing: 1 },
  tagline: { fontSize: 14, color: '#94A3B8', marginTop: 8, textAlign: 'center' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  title: { fontSize: 24, fontWeight: '700', color: '#E2E8F0', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#94A3B8', marginBottom: 24 },
  label: { fontSize: 13, color: '#94A3B8', marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#0F0F1A', borderRadius: 12, padding: 14, color: '#E2E8F0', fontSize: 15, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  btn: { backgroundColor: '#6C63FF', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#94A3B8', fontSize: 14 },
  linkAccent: { color: '#6C63FF', fontWeight: '700' },
});
