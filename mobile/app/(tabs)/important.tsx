import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, Alert, RefreshControl, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../src/context/AuthContext';
import { ENDPOINTS } from '../../src/config/api';
import { scheduleTaskReminder } from '../../src/utils/notifications';

interface ImportantTask {
  id: string;
  taskName: string;
  eventTime: string;
  userEmail: string;
  processed: boolean;
}

export default function ImportantScreen() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ImportantTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [taskName, setTaskName] = useState('');
  // Date/time inputs
  const [dateStr, setDateStr] = useState('');   // YYYY-MM-DD
  const [timeStr, setTimeStr] = useState('');   // HH:MM (24h)
  const [saving, setSaving] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(ENDPOINTS.getImportantTasks(user.id));
      setTasks(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const addTask = async () => {
    if (!taskName.trim() || !dateStr.trim() || !timeStr.trim()) {
      Alert.alert('Error', 'Task name, date and time are required.');
      return;
    }
    // Validate format
    const isoString = `${dateStr}T${timeStr}:00`;
    const eventDate = new Date(isoString);
    if (isNaN(eventDate.getTime())) {
      Alert.alert('Error', 'Invalid date/time. Use YYYY-MM-DD and HH:MM format.');
      return;
    }

    setSaving(true);
    try {
      // Convert local time to UTC ISO for backend
      const utcIso = eventDate.toISOString().replace('Z', '');
      await axios.post(ENDPOINTS.addImportantTask, {
        taskName: taskName.trim(),
        eventTime: utcIso,
        userEmail: user!.email,
        userId: user!.id,
      });

      // Schedule local push notification 30 min before
      await scheduleTaskReminder(taskName.trim(), eventDate);

      Alert.alert('✅ Reminder Set', `You'll get a notification 30 minutes before "${taskName}"`);
      setTaskName(''); setDateStr(''); setTimeStr('');
      setModalVisible(false);
      fetchTasks();
    } catch (e) {
      Alert.alert('Error', 'Failed to add reminder.');
    } finally {
      setSaving(false);
    }
  };

  const renderTask = ({ item }: { item: ImportantTask }) => {
    const dt = new Date(item.eventTime);
    const formatted = dt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    return (
      <View style={[styles.taskCard, item.processed && styles.taskProcessed]}>
        <View style={styles.taskLeft}>
          <Ionicons name={item.processed ? 'checkmark-circle' : 'alarm'} size={22}
            color={item.processed ? '#22C55E' : '#F59E0B'} />
        </View>
        <View style={styles.taskBody}>
          <Text style={styles.taskName}>{item.taskName}</Text>
          <Text style={styles.taskTime}>📅 {formatted}</Text>
          <Text style={[styles.taskStatus, item.processed ? styles.done : styles.pending]}>
            {item.processed ? 'Reminder sent' : 'Reminder pending'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Important</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color="#6C63FF" />
        <Text style={styles.infoText}>You'll receive a push notification 30 minutes before each task.</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#6C63FF" /></View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={i => i.id}
          renderItem={renderTask}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTasks(); }} tintColor="#6C63FF" />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={<Text style={styles.empty}>No important tasks yet.</Text>}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set Reminder</Text>

            <Text style={styles.label}>Task Name</Text>
            <TextInput style={styles.input} placeholder="e.g. Submit assignment" placeholderTextColor="#64748B"
              value={taskName} onChangeText={setTaskName} />

            <Text style={styles.label}>Date <Text style={styles.hint}>(YYYY-MM-DD)</Text></Text>
            <TextInput style={styles.input} placeholder="2026-05-20" placeholderTextColor="#64748B"
              value={dateStr} onChangeText={setDateStr} keyboardType="numbers-and-punctuation" />

            <Text style={styles.label}>Time <Text style={styles.hint}>(HH:MM, 24h)</Text></Text>
            <TextInput style={styles.input} placeholder="14:30" placeholderTextColor="#64748B"
              value={timeStr} onChangeText={setTimeStr} keyboardType="numbers-and-punctuation" />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addTask} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Set Reminder</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '700', color: '#E2E8F0' },
  addBtn: { backgroundColor: '#F59E0B', borderRadius: 12, padding: 8 },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 12, backgroundColor: 'rgba(108,99,255,0.1)', borderRadius: 10, padding: 12 },
  infoText: { flex: 1, fontSize: 12, color: '#94A3B8' },
  taskCard: { flexDirection: 'row', backgroundColor: '#1A1A2E', borderRadius: 14, padding: 14, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  taskProcessed: { opacity: 0.6 },
  taskLeft: { marginRight: 12 },
  taskBody: { flex: 1 },
  taskName: { fontSize: 15, fontWeight: '600', color: '#E2E8F0', marginBottom: 4 },
  taskTime: { fontSize: 13, color: '#94A3B8', marginBottom: 4 },
  taskStatus: { fontSize: 12, fontWeight: '600' },
  done: { color: '#22C55E' }, pending: { color: '#F59E0B' },
  empty: { textAlign: 'center', color: '#475569', marginTop: 60, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#1A1A2E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#E2E8F0', marginBottom: 16 },
  label: { fontSize: 13, color: '#94A3B8', marginBottom: 6, fontWeight: '600' },
  hint: { color: '#475569', fontWeight: '400' },
  input: { backgroundColor: '#0F0F1A', borderRadius: 12, padding: 14, color: '#E2E8F0', fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#0F0F1A', alignItems: 'center' },
  cancelText: { color: '#94A3B8', fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#F59E0B', alignItems: 'center' },
  saveText: { color: '#0F0F1A', fontWeight: '700' },
});
