import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, Alert, RefreshControl, ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import Animated, {
  FadeInLeft, FadeInDown, FadeInUp,
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../../src/context/AuthContext';
import { ENDPOINTS } from '../../src/config/api';

interface Task {
  id: string; text: string; status: string;
  category: string; priority: string; dueDate?: string; completedAt?: string;
}

const CATEGORIES = ['Study', 'Health', 'Work', 'Personal', 'Entertainment'];
const PRIORITIES = ['High', 'Medium', 'Low'];
const CATEGORY_COLORS: Record<string, string> = {
  Study: '#6C63FF', Health: '#22C55E', Work: '#F59E0B',
  Personal: '#EF4444', Entertainment: '#EC4899',
};
const CATEGORY_TOKENS: Record<string, number> = {
  Study: 10, Health: 8, Work: 12, Personal: 6, Entertainment: 6,
};

async function sendTaskCreatedNotification(taskText: string, category: string) {
  const tokens = CATEGORY_TOKENS[category] ?? 6;
  await Notifications.scheduleNotificationAsync({
    content: { title: '✅ Task Added!', body: `"${taskText}" — You'll earn +${tokens} tokens on completion!`, sound: 'default' },
    trigger: null,
  });
}

async function scheduleDueNotification(taskText: string, dueDateTime: Date): Promise<string | null> {
  if (dueDateTime <= new Date()) return null;
  return await Notifications.scheduleNotificationAsync({
    content: { title: '⏰ Task Deadline!', body: `"${taskText}" is due right now! Complete it to earn tokens.`, sound: 'default' },
    trigger: { date: dueDateTime },
  });
}

// Proper component — hooks at top level, Reanimated entering animation
function TaskRow({ item, index, onComplete, onDelete }: {
  item: Task; index: number; onComplete: () => void; onDelete: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={FadeInLeft.delay(index * 55).duration(350).springify()}
      style={[styles.taskCard, animStyle]}
    >
      <TouchableOpacity
        onPressIn={() => { scale.value = withSpring(0.97); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        activeOpacity={1}
        style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
      >
        <View style={[styles.categoryDot, { backgroundColor: CATEGORY_COLORS[item.category] ?? '#6C63FF' }]} />
        <View style={styles.taskBody}>
          <Text style={[styles.taskText, item.status === 'Completed' && styles.taskDone]}>{item.text}</Text>
          <View style={styles.taskMeta}>
            <Text style={styles.metaTag}>{item.category}</Text>
            <Text style={[styles.metaTag, item.priority === 'High' ? styles.high : item.priority === 'Low' ? styles.low : styles.medium]}>
              {item.priority}
            </Text>
            {item.dueDate && <Text style={styles.metaTag}>📅 {item.dueDate}</Text>}
          </View>
        </View>
        <View style={styles.taskActions}>
          {item.status !== 'Completed' && (
            <TouchableOpacity onPress={onComplete} style={styles.doneBtn}>
              <Ionicons name="checkmark-circle" size={26} color="#22C55E" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onDelete} style={styles.delBtn}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function TasksScreen() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Completed'>('All');
  const [text, setText] = useState('');
  const [category, setCategory] = useState('Study');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [dueTime, setDueTime] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(ENDPOINTS.getTasksByUser(user.id));
      setTasks(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const formatDateOnly    = (d: Date) => d.toISOString().split('T')[0];
  const formatTimeDisplay = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const formatDateDisplay = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const getCombinedDateTime = (): Date | null => {
    if (!dueDate) return null;
    const combined = new Date(dueDate);
    if (dueTime) combined.setHours(dueTime.getHours(), dueTime.getMinutes(), 0, 0);
    else combined.setHours(23, 59, 0, 0);
    return combined;
  };

  const resetForm = () => {
    setText(''); setDueDate(null); setDueTime(null);
    setCategory('Study'); setPriority('Medium');
    setShowDatePicker(false); setShowTimePicker(false);
  };

  const addTask = async () => {
    if (!text.trim()) { Alert.alert('Error', 'Task description is required.'); return; }
    setSaving(true);
    try {
      await axios.post(ENDPOINTS.addTask, {
        text: text.trim(), category, priority,
        dueDate: dueDate ? formatDateOnly(dueDate) : null,
        userId: user!.id,
      });
      await sendTaskCreatedNotification(text.trim(), category);
      const combined = getCombinedDateTime();
      if (combined && combined > new Date()) {
        await scheduleDueNotification(text.trim(), combined);
        Alert.alert('✅ Task Added!', `Deadline reminder set for ${formatDateDisplay(combined)} at ${formatTimeDisplay(combined)}`);
      }
      resetForm(); setModalVisible(false); fetchTasks();
    } catch (e) { Alert.alert('Error', 'Failed to add task.'); }
    finally { setSaving(false); }
  };

  const completeTask = async (id: string, taskText: string, cat: string) => {
    try {
      const res = await axios.put(ENDPOINTS.completeTask(id));
      const tokensAwarded = res.data?.tokensAwarded ?? 0;
      if (tokensAwarded > 0) {
        await Notifications.scheduleNotificationAsync({
          content: { title: '🎉 Task Completed!', body: `"${taskText}" done! +${tokensAwarded} tokens earned 🏆`, sound: 'default' },
          trigger: null,
        });
      }
      fetchTasks();
    } catch (e) { Alert.alert('Error', 'Failed to complete task.'); }
  };

  const deleteTask = async (id: string) => {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await axios.delete(ENDPOINTS.deleteTask(id)); fetchTasks(); }
        catch (e) { Alert.alert('Error', 'Failed to delete task.'); }
      }},
    ]);
  };

  const filtered = tasks.filter(t => filter === 'All' || t.status === filter);

  const renderTask = ({ item, index }: { item: Task; index: number }) => (
    <TaskRow
      item={item} index={index}
      onComplete={() => completeTask(item.id, item.text, item.category)}
      onDelete={() => deleteTask(item.id)}
    />
  );

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(500).springify()} style={styles.header}>
        <Text style={styles.title}>Daily Tasks</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.filterRow}>
        {(['All', 'Pending', 'Completed'] as const).map(f => (
          <TouchableOpacity key={f} style={[styles.filterTab, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#6C63FF" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={renderTask}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTasks(); }} tintColor="#6C63FF" />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={<Text style={styles.empty}>No tasks here. Add one!</Text>}
        />
      )}

      {/* Add Task Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalCard} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>New Task</Text>
            <TextInput style={styles.input} placeholder="What needs to be done?" placeholderTextColor="#64748B"
              value={text} onChangeText={setText} multiline />
            <Text style={styles.label}>Category</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c} style={[styles.chip, category === c && { backgroundColor: CATEGORY_COLORS[c] }]} onPress={() => setCategory(c)}>
                  <Text style={[styles.chipText, category === c && { color: '#fff' }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.chipRow}>
              {PRIORITIES.map(p => (
                <TouchableOpacity key={p} style={[styles.chip, priority === p && styles.chipActive]} onPress={() => setPriority(p)}>
                  <Text style={[styles.chipText, priority === p && { color: '#fff' }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Due Date <Text style={styles.optional}>(optional)</Text></Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => { setShowTimePicker(false); setShowDatePicker(true); }}>
              <Ionicons name="calendar-outline" size={18} color="#6C63FF" />
              <Text style={styles.pickerText}>{dueDate ? formatDateDisplay(dueDate) : 'Pick a date'}</Text>
              {dueDate && <TouchableOpacity onPress={() => { setDueDate(null); setDueTime(null); }}><Ionicons name="close-circle" size={18} color="#EF4444" /></TouchableOpacity>}
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker value={dueDate ?? new Date()} mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'} minimumDate={new Date()}
                onChange={(event, date) => { if (Platform.OS === 'android') setShowDatePicker(false); if (date) setDueDate(date); }} />
            )}
            {dueDate && (
              <>
                <Text style={styles.label}>Due Time <Text style={styles.optional}>(optional)</Text></Text>
                <TouchableOpacity style={styles.pickerBtn} onPress={() => { setShowDatePicker(false); setShowTimePicker(true); }}>
                  <Ionicons name="time-outline" size={18} color="#F59E0B" />
                  <Text style={styles.pickerText}>{dueTime ? formatTimeDisplay(dueTime) : 'Pick a time'}</Text>
                  {dueTime && <TouchableOpacity onPress={() => setDueTime(null)}><Ionicons name="close-circle" size={18} color="#EF4444" /></TouchableOpacity>}
                </TouchableOpacity>
                {showTimePicker && (
                  <DateTimePicker value={dueTime ?? new Date()} mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, time) => { if (Platform.OS === 'android') setShowTimePicker(false); if (time) setDueTime(time); }} />
                )}
              </>
            )}
            {dueDate && dueTime && (
              <View style={styles.summaryBox}>
                <Ionicons name="notifications-outline" size={16} color="#6C63FF" />
                <Text style={styles.summaryText}>You'll be notified at {formatDateDisplay(dueDate)}, {formatTimeDisplay(dueTime)}</Text>
              </View>
            )}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { resetForm(); setModalVisible(false); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addTask} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Add Task</Text>}
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
  addBtn:       { backgroundColor: '#6C63FF', borderRadius: 12, padding: 8 },
  filterRow:    { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterTab:    { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1A1A2E' },
  filterActive: { backgroundColor: '#6C63FF' },
  filterText:   { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  taskCard:     { flexDirection: 'row', backgroundColor: '#1A1A2E', borderRadius: 14, padding: 14, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  categoryDot:  { width: 4, height: '100%', borderRadius: 2, marginRight: 12, minHeight: 40 },
  taskBody:     { flex: 1 },
  taskText:     { fontSize: 15, color: '#E2E8F0', fontWeight: '500', marginBottom: 6 },
  taskDone:     { textDecorationLine: 'line-through', color: '#475569' },
  taskMeta:     { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  metaTag:      { fontSize: 11, color: '#94A3B8', backgroundColor: '#0F0F1A', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  high: { color: '#EF4444' }, medium: { color: '#F59E0B' }, low: { color: '#22C55E' },
  taskActions:  { flexDirection: 'row', gap: 4, alignItems: 'center' },
  doneBtn:      { padding: 4 }, delBtn: { padding: 4 },
  empty:        { textAlign: 'center', color: '#475569', marginTop: 60, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#1A1A2E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '92%' },
  modalTitle:   { fontSize: 20, fontWeight: '700', color: '#E2E8F0', marginBottom: 16 },
  input:        { backgroundColor: '#0F0F1A', borderRadius: 12, padding: 14, color: '#E2E8F0', fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  label:        { fontSize: 13, color: '#94A3B8', marginBottom: 8, fontWeight: '600' },
  optional:     { color: '#475569', fontWeight: '400', fontSize: 12 },
  chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#0F0F1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chipActive:   { backgroundColor: '#6C63FF' },
  chipText:     { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  pickerBtn:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0F0F1A', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pickerText:   { flex: 1, color: '#E2E8F0', fontSize: 15 },
  summaryBox:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(108,99,255,0.1)', borderRadius: 10, padding: 12, marginBottom: 14 },
  summaryText:  { flex: 1, fontSize: 13, color: '#6C63FF', fontWeight: '600' },
  modalBtns:    { flexDirection: 'row', gap: 12, marginTop: 4, marginBottom: 24 },
  cancelBtn:    { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#0F0F1A', alignItems: 'center' },
  cancelText:   { color: '#94A3B8', fontWeight: '600' },
  saveBtn:      { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#6C63FF', alignItems: 'center' },
  saveText:     { color: '#fff', fontWeight: '700' },
});
