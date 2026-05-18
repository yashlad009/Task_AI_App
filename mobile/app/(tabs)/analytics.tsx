import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../src/context/AuthContext';
import { ENDPOINTS } from '../../src/config/api';

interface Task { id: string; status: string; completedAt?: string; dueDate?: string; category: string; }
interface Analytics {
  completed: number; pending: number; total: number; efficiency: number;
  gamification: {
    tokens: number; level: number; progressPercent: number;
    progressCurrent: number; progressTarget: number;
    nextReward: { name: string; icon: string; threshold: number } | null;
    achievements: Array<{ key: string; name: string; icon: string; unlocked: boolean; unlockedDate?: string }>;
    categoryTokens: Record<string, number>;
  };
}

const BAR_COLORS = ['#6C63FF', '#22C55E', '#F59E0B', '#EF4444', '#EC4899'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeeklyData(tasks: Task[]) {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    return { day: DAYS[d.getDay()], count: tasks.filter(t => t.status === 'Completed' && t.completedAt === dateStr).length, isToday: i === 6 };
  });
}

function calculateStreak(tasks: Task[]): number {
  const completedDates = new Set(tasks.filter(t => t.status === 'Completed' && t.completedAt).map(t => t.completedAt!));
  if (!completedDates.size) return 0;
  let streak = 0;
  const cursor = new Date();
  if (!completedDates.has(cursor.toISOString().split('T')[0])) cursor.setDate(cursor.getDate() - 1);
  while (completedDates.has(cursor.toISOString().split('T')[0])) { streak++; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}

// Animated bar for weekly chart
function AnimatedBar({ count, maxCount, isToday, delay }: { count: number; maxCount: number; isToday: boolean; delay: number }) {
  const heightAnim = useRef(new Animated.Value(0)).current;
  const targetH = Math.max((count / maxCount) * 80, count > 0 ? 8 : 4);
  useEffect(() => {
    Animated.timing(heightAnim, { toValue: targetH, duration: 700, delay, useNativeDriver: false }).start();
  }, [count]);
  return (
    <Animated.View style={[styles.bar, {
      height: heightAnim,
      backgroundColor: isToday ? '#6C63FF' : count > 0 ? '#22C55E' : '#1E2235',
    }]} />
  );
}

// Animated progress bar
function AnimatedBar2({ percent, color = '#6C63FF', delay = 300 }: { percent: number; color?: string; delay?: number }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: percent, duration: 900, delay, useNativeDriver: false }).start();
  }, [percent]);
  return (
    <View style={styles.rateBg}>
      <Animated.View style={[styles.rateFill, { width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), backgroundColor: color }]} />
    </View>
  );
}

// Animated stat card
function StatCard({ icon, value, label, color, delay }: { icon: any; value: string | number; label: string; color: string; delay: number }) {
  const anim  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim,  { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[styles.statCard, { borderColor: color, opacity: anim, transform: [{ translateY: slide }] }]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={styles.statNum}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
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

      {/* Animated stat cards */}
      <View style={styles.statsGrid}>
        <StatCard icon="clipboard-outline"        value={data?.total ?? 0}      label="Total Tasks" color="#6C63FF" delay={0}   />
        <StatCard icon="checkmark-circle-outline" value={data?.completed ?? 0}  label="Completed"   color="#22C55E" delay={80}  />
        <StatCard icon="time-outline"             value={data?.pending ?? 0}    label="Pending"     color="#F59E0B" delay={160} />
        <StatCard icon="flash-outline"            value={`${data?.efficiency ?? 0}%`} label="Efficiency" color="#EC4899" delay={240} />
      </View>

      {/* Streak row */}
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

      {/* Weekly chart with animated bars */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Weekly Rhythm</Text>
        <Text style={styles.cardSub}>Tasks completed in the last 7 days</Text>
        <View style={styles.chartRow}>
          {weeklyData.map((d, i) => (
            <View key={i} style={styles.chartCol}>
              <Text style={styles.chartCount}>{d.count > 0 ? d.count : ''}</Text>
              <View style={styles.barContainer}>
                <AnimatedBar count={d.count} maxCount={maxCount} isToday={d.isToday} delay={i * 80} />
              </View>
              <Text style={[styles.chartDay, d.isToday && styles.chartDayToday]}>{d.day}</Text>
              {d.isToday && <View style={styles.todayDot} />}
            </View>
          ))}
        </View>
      </View>

      {/* Animated completion rate bar */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Completion Rate</Text>
        <View style={styles.rateRow}>
          <AnimatedBar2 percent={completionRate} color="#6C63FF" delay={200} />
          <Text style={styles.rateText}>{completionRate}%</Text>
        </View>
        <Text style={styles.rateCaption}>{data?.completed} of {data?.total} tasks completed</Text>
      </View>

      {/* Gamification with animated XP bar */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>🏆 Gamification</Text>
          <Text style={styles.tokenBadge}>⚡ {g?.tokens ?? 0} tokens</Text>
        </View>
        <Text style={styles.levelText}>Level {g?.level ?? 1}</Text>
        {g?.nextReward && (
          <>
            <Text style={styles.nextLabel}>Next: {g.nextReward.icon} {g.nextReward.name}</Text>
            <View style={styles.rateRow}>
              <AnimatedBar2 percent={g.progressPercent} color="#F59E0B" delay={400} />
            </View>
            <Text style={styles.rateCaption}>{g.progressCurrent} / {g.progressTarget} tokens</Text>
          </>
        )}
      </View>

      {/* Achievements */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Achievements</Text>
        <View style={styles.achieveGrid}>
          {g?.achievements.map((a, i) => {
            const anim  = useRef(new Animated.Value(0)).current;
            const scale = useRef(new Animated.Value(0.8)).current;
            useEffect(() => {
              Animated.parallel([
                Animated.timing(anim,  { toValue: 1,   duration: 400, delay: i * 80, useNativeDriver: true }),
                Animated.spring(scale, { toValue: 1,   delay: i * 80, useNativeDriver: true } as any),
              ]).start();
            }, []);
            return (
              <Animated.View key={a.key} style={[styles.achieveCard, !a.unlocked && styles.achieveLocked, { opacity: anim, transform: [{ scale }] }]}>
                <Text style={styles.achieveIcon}>{a.icon}</Text>
                <Text style={styles.achieveName}>{a.name}</Text>
                {a.unlocked && a.unlockedDate
                  ? <Text style={styles.achieveDate}>{a.unlockedDate}</Text>
                  : <Text style={styles.achieveLockText}>🔒 Locked</Text>}
              </Animated.View>
            );
          })}
        </View>
      </View>

      {/* Category token bars */}
      <View style={[styles.card, { marginBottom: 32 }]}>
        <Text style={styles.cardTitle}>Token Value by Category</Text>
        {g?.categoryTokens && Object.entries(g.categoryTokens).map(([cat, val], i) => (
          <View key={cat} style={styles.catRow}>
            <View style={[styles.catDot, { backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }]} />
            <Text style={styles.catName}>{cat}</Text>
            <View style={styles.catBarBg}>
              <AnimatedBar2 percent={(val / 12) * 100} color={BAR_COLORS[i % BAR_COLORS.length]} delay={200 + i * 100} />
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
  rateFill: { height: '100%', borderRadius: 5 },
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
  catBarBg: { flex: 1 },
  catVal: { fontSize: 13, fontWeight: '700', color: '#F59E0B', minWidth: 28, textAlign: 'right' },
});
