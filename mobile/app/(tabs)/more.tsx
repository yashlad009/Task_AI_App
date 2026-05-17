import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../src/context/AuthContext';
import { ENDPOINTS } from '../../src/config/api';

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const [queryMsg, setQueryMsg] = useState('');
  const [sendingQuery, setSendingQuery] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const sendQuery = async () => {
    if (!queryMsg.trim()) { Alert.alert('Error', 'Message is required.'); return; }
    setSendingQuery(true);
    try {
      await axios.post(ENDPOINTS.sendQuery, {
        userEmail: user!.email,
        message: queryMsg.trim(),
      });
      Alert.alert('Sent!', 'Your query has been submitted. Admin will reply soon.');
      setQueryMsg('');
    } catch (e) { Alert.alert('Error', 'Failed to send query.'); }
    finally { setSendingQuery(false); }
  };

  const changePassword = async () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    setChangingPw(true);
    try {
      await axios.put(ENDPOINTS.updateUser, { email: user!.email, password: newPassword });
      Alert.alert('Success', 'Password updated successfully.');
      setNewPassword('');
    } catch (e) { Alert.alert('Error', 'Failed to update password.'); }
    finally { setChangingPw(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>More</Text>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.email[0].toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <Text style={styles.profileRole}>{user?.role}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>⚡ {user?.tokens ?? 0}</Text>
          <Text style={styles.statLabel}>Tokens</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>🏆 {user?.unlockedRewards?.length ?? 0}</Text>
          <Text style={styles.statLabel}>Rewards</Text>
        </View>
      </View>

      {/* Change Password */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Change Password</Text>
        <TextInput style={styles.input} placeholder="New password" placeholderTextColor="#64748B"
          value={newPassword} onChangeText={setNewPassword} secureTextEntry />
        <TouchableOpacity style={styles.btn} onPress={changePassword} disabled={changingPw}>
          {changingPw ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Update Password</Text>}
        </TouchableOpacity>
      </View>

      {/* Support Query */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Support</Text>
        <TextInput style={[styles.input, styles.textarea]} placeholder="Describe your issue or question..."
          placeholderTextColor="#64748B" value={queryMsg} onChangeText={setQueryMsg} multiline numberOfLines={4} />
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#22C55E' }]} onPress={sendQuery} disabled={sendingQuery}>
          {sendingQuery ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Send Query</Text>}
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Credits */}
      <View style={styles.credits}>
        <Text style={styles.creditsText}>Created by Yash Lad ❤️</Text>
        <Text style={styles.creditsVersion}>Task Tracker v1.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#E2E8F0', marginBottom: 20 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  profileEmail: { fontSize: 15, fontWeight: '600', color: '#E2E8F0' },
  profileRole: { fontSize: 12, color: '#94A3B8', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statItem: { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  statNum: { fontSize: 18, fontWeight: '700', color: '#E2E8F0' },
  statLabel: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  section: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#E2E8F0', marginBottom: 12 },
  input: { backgroundColor: '#0F0F1A', borderRadius: 12, padding: 14, color: '#E2E8F0', fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  textarea: { height: 100, textAlignVertical: 'top' },
  btn: { backgroundColor: '#6C63FF', borderRadius: 12, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 16 },
  credits: { alignItems: 'center', marginTop: 28, marginBottom: 8 },
  creditsText: { fontSize: 15, color: '#6C63FF', fontWeight: '700' },
  creditsVersion: { fontSize: 12, color: '#475569', marginTop: 4 },
});
