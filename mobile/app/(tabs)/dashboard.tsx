import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Animated
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

// Animated stat card
function StatCard({ icon, value, label, color, delay }: { icon: any; value: number | string; label: string; color: string; delay: number }) {
  const anim  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(30)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim,  { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const pressIn  = () => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start();

  return (
    <Animated.View style={[styles.statCard, { borderColor: color, opacity: anim, transform: [{ translateY: slide }, { scale }] }]}>
      <TouchableOpacity onPressIn={pressIn} onPressOut={pressOut} activeOpacity={1}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={styles.statNum}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Animated progress bar
function AnimatedProgressBar({ percent }: { percent: number }) {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, { toValue: percent, duration: 900, delay: 300, useNativeDriver: false }).start();
  }, [percent]);
  return (
    <View style={styles.progressBg}>
      <Animated.View style={[styles.progressFill, { width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

// Animated action button
function ActionBtn({ icon, label, color, onPress, delay }: { icon: any; label: string; color: string; onPress: () => void; delay: number }) {
  const anim  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim,  { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const pressIn  = () => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start();

  return (
    <Animated.View style={[styles.actionBtn, { opacity: anim, transform: [{ translateY: slide }, { scale }] }]}>
      <TouchableOpacity onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} activeOpacity={1} style={styles.actionBtnInner}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.actionText}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Header animation
  const headerAnim = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    fetchAnalytics();
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [fetchAnalytics]);

  const onRefresh = () => { setRefreshing(true); fetchAnalytics(); };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#6C63FF" /></View>;
  }

  const g = analytics?.gamification;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />}
    >
      {/* Animated Header */}
      <Animated.View style={[styles.header, {
        opacity: headerAnim,
        transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }]
      }]}>
        <View>
          <Text style={styles.greeting}>Hey, {user?.email.split('@')[0]} 👋</Text>
          <Text style={styles.subGreeting}>Own today.</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#94A3B8" />
        </TouchableOpacity>
      </Animated.View>

      {/* Animated Stats Row */}
      <View style={styles.statsRow}>
        <StatCard icon="clipboard-outline"       value={analytics?.total ?? 0}      label="Total"   color="#6C63FF" delay={100} />
        <StatCard icon="checkmark-circle-outline" value={analytics?.completed ?? 0}  label="Done"    color="#22C55E" delay={180} />
        <StatCard icon="time-outline"             value={analytics?.pending ?? 0}    label="Pending" color="#EF4444" delay={260} />
        <StatCard icon="flash-outline"            value={`${analytics?.efficiency ?? 0}%`} label="Rate" color="#F59E0B" delay={340} />
      </View>

      {/* Gamification Card */}
      <View style={styles.gamCard}>
        <View style={styles.gamHeader}>
          <Text style={styles.gamTitle}>🏆 Progress</Text>
          <Text style={styles.gamTokens}>⚡ {g?.tokens ?? 0} tokens</Text>
        </View>
        <Text style={styles.gamLevel}>Level {g?.level ?? 1}</Text>

        <AnimatedProgressBar percent={g?.progressPercent ?? 0} />

        {g?.nextReward && (
          <Text style={styles.nextReward}>Next: {g.nextReward.icon} {g.nextReward.name} at {g.nextReward.threshold} tokens</Text>
        )}

        <View style={styles.achieveRow}>
          {g?.achievements.map(a => (
            <View key={a.key} style={[styles.achieveBadge, !a.unlocked && styles.achieveLocked]}>
              <Text style={styles.achieveIcon}>{a.icon}</Text>
              <Text style={styles.achieveName}>{a.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Animated Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <ActionBtn icon="add-circle-outline"   label="Add Task"   color="#6C63FF" onPress={() => router.push('/(tabs)/tasks')}      delay={400} />
        <ActionBtn icon="alarm-outline"        label="Reminder"   color="#F59E0B" onPress={() => router.push('/(tabs)/important')}  delay={460} />
        <ActionBtn icon="sparkles-outline"     label="AI Mentor"  color="#22C55E" onPress={() => router.push('/(tabs)/mentor')}     delay={520} />
        <ActionBtn icon="trending-up-outline"  label="Milestones" color="#EC4899" onPress={() => router.push('/(tabs)/milestones')} delay={580} />
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
  statNum: { fontSize: 20, fontWeight: '700', color: '#E2E8F0', marginTop: 4 },
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
  actionBtn: { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  actionBtnInner: { padding: 14, alignItems: 'center', gap: 6 },
  actionText: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textAlign: 'center' },
});
