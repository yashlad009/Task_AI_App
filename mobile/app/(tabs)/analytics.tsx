import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../src/context/AuthContext';
import { ENDPOINTS } from '../../src/config/api';

interface Task {
  id: string;
  status: string;
  completedAt?: string;
  dueDate?: string;
  category: string;
}

interface Analytics {
  completed: number;
  pending: number;
  total: number;
  efficiency: number;
  gamification: {
    tokens: number;
    level: number;
    progressPercent: number;
    progressCurrent: number;
    progressTarget: number;
    nextReward: { name: string; icon: string; threshold: number } | null;
    achievements: Array<{ key: string; name: string; icon: string; unlocked: boolean; unlockedDate?: string }>;
    categoryTokens: Record<string, number>;
  };
}

const BAR_COLORS = ['#6C63FF', '#22C55E', '#F59E0B', '#EF4444', '#EC4899'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeeklyData(tasks: Task[]): { day: string; count: number; isToday: boolean }[] {
  const today = new Date();
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const count = tasks.filter(t =>
      t.status === 'Completed' && t.completedAt === dateStr
    ).length;
    week.push({ day: DAYS[d.getDay()], count, isToday: i === 0 });
  }
  return week;
}

function calculateStreak(tasks: Task[]): number {
  const completedDates = new Set(
    tasks.filter(t => t.status === 'Completed' && t.completedAt)
      .map(t => t.completedAt!)
  );
  if (completedDates.size === 0) return 0;
  let streak = 0;
  const today = new Date();
  let cursor = new Date(today);
  // Allow grace: if nothing today, check from yesterday
  const todayStr = today.toISOString().split('T')[0];
  if (!completedDates.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (true) {
    const dateStr = cursor.toISOString().split('T')[0];
    if (completedDates.has(dateStr)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<Analytics | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    try {
      const [analyticsRes, tasksRes] = await Promise.all([
        axios.get(ENDPOINTS.getAnalytics(user.id)),
        axios.get(ENDPOINTS.getTasksByUser(user.id)),
      ]);
      setData(analyticsRes.data);
      setTasks(tasksRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#6C63FF" /></View>;

  const g = data?.gamification;
  const completionRate = data?.total ? Math.round((data.completed / data.total) * 100) : 0;
  const weeklyData = getWeeklyData(tasks);
  const maxCount = Math.max(...weeklyData.map(d => d.count), 1);
  const streak = calculateStreak(tasks);
  const weeklyTotal = weeklyData.reduce((sum, d) => sum + d.count, 0);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor="#6C63FF" />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>Your productivity at a glance</Text>
      </View>

      {/* Overview Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderColor: '#6C63FF' }]}>
          <Ionicons name="clipboard-outline" size={22} color="#6C63FF" />
          <Text style={styles.statNum}>{data?.total ?? 0}</Text>
          <Text style={styles.statLabel}>Total Tasks</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#22C55E' }]}>
          <Ionicons name="checkmark-circle-outline" size={22} color="#22C55E" />
          <Text style={styles.statNum}>{data?.completed ?? 0}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#F59E0B' }]}>
          <Ionicons name="time-outline" size={22} color="#F59E0B" />
          <Text style={styles.statNum}>{data?.pending ?? 0}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#EC4899' }]}>
          <Ionicons name="flash-outline" size={22} color="#EC4899" />
          <Text style={styles.statNum}>{data?.efficiency ?? 0}%</Text>
          <Text style={styles.statLabel}>Efficiency</Text>
        </View>
      </View>

      {/* Streak + Weekly Summary */}
      <View style={styles.streakRow}>
        <View style={[styles.streakCard, { borderColor: '#F59E0B' }]}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakNum}>{streak}</Text>
          <Text style={styles.streakLabel}>Day Streak</Text>
        </View>
        <View style={[styles.streakCard, { borderColor: '#6C63FF' }]}>
          <Text style={styles.streakEmoji}>📅</Text>
          <Text style={styles.streakNum}>{weeklyTotal}</Text>
          <Text style={styles.streakLabel}>This Week</Text>
        </View>
      </View>

      {/* Weekly Rhythm Chart */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Weekly Rhythm</Text>
        <Text style={styles.cardSub}>Tasks completed in the last 7 days</Text>
        <View style={styles.chartRow}>
          {weeklyData.map((d, i) => (
            <View key={i} style={styles.chartCol}>
              <Text style={styles.chartCount}>{d.count > 0 ? d.count : ''}</Text>
              <View style={styles.barContainer}>
                <View style={[
                  styles.bar,
                  {
                    height: Math.max((d.count / maxCount) * 80, d.count > 0 ? 8 : 4),
                    backgroundColor: d.isToday ? '#6C63FF' : d.count > 0 ? '#22C55E' : '#1E2235',
                  }
                ]} />
              </View>
              <Text style={[styles.chartDay, d.isToday && styles.chartDayToday]}>{d.day}</Text>
              {d.isToday && <View style={styles.todayDot} />}
            </View>
          ))}
        </View>
      </View>

      {/* Completion Rate */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Completion Rate</Text>
        <View style={styles.rateRow}>
          <View style={styles.rateBg}>
            <View style={[styles.rateFill, { width: `${completionRate}%` }]} />
          </View>
          <Text style={styles.rateText}>{completionRate}%</Text>
        </View>
        <Text style={styles.rateCaption}>{data?.completed} of {data?.total} tasks completed</Text>
      </View>

      {/* Gamification */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>🏆 Gamification</Text>
          <Text style={styles.tokenBadge}>⚡ {g?.tokens ?? 0} tokens</Text>
        </View>
        <Text style={styles.levelText}>Level {g?.level ?? 1}</Text>
        {g?.nextReward && (
          <>
            <Text style={styles.nextLabel}>Next: {g.nextReward.icon} {g.nextReward.name}</Text>
            <View style={styles.rateBg}>
              <View style={[styles.rateFill, { width: `${g.progressPercent}%`, backgroundColor: '#F59E0B' }]} />
            </View>
            <Text style={styles.rateCaption}>{g.progressCurrent} / {g.progressTarget} tokens</Text>
          </>
        )}
      </View>

      {/* Achievements */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Achievements</Text>
        <View style={styles.achieveGrid}>
          {g?.achievements.map((a) => (
            <View key={a.key} style={[styles.achieveCard, !a.unlocked && styles.achieveLocked]}>
              <Text style={styles.achieveIcon}>{a.icon}</Text>
              <Text style={styles.achieveName}>{a.name}</Text>
              {a.unlocked && a.unlockedDate
                ? <Text style={styles.achieveDate}>{a.unlockedDate}</Text>
                : <Text style={styles.achieveLockText}>🔒 Locked</Text>
              }
            </View>
          ))}
        </View>
      </View>

      {/* Token Value per Category */}
      <View style={[styles.card, { marginBottom: 32 }]}>
        <Text style={styles.cardTitle}>Token Value by Category</Text>
        {g?.categoryTokens && Object.entries(g.categoryTokens).map(([cat, val], i) => (
          <View key={cat} style={styles.catRow}>
            <View style={[styles.catDot, { backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }]} />
            <Text style={styles.catName}>{cat}</Text>
            <View style={styles.catBarBg}>
              <View style={[styles.catBarFill, { width: `${(val / 12) * 100}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }]} />
            </View>
            <Text style={styles.catVal}>+{val}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  center: { flex: 1, backgroundColor: '#0F0F1A', justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '700', color: '#E2E8F0' },
  subtitle: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10, marginBottom: 12 },
  statCard: { width: '47%', backgroundColor: '#1A1A2E', borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1 },
  statNum: { fontSize: 26, fontWeight: '700', color: '#E2E8F0' },
  statLabel: { fontSize: 12, color: '#94A3B8' },
  streakRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 12 },
  streakCard: { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1 },
  streakEmoji: { fontSize: 24, marginBottom: 4 },
  streakNum: { fontSize: 28, fontWeight: '700', color: '#E2E8F0' },
  streakLabel: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  card: { marginHorizontal: 16, backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#E2E8F0', marginBottom: 4 },
  cardSub: { fontSize: 12, color: '#94A3B8', marginBottom: 14 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  tokenBadge: { fontSize: 13, color: '#F59E0B', fontWeight: '700' },
  levelText: { fontSize: 13, color: '#94A3B8', marginBottom: 10 },
  nextLabel: { fontSize: 13, color: '#94A3B8', marginBottom: 8 },
  // Weekly chart
  chartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 110 },
  chartCol: { flex: 1, alignItems: 'center' },
  chartCount: { fontSize: 11, color: '#94A3B8', marginBottom: 4, height: 16 },
  barContainer: { height: 80, justifyContent: 'flex-end', width: '70%' },
  bar: { width: '100%', borderRadius: 4 },
  chartDay: { fontSize: 11, color: '#475569', marginTop: 6, fontWeight: '600' },
  chartDayToday: { color: '#6C63FF' },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#6C63FF', marginTop: 2 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  rateBg: { flex: 1, height: 10, backgroundColor: '#0F0F1A', borderRadius: 5, overflow: 'hidden' },
  rateFill: { height: '100%', backgroundColor: '#6C63FF', borderRadius: 5 },
  rateText: { fontSize: 15, fontWeight: '700', color: '#E2E8F0', minWidth: 40, textAlign: 'right' },
  rateCaption: { fontSize: 12, color: '#94A3B8' },
  achieveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  achieveCard: { backgroundColor: '#0F0F1A', borderRadius: 12, padding: 12, alignItems: 'center', minWidth: 80, flex: 1 },
  achieveLocked: { opacity: 0.4 },
  achieveIcon: { fontSize: 24, marginBottom: 4 },
  achieveName: { fontSize: 11, color: '#E2E8F0', fontWeight: '600', textAlign: 'center' },
  achieveDate: { fontSize: 10, color: '#22C55E', marginTop: 4 },
  achieveLockText: { fontSize: 10, color: '#475569', marginTop: 4 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { fontSize: 13, color: '#E2E8F0', width: 90 },
  catBarBg: { flex: 1, height: 8, backgroundColor: '#0F0F1A', borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 4 },
  catVal: { fontSize: 13, fontWeight: '700', color: '#F59E0B', minWidth: 28, textAlign: 'right' },
});
