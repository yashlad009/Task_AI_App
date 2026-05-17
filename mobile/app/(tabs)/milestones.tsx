import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, Alert, RefreshControl, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../src/context/AuthContext';
import { ENDPOINTS } from '../../src/config/api';

interface Milestone {
  id: string;
  name: string;
  progress: number;
  celebrated: boolean;
  userId: string;
}

export default function MilestonesScreen() {
  const { user } = useAuth();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [updateModal, setUpdateModal] = useState(false);
  const [selected, setSelected] = useState<Milestone | null>(null);
  const [name, setName] = useState('');
  const [progress, setProgress] = useState('0');
  const [saving, setSaving] = useState(false);

  const fetchMilestones = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(ENDPOINTS.getMilestonesByUser(user.id));
      setMilestones(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { fetchMilestones(); }, [fetchMilestones]);

  const addMilestone = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Milestone name is required.'); return; }
    setSaving(true);
    try {
      await axios.post(ENDPOINTS.addMilestone, { name: name.trim(), progress: 0, userId: user!.id });
      setName(''); setAddModal(false); fetchMilestones();
    } catch (e) { Alert.alert('Error', 'Failed to add milestone.'); }
    finally { setSaving(false); }
  };

  const updateProgress = async () => {
    if (!selected) return;
    const p = parseInt(progress);
    if (isNaN(p) || p < 0 || p > 100) { Alert.alert('Error', 'Progress must be 0–100.'); return; }
    setSaving(true);
    try {
      await axios.put(`${ENDPOINTS.updateMilestoneProgress(selected.id)}?progress=${p}`);
      setUpdateModal(false); setSelected(null); fetchMilestones();
    } catch (e) { Alert.alert('Error', 'Failed to update progress.'); }
    finally { setSaving(false); }
  };

  const deleteMilestone = async (id: string) => {
    Alert.alert('Delete', 'Remove this milestone?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try { await axios.delete(ENDPOINTS.deleteMilestone(id)); fetchMilestones(); }
          catch (e) { Alert.alert('Error', 'Failed to delete.'); }
        }
      }
    ]);
  };

  const renderMilestone = ({ item }: { item: Milestone }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardName}>{item.name}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => { setSelected(item); setProgress(String(item.progress)); setUpdateModal(true); }}>
            <Ionicons name="pencil-outline" size={18} color="#6C63FF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteMilestone(item.id)} style={{ marginLeft: 12 }}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.progressRow}>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${item.progress}%`, backgroundColor: item.progress === 100 ? '#22C55E' : '#6C63FF' }]} />
        </View>
        <Text style={styles.progressText}>{item.progress}%</Text>
      </View>
      {item.progress === 100 && <Text style={styles.celebrate}>🎉 Completed!</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Milestones</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddModal(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#6C63FF" /></View>
      ) : (
        <FlatList
          data={milestones}
          keyExtractor={i => i.id}
          renderItem={renderMilestone}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMilestones(); }} tintColor="#6C63FF" />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={<Text style={styles.empty}>No milestones yet. Set a goal!</Text>}
        />
      )}

      {/* Add Modal */}
      <Modal visible={addModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Milestone</Text>
            <Text style={styles.label}>Goal Name</Text>
            <TextInput style={styles.input} placeholder="e.g. Complete DSA course" placeholderTextColor="#64748B"
              value={name} onChangeText={setName} />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addMilestone} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Add</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Update Modal */}
      <Modal visible={updateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Update Progress</Text>
            <Text style={styles.cardName}>{selected?.name}</Text>
            <Text style={styles.label}>Progress (0–100)</Text>
            <TextInput style={styles.input} placeholder="75" placeholderTextColor="#64748B"
              value={progress} onChangeText={setProgress} keyboardType="number-pad" />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setUpdateModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={updateProgress} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Update</Text>}
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
  addBtn: { backgroundColor: '#EC4899', borderRadius: 12, padding: 8 },
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#E2E8F0', flex: 1 },
  cardActions: { flexDirection: 'row', alignItems: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBg: { flex: 1, height: 8, backgroundColor: '#0F0F1A', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 13, fontWeight: '700', color: '#E2E8F0', minWidth: 36, textAlign: 'right' },
  celebrate: { fontSize: 13, color: '#22C55E', marginTop: 8, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#475569', marginTop: 60, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#1A1A2E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#E2E8F0', marginBottom: 16 },
  label: { fontSize: 13, color: '#94A3B8', marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#0F0F1A', borderRadius: 12, padding: 14, color: '#E2E8F0', fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#0F0F1A', alignItems: 'center' },
  cancelText: { color: '#94A3B8', fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#6C63FF', alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
});
