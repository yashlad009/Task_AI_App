import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, TextInput, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../src/context/AuthContext';
import { ENDPOINTS } from '../../src/config/api';

type Panel = 'users' | 'tasks' | 'queries';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [panel, setPanel] = useState<Panel>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replying, setReplying] = useState<string | null>(null);

  const fetchAll = async () => {
    try {
      const [u, t, q] = await Promise.all([
        axios.get(ENDPOINTS.getAllUsers),
        axios.get(ENDPOINTS.getAllTasks),
        axios.get(ENDPOINTS.getAllQueries),
      ]);
      setUsers(u.data);
      setTasks(t.data);
      setQueries(q.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const sendReply = async (queryId: string) => {
    const reply = replyText[queryId]?.trim();
    if (!reply) { Alert.alert('Error', 'Reply cannot be empty.'); return; }
    setReplying(queryId);
    try {
      await axios.put(ENDPOINTS.replyQuery(queryId), { reply });
      setReplyText(prev => ({ ...prev, [queryId]: '' }));
      fetchAll();
    } catch (e) { Alert.alert('Error', 'Failed to send reply.'); }
    finally { setReplying(null); }
  };

  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const avgMilestone = 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Admin Portal</Text>
          <Text style={styles.subtitle}>{user?.email}</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <TouchableOpacity style={[styles.statCard, panel === 'users' && styles.statActive]} onPress={() => setPanel('users')}>
          <Ionicons name="people-outline" size={20} color="#6C63FF" />
          <Text style={styles.statNum}>{users.length}</Text>
          <Text style={styles.statLabel}>Users</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.statCard, panel === 'tasks' && styles.statActive]} onPress={() => setPanel('tasks')}>
          <Ionicons name="checkmark-done-outline" size={20} color="#22C55E" />
          <Text style={styles.statNum}>{tasks.length}</Text>
          <Text style={styles.statLabel}>Tasks</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.statCard, panel === 'queries' && styles.statActive]} onPress={() => setPanel('queries')}>
          <Ionicons name="chatbubble-outline" size={20} color="#F59E0B" />
          <Text style={styles.statNum}>{queries.filter(q => !q.resolved).length}</Text>
          <Text style={styles.statLabel}>Open</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#6C63FF" /></View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor="#6C63FF" />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        >
          {/* Users Panel */}
          {panel === 'users' && (
            <>
              <Text style={styles.panelTitle}>User Directory</Text>
              {users.map(u => (
                <View key={u.id} style={styles.row}>
                  <View style={styles.rowAvatar}>
                    <Text style={styles.rowAvatarText}>{u.email[0].toUpperCase()}</Text>
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowMain}>{u.email}</Text>
                    <Text style={styles.rowSub}>{u.role} · ⚡{u.tokens} tokens</Text>
                  </View>
                  <View style={[styles.roleBadge, u.role === 'ADMIN' ? styles.adminBadge : styles.userBadge]}>
                    <Text style={styles.roleText}>{u.role}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Tasks Panel */}
          {panel === 'tasks' && (
            <>
              <Text style={styles.panelTitle}>Global Tasks ({completedTasks}/{tasks.length} done)</Text>
              {tasks.map(t => (
                <View key={t.id} style={styles.row}>
                  <Ionicons name={t.status === 'Completed' ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20} color={t.status === 'Completed' ? '#22C55E' : '#94A3B8'} style={{ marginRight: 10 }} />
                  <View style={styles.rowBody}>
                    <Text style={styles.rowMain} numberOfLines={1}>{t.text}</Text>
                    <Text style={styles.rowSub}>{t.category} · {t.priority} · {t.status}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Queries Panel */}
          {panel === 'queries' && (
            <>
              <Text style={styles.panelTitle}>Support Queries</Text>
              {queries.length === 0 && <Text style={styles.empty}>No queries yet.</Text>}
              {queries.map(q => (
                <View key={q.id} style={styles.queryCard}>
                  <View style={styles.queryHeader}>
                    <Text style={styles.queryEmail}>{q.userEmail}</Text>
                    <View style={[styles.resolvedBadge, q.resolved ? styles.resolvedGreen : styles.resolvedOrange]}>
                      <Text style={styles.resolvedText}>{q.resolved ? 'Resolved' : 'Open'}</Text>
                    </View>
                  </View>
                  <Text style={styles.queryMsg}>{q.message}</Text>
                  {q.adminReply && (
                    <View style={styles.replyBox}>
                      <Text style={styles.replyLabel}>Your reply:</Text>
                      <Text style={styles.replyText}>{q.adminReply}</Text>
                    </View>
                  )}
                  {!q.resolved && (
                    <View style={styles.replyRow}>
                      <TextInput
                        style={styles.replyInput}
                        placeholder="Type reply..."
                        placeholderTextColor="#64748B"
                        value={replyText[q.id] ?? ''}
                        onChangeText={v => setReplyText(prev => ({ ...prev, [q.id]: v }))}
                      />
                      <TouchableOpacity style={styles.replyBtn} onPress={() => sendReply(q.id)} disabled={replying === q.id}>
                        {replying === q.id ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={16} color="#fff" />}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56 },
  title: { fontSize: 22, fontWeight: '700', color: '#E2E8F0' },
  subtitle: { fontSize: 13, color: '#94A3B8' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  statCard: { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 14, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  statActive: { borderColor: '#6C63FF' },
  statNum: { fontSize: 20, fontWeight: '700', color: '#E2E8F0' },
  statLabel: { fontSize: 11, color: '#94A3B8' },
  panelTitle: { fontSize: 16, fontWeight: '700', color: '#E2E8F0', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  rowAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  rowAvatarText: { color: '#fff', fontWeight: '700' },
  rowBody: { flex: 1 },
  rowMain: { fontSize: 14, fontWeight: '600', color: '#E2E8F0' },
  rowSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  adminBadge: { backgroundColor: 'rgba(108,99,255,0.2)' },
  userBadge: { backgroundColor: 'rgba(148,163,184,0.1)' },
  roleText: { fontSize: 11, fontWeight: '700', color: '#E2E8F0' },
  queryCard: { backgroundColor: '#1A1A2E', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  queryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  queryEmail: { fontSize: 13, fontWeight: '600', color: '#6C63FF' },
  resolvedBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  resolvedGreen: { backgroundColor: 'rgba(34,197,94,0.15)' },
  resolvedOrange: { backgroundColor: 'rgba(245,158,11,0.15)' },
  resolvedText: { fontSize: 11, fontWeight: '700', color: '#E2E8F0' },
  queryMsg: { fontSize: 14, color: '#E2E8F0', marginBottom: 10, lineHeight: 20 },
  replyBox: { backgroundColor: '#0F0F1A', borderRadius: 10, padding: 10, marginBottom: 10 },
  replyLabel: { fontSize: 11, color: '#94A3B8', marginBottom: 4 },
  replyText: { fontSize: 13, color: '#22C55E' },
  replyRow: { flexDirection: 'row', gap: 8 },
  replyInput: { flex: 1, backgroundColor: '#0F0F1A', borderRadius: 10, padding: 10, color: '#E2E8F0', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  replyBtn: { backgroundColor: '#6C63FF', borderRadius: 10, width: 40, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', color: '#475569', marginTop: 40, fontSize: 15 },
});
