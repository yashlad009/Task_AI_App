import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { useAuth } from '../../src/context/AuthContext';
import { ENDPOINTS } from '../../src/config/api';

interface Analytics {
  completed: number;
  pending: number;
  total: number;
  efficiency: number;
  gamification: {
    tokens: number;
    level: number;
    progressPercent: number;
    nextReward: { name: string; icon: string; threshold: number } | null;
    achievements: Array<{ key: string; name: string; icon: string; unlocked: boolean }>;
  };
}

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(ENDPOINTS.getAnalytics(user.id));
      setAnalytics(res.data);
    } catch (e) {
      console.error('Analytics fetch failed', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const onRefresh = () => { setRefreshing(true); fetchAnalytics(); };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#6C63FF" /></View>;
  }

  const g = analytics?.gamification;
  const unlockedCount = g?.achievements.filter(a => a.unlocked).length ?? 0;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hey, {user?.email.split('@')[0]} 👋</Text>
          <Text style={styles.subGreeting}>Own today.</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderColor: '#6C63FF' }]}>
          <Ionicons name="clipboard-outline" size={20} color="#6C63FF" />
          <Text style={styles.statNum}>{analytics?.total ?? 0}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#22C55E' }]}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#22C55E" />
          <Text style={styles.statNum}>{analytics?.completed ?? 0}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#EF4444' }]}>
          <Ionicons name="time-outline" size={20} color="#EF4444" />
          <Text style={styles.statNum}>{analytics?.pending ?? 0}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#F59E0B' }]}>
          <Ionicons name="flash-outline" size={20} color="#F59E0B" />
          <Text style={styles.statNum}>{analytics?.efficiency ?? 0}%</Text>
          <Text style={styles.statLabel}>Rate</Text>
        </View>
      </View>

      {/* Gamification Card */}
      <View style={styles.gamCard}>
        <View style={styles.gamHeader}>
          <Text style={styles.gamTitle}>🏆 Progress</Text>
          <Text style={styles.gamTokens}>⚡ {g?.tokens ?? 0} tokens</Text>
        </View>
        <Text style={styles.gamLevel}>Level {g?.level ?? 1}</Text>

        {/* Progress Bar */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${g?.progressPercent ?? 0}%` }]} />
        </View>
        {g?.nextReward && (
          <Text style={styles.nextReward}>Next: {g.nextReward.icon} {g.nextReward.name} at {g.nextReward.threshold} tokens</Text>
        )}

        {/* Achievements */}
        <View style={styles.achieveRow}>
          {g?.achievements.map(a => (
            <View key={a.key} style={[styles.achieveBadge, !a.unlocked && styles.achieveLocked]}>
              <Text style={styles.achieveIcon}>{a.icon}</Text>
              <Text style={styles.achieveName}>{a.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(tabs)/tasks')}>
          <Ionicons name="add-circle-outline" size={24} color="#6C63FF" />
          <Text style={styles.actionText}>Add Task</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(tabs)/important')}>
          <Ionicons name="alarm-outline" size={24} color="#F59E0B" />
          <Text style={styles.actionText}>Reminder</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(tabs)/mentor')}>
          <Ionicons name="sparkles-outline" size={24} color="#22C55E" />
          <Text style={styles.actionText}>AI Mentor</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(tabs)/milestones')}>
          <Ionicons name="trending-up-outline" size={24} color="#EC4899" />
          <Text style={styles.actionText}>Milestones</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  center: { flex: 1, backgroundColor: '#0F0F1A', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#E2E8F0' },
  subGreeting: { fontSize: 14, color: '#94A3B8', marginTop: 2 },
  logoutBtn: { padding: 8 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, gap: 4 },
  statNum: { fontSize: 20, fontWeight: '700', color: '#E2E8F0' },
  statLabel: { fontSize: 11, color: '#94A3B8' },
  gamCard: { marginHorizontal: 16, backgroundColor: '#1A1A2E', borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(108,99,255,0.3)' },
  gamHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  gamTitle: { fontSize: 16, fontWeight: '700', color: '#E2E8F0' },
  gamTokens: { fontSize: 14, color: '#F59E0B', fontWeight: '600' },
  gamLevel: { fontSize: 13, color: '#94A3B8', marginBottom: 10 },
  progressBg: { height: 8, backgroundColor: '#0F0F1A', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: '#6C63FF', borderRadius: 4 },
  nextReward: { fontSize: 12, color: '#94A3B8', marginBottom: 14 },
  achieveRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  achieveBadge: { backgroundColor: '#0F0F1A', borderRadius: 10, padding: 8, alignItems: 'center', minWidth: 70 },
  achieveLocked: { opacity: 0.35 },
  achieveIcon: { fontSize: 20 },
  achieveName: { fontSize: 10, color: '#94A3B8', marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#E2E8F0', paddingHorizontal: 16, marginBottom: 12 },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 32 },
  actionBtn: { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  actionText: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textAlign: 'center' },
});
