import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, Alert, RefreshControl, ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import Animated, {
  FadeInDown, FadeInRight,
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { useAuth } from '../../src/context/AuthContext';
import { ENDPOINTS } from '../../src/config/api';
import { scheduleTaskReminder } from '../../src/utils/notifications';

interface ImportantTask {
  id: string; taskName: string; eventTime: string; userEmail: string; processed: boolean;
}

// Proper component — hooks at top level
function ReminderRow({ item, index }: { item: ImportantTask; index: number }) {
  const scale = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const dt = new Date(item.eventTime);
  const formatted = dt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    // Outer: entering only
    <Animated.View entering={FadeInRight.delay(index * 70).duration(400).springify()}>
      {/* Inner: press scale only */}
      <Animated.View style={[styles.taskCard, item.processed && styles.taskProcessed, scaleStyle]}>
        <TouchableOpacity
        onPressIn={() => { scale.value = withSpring(0.97); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        activeOpacity={1}
        style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
      >
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
      </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

export default function ImportantScreen() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ImportantTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
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

  const formatDate = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatTime = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const addTask = async () => {
    if (!taskName.trim()) { Alert.alert('Error', 'Task name is required.'); return; }
    if (selectedDate <= new Date()) { Alert.alert('Error', 'Please select a future date and time.'); return; }
    setSaving(true);
    try {
      const utcIso = selectedDate.toISOString().replace('Z', '');
      await axios.post(ENDPOINTS.addImportantTask, {
        taskName: taskName.trim(), eventTime: utcIso,
        userEmail: user!.email, userId: user!.id,
      });
      await scheduleTaskReminder(taskName.trim(), selectedDate);
      Alert.alert('✅ Reminder Set', `You'll get a notification 30 minutes before "${taskName}"`);
      setTaskName(''); setSelectedDate(new Date()); setModalVisible(false); fetchTasks();
    } catch (e) { Alert.alert('Error', 'Failed to add reminder.'); }
    finally { setSaving(false); }
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(500).springify()} style={styles.header}>
        <Text style={styles.title}>Important</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color="#6C63FF" />
        <Text style={styles.infoText}>You'll receive a push notification 30 minutes before each task.</Text>
      </Animated.View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#6C63FF" /></View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={i => i.id}
          renderItem={({ item, index }) => <ReminderRow item={item} index={index} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTasks(); }} tintColor="#6C63FF" />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={<Text style={styles.empty}>No important tasks yet.</Text>}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalCard} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Set Reminder</Text>
            <Text style={styles.label}>Task Name</Text>
            <TextInput style={styles.input} placeholder="e.g. Submit assignment" placeholderTextColor="#64748B"
              value={taskName} onChangeText={setTaskName} />
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => { setShowTimePicker(false); setShowDatePicker(true); }}>
              <Ionicons name="calendar-outline" size={18} color="#6C63FF" />
              <Text style={styles.pickerText}>{formatDate(selectedDate)}</Text>
              <Ionicons name="chevron-down-outline" size={16} color="#94A3B8" />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker value={selectedDate} mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'} minimumDate={new Date()}
                onChange={(event, date) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (date) { const u = new Date(selectedDate); u.setFullYear(date.getFullYear(), date.getMonth(), date.getDate()); setSelectedDate(u); }
                }} />
            )}
            <Text style={styles.label}>Time</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => { setShowDatePicker(false); setShowTimePicker(true); }}>
              <Ionicons name="time-outline" size={18} color="#F59E0B" />
              <Text style={styles.pickerText}>{formatTime(selectedDate)}</Text>
              <Ionicons name="chevron-down-outline" size={16} color="#94A3B8" />
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker value={selectedDate} mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  if (Platform.OS === 'android') setShowTimePicker(false);
                  if (date) { const u = new Date(selectedDate); u.setHours(date.getHours(), date.getMinutes()); setSelectedDate(u); }
                }} />
            )}
            <View style={styles.selectedBox}>
              <Ionicons name="alarm-outline" size={16} color="#F59E0B" />
              <Text style={styles.selectedText}>Reminder: {formatDate(selectedDate)} at {formatTime(selectedDate)}</Text>
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addTask} disabled={saving}>
                {saving ? <ActivityIndicator color="#0F0F1A" size="small" /> : <Text style={styles.saveText}>Set Reminder</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0F0F1A' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56 },
  title:        { fontSize: 24, fontWeight: '700', color: '#E2E8F0' },
  addBtn:       { backgroundColor: '#F59E0B', borderRadius: 12, padding: 8 },
  infoBox:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 12, backgroundColor: 'rgba(108,99,255,0.1)', borderRadius: 10, padding: 12 },
  infoText:     { flex: 1, fontSize: 12, color: '#94A3B8' },
  taskCard:     { flexDirection: 'row', backgroundColor: '#1A1A2E', borderRadius: 14, padding: 14, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  taskProcessed:{ opacity: 0.6 },
  taskLeft:     { marginRight: 12 },
  taskBody:     { flex: 1 },
  taskName:     { fontSize: 15, fontWeight: '600', color: '#E2E8F0', marginBottom: 4 },
  taskTime:     { fontSize: 13, color: '#94A3B8', marginBottom: 4 },
  taskStatus:   { fontSize: 12, fontWeight: '600' },
  done:         { color: '#22C55E' }, pending: { color: '#F59E0B' },
  empty:        { textAlign: 'center', color: '#475569', marginTop: 60, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#1A1A2E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalTitle:   { fontSize: 20, fontWeight: '700', color: '#E2E8F0', marginBottom: 16 },
  label:        { fontSize: 13, color: '#94A3B8', marginBottom: 8, fontWeight: '600' },
  input:        { backgroundColor: '#0F0F1A', borderRadius: 12, padding: 14, color: '#E2E8F0', fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pickerBtn:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0F0F1A', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pickerText:   { flex: 1, color: '#E2E8F0', fontSize: 15 },
  selectedBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 10, padding: 12, marginBottom: 16 },
  selectedText: { fontSize: 13, color: '#F59E0B', fontWeight: '600' },
  modalBtns:    { flexDirection: 'row', gap: 12, marginTop: 4, marginBottom: 24 },
  cancelBtn:    { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#0F0F1A', alignItems: 'center' },
  cancelText:   { color: '#94A3B8', fontWeight: '600' },
  saveBtn:      { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#F59E0B', alignItems: 'center' },
  saveText:     { color: '#0F0F1A', fontWeight: '700' },
});
