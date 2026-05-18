import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeInDown, FadeInUp, ZoomIn,
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  interpolate, Extrapolation,
} from 'react-native-reanimated';
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

// Stat card with Reanimated entering animation + press scale
function StatCard({ icon, value, label, color, index }: {
  icon: any; value: number | string; label: string; color: string; index: number;
}) {
  const scale = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    // Outer: entering animation only
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400).springify()} style={{ flex: 1 }}>
      {/* Inner: press scale only */}
      <Animated.View style={[styles.statCard, { borderColor: color }, scaleStyle]}>
        <TouchableOpacity
          onPressIn={() => { scale.value = withSpring(0.93); }}
          onPressOut={() => { scale.value = withSpring(1); }}
          activeOpacity={1}
        >
          <Ionicons name={icon} size={20} color={color} />
          <Text style={styles.statNum}>{value}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

// Animated progress bar using reanimated
function AnimatedProgressBar({ percent }: { percent: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(percent, { duration: 900 });
  }, [percent]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progress.value, [0, 100], [0, 100], Extrapolation.CLAMP)}%`,
  }));

  return (
    <View style={styles.progressBg}>
      <Animated.View style={[styles.progressFill, barStyle]} />
    </View>
  );
}

// Action button with entering animation + press scale
function ActionBtn({ icon, label, color, onPress, index }: {
  icon: any; label: string; color: string; onPress: () => void; index: number;
}) {
  const scale = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    // Outer: entering only
    <Animated.View entering={FadeInUp.delay(300 + index * 70).duration(400).springify()} style={{ flex: 1 }}>
      {/* Inner: press scale only */}
      <Animated.View style={[styles.actionBtn, scaleStyle]}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={() => { scale.value = withSpring(0.91); }}
          onPressOut={() => { scale.value = withSpring(1); }}
          activeOpacity={1}
          style={styles.actionBtnInner}
        >
          <Ionicons name={icon} size={24} color={color} />
          <Text style={styles.actionText}>{label}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />}
    >
      {/* Header slides down */}
      <Animated.View entering={FadeInDown.duration(500).springify()} style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hey, {user?.email.split('@')[0]} 👋</Text>
          <Text style={styles.subGreeting}>Own today.</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#94A3B8" />
        </TouchableOpacity>
      </Animated.View>

      {/* Stats row — each card staggers in */}
      <View style={styles.statsRow}>
        <StatCard icon="clipboard-outline"        value={analytics?.total ?? 0}               label="Total"   color="#6C63FF" index={0} />
        <StatCard icon="checkmark-circle-outline" value={analytics?.completed ?? 0}           label="Done"    color="#22C55E" index={1} />
        <StatCard icon="time-outline"             value={analytics?.pending ?? 0}             label="Pending" color="#EF4444" index={2} />
        <StatCard icon="flash-outline"            value={`${analytics?.efficiency ?? 0}%`}   label="Rate"    color="#F59E0B" index={3} />
      </View>

      {/* Gamification card zooms in */}
      <Animated.View entering={ZoomIn.delay(200).duration(400)} style={styles.gamCard}>
        <View style={styles.gamHeader}>
          <Text style={styles.gamTitle}>🏆 Progress</Text>
          <Text style={styles.gamTokens}>⚡ {g?.tokens ?? 0} tokens</Text>
        </View>
        <Text style={styles.gamLevel}>Level {g?.level ?? 1}</Text>

        <AnimatedProgressBar percent={g?.progressPercent ?? 0} />

        {g?.nextReward && (
          <Text style={styles.nextReward}>
            Next: {g.nextReward.icon} {g.nextReward.name} at {g.nextReward.threshold} tokens
          </Text>
        )}

        <View style={styles.achieveRow}>
          {g?.achievements.map((a, i) => (
            <Animated.View
              key={a.key}
              entering={ZoomIn.delay(300 + i * 60).duration(350)}
              style={[styles.achieveBadge, !a.unlocked && styles.achieveLocked]}
            >
              <Text style={styles.achieveIcon}>{a.icon}</Text>
              <Text style={styles.achieveName}>{a.name}</Text>
            </Animated.View>
          ))}
        </View>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.Text entering={FadeInDown.delay(250).duration(400)} style={styles.sectionTitle}>
        Quick Actions
      </Animated.Text>
      <View style={styles.actionsRow}>
        <ActionBtn icon="add-circle-outline"  label="Add Task"   color="#6C63FF" onPress={() => router.push('/(tabs)/tasks')}      index={0} />
        <ActionBtn icon="alarm-outline"       label="Reminder"   color="#F59E0B" onPress={() => router.push('/(tabs)/important')}  index={1} />
        <ActionBtn icon="sparkles-outline"    label="AI Mentor"  color="#22C55E" onPress={() => router.push('/(tabs)/mentor')}     index={2} />
        <ActionBtn icon="trending-up-outline" label="Milestones" color="#EC4899" onPress={() => router.push('/(tabs)/milestones')} index={3} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0F0F1A' },
  center:         { flex: 1, backgroundColor: '#0F0F1A', justifyContent: 'center', alignItems: 'center' },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56 },
  greeting:       { fontSize: 22, fontWeight: '700', color: '#E2E8F0' },
  subGreeting:    { fontSize: 14, color: '#94A3B8', marginTop: 2 },
  logoutBtn:      { padding: 8 },
  statsRow:       { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  statCard:       { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, gap: 4 },
  statNum:        { fontSize: 20, fontWeight: '700', color: '#E2E8F0', marginTop: 4 },
  statLabel:      { fontSize: 11, color: '#94A3B8' },
  gamCard:        { marginHorizontal: 16, backgroundColor: '#1A1A2E', borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(108,99,255,0.3)' },
  gamHeader:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  gamTitle:       { fontSize: 16, fontWeight: '700', color: '#E2E8F0' },
  gamTokens:      { fontSize: 14, color: '#F59E0B', fontWeight: '600' },
  gamLevel:       { fontSize: 13, color: '#94A3B8', marginBottom: 10 },
  progressBg:     { height: 8, backgroundColor: '#0F0F1A', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill:   { height: '100%', backgroundColor: '#6C63FF', borderRadius: 4 },
  nextReward:     { fontSize: 12, color: '#94A3B8', marginBottom: 14 },
  achieveRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  achieveBadge:   { backgroundColor: '#0F0F1A', borderRadius: 10, padding: 8, alignItems: 'center', minWidth: 70 },
  achieveLocked:  { opacity: 0.35 },
  achieveIcon:    { fontSize: 20 },
  achieveName:    { fontSize: 10, color: '#94A3B8', marginTop: 2, textAlign: 'center' },
  sectionTitle:   { fontSize: 16, fontWeight: '700', color: '#E2E8F0', paddingHorizontal: 16, marginBottom: 12 },
  actionsRow:     { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 32 },
  actionBtn:      { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  actionBtnInner: { padding: 14, alignItems: 'center', gap: 6 },
  actionText:     { fontSize: 11, color: '#94A3B8', fontWeight: '600', textAlign: 'center' },
});
