import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Modal, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import axios from 'axios';
import { useAuth } from '../../src/context/AuthContext';
import { ENDPOINTS } from '../../src/config/api';

const { width: SCREEN_W } = Dimensions.get('window');
const CERT_W = Math.min(SCREEN_W - 32, 380);

// ── Tier config ──────────────────────────────────────────────
const TIERS: Record<string, {
  key: string; name: string; icon: string; threshold: number;
  bg: string[]; border: string; accent: string; glow: string; badge: string;
}> = {
  Bronze: {
    key: 'Bronze', name: 'Bronze Certificate', icon: '🥉', threshold: 100,
    bg: ['#1A0F00', '#2D1A00', '#3D2400'],
    border: '#CD7F32', accent: '#E8A050', glow: 'rgba(205,127,50,0.4)', badge: '#CD7F32',
  },
  Silver: {
    key: 'Silver', name: 'Silver Certificate', icon: '🥈', threshold: 200,
    bg: ['#0D0D14', '#141420', '#1A1A2E'],
    border: '#C0C0C0', accent: '#E8E8F0', glow: 'rgba(192,192,192,0.4)', badge: '#C0C0C0',
  },
  Gold: {
    key: 'Gold', name: 'Gold Certificate', icon: '🥇', threshold: 500,
    bg: ['#1A1400', '#2D2400', '#3D3200'],
    border: '#FFD700', accent: '#FFE566', glow: 'rgba(255,215,0,0.5)', badge: '#FFD700',
  },
  'Elite 🚀': {
    key: 'Elite 🚀', name: 'Elite Badge', icon: '🔥', threshold: 1000,
    bg: ['#0A0014', '#14002D', '#1E0040'],
    border: '#EC4899', accent: '#F472B6', glow: 'rgba(236,72,153,0.5)', badge: '#EC4899',
  },
};

interface Achievement {
  key: string; name: string; icon: string;
  unlocked: boolean; unlockedDate?: string; threshold: number;
}

// ── Certificate Card (the actual certificate design) ──────────
function CertificateCard({
  tier, userName, unlockedDate, tokens,
}: {
  tier: typeof TIERS[string]; userName: string; unlockedDate: string; tokens: number;
}) {
  return (
    <View style={[certStyles.card, { borderColor: tier.border, width: CERT_W }]}>
      {/* Top glow bar */}
      <View style={[certStyles.glowBar, { backgroundColor: tier.border }]} />

      {/* Header */}
      <View style={certStyles.header}>
        <Text style={certStyles.orgText}>TASK TRACKER · AMAZING DEVS</Text>
        <Text style={certStyles.certLabel}>CERTIFICATE OF ACHIEVEMENT</Text>
      </View>

      {/* Big icon */}
      <View style={[certStyles.iconWrap, { shadowColor: tier.glow, borderColor: tier.border }]}>
        <Text style={certStyles.bigIcon}>{tier.icon}</Text>
      </View>

      {/* Title */}
      <Text style={[certStyles.tierName, { color: tier.accent }]}>{tier.name}</Text>

      {/* Divider */}
      <View style={[certStyles.divider, { backgroundColor: tier.border }]} />

      {/* Body */}
      <Text style={certStyles.presentedTo}>This certificate is proudly presented to</Text>
      <Text style={[certStyles.userName, { color: tier.accent }]}>{userName}</Text>

      <Text style={certStyles.bodyText}>
        for outstanding dedication, consistent task completion,
        and reaching <Text style={{ color: tier.accent, fontWeight: '700' }}>{tier.threshold} tokens</Text> on Task Tracker.
      </Text>

      {/* Stats row */}
      <View style={certStyles.statsRow}>
        <View style={[certStyles.statChip, { borderColor: tier.border }]}>
          <Text style={[certStyles.statVal, { color: tier.accent }]}>⚡ {tokens}</Text>
          <Text style={certStyles.statLbl}>Total Tokens</Text>
        </View>
        <View style={[certStyles.statChip, { borderColor: tier.border }]}>
          <Text style={[certStyles.statVal, { color: tier.accent }]}>{tier.threshold}+</Text>
          <Text style={certStyles.statLbl}>Milestone</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={[certStyles.footer, { borderTopColor: tier.border }]}>
        <Text style={certStyles.footerDate}>Awarded: {unlockedDate}</Text>
        <Text style={certStyles.footerSig}>Yash Lad · Amazing Devs</Text>
      </View>

      {/* Corner decorations */}
      <View style={[certStyles.cornerTL, { borderColor: tier.border }]} />
      <View style={[certStyles.cornerTR, { borderColor: tier.border }]} />
      <View style={[certStyles.cornerBL, { borderColor: tier.border }]} />
      <View style={[certStyles.cornerBR, { borderColor: tier.border }]} />
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────
export default function CertificatesScreen() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [tokens, setTokens] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Achievement | null>(null);
  const [saving, setSaving] = useState(false);
  const shotRef = useRef<ViewShot>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(ENDPOINTS.getAnalytics(user.id));
      const g = res.data?.gamification;
      setAchievements(g?.achievements ?? []);
      setTokens(g?.tokens ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveToGallery = async () => {
    if (!shotRef.current) return;
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow access to save the certificate to your gallery.');
        setSaving(false);
        return;
      }
      const uri = await (shotRef.current as any).capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('✅ Saved!', 'Certificate saved to your gallery.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save certificate.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  const unlocked = achievements.filter(a => a.unlocked);
  const locked   = achievements.filter(a => !a.unlocked);
  const userName = user?.email?.split('@')[0] ?? 'Student';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Certificates</Text>
        <Text style={styles.subtitle}>⚡ {tokens} tokens earned</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {unlocked.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyTitle}>No certificates yet</Text>
            <Text style={styles.emptyText}>Complete tasks to earn tokens and unlock your first certificate at 100 tokens.</Text>
          </View>
        )}

        {/* Unlocked */}
        {unlocked.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>UNLOCKED</Text>
            {unlocked.map(a => {
              const tier = TIERS[a.key] ?? TIERS['Bronze'];
              return (
                <TouchableOpacity
                  key={a.key}
                  style={[styles.certRow, { borderColor: tier.border }]}
                  onPress={() => setSelected(a)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.certIconWrap, { backgroundColor: `${tier.badge}22` }]}>
                    <Text style={styles.certIcon}>{a.icon}</Text>
                  </View>
                  <View style={styles.certInfo}>
                    <Text style={[styles.certName, { color: tier.accent }]}>{a.name}</Text>
                    <Text style={styles.certDate}>Unlocked {a.unlockedDate ?? 'recently'}</Text>
                  </View>
                  <View style={[styles.viewBtn, { backgroundColor: `${tier.badge}22`, borderColor: tier.border }]}>
                    <Text style={[styles.viewBtnText, { color: tier.accent }]}>View</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Locked */}
        {locked.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>LOCKED</Text>
            {locked.map(a => {
              const tier = TIERS[a.key] ?? TIERS['Bronze'];
              return (
                <View key={a.key} style={[styles.certRow, styles.certRowLocked]}>
                  <View style={styles.certIconWrap}>
                    <Text style={styles.certIcon}>🔒</Text>
                  </View>
                  <View style={styles.certInfo}>
                    <Text style={styles.certNameLocked}>{a.name}</Text>
                    <Text style={styles.certDate}>Requires {tier.threshold} tokens</Text>
                  </View>
                  <View style={styles.lockedBadge}>
                    <Text style={styles.lockedBadgeText}>{tokens}/{tier.threshold}</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Certificate Modal */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your Certificate</Text>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 16 }}>
              {selected && (() => {
                const tier = TIERS[selected.key] ?? TIERS['Bronze'];
                return (
                  <ViewShot ref={shotRef} options={{ format: 'png', quality: 1.0 }}>
                    <CertificateCard
                      tier={tier}
                      userName={userName}
                      unlockedDate={selected.unlockedDate ?? new Date().toLocaleDateString()}
                      tokens={tokens}
                    />
                  </ViewShot>
                );
              })()}
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={saveToGallery}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="download-outline" size={20} color="#fff" />
                    <Text style={styles.saveBtnText}>Save to Gallery</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Certificate card styles ───────────────────────────────────
const certStyles = StyleSheet.create({
  card: {
    backgroundColor: '#0F0F1A',
    borderWidth: 2, borderRadius: 20,
    padding: 24, alignItems: 'center',
    position: 'relative', overflow: 'hidden',
  },
  glowBar:    { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderRadius: 2 },
  header:     { alignItems: 'center', marginBottom: 16 },
  orgText:    { fontSize: 10, color: '#475569', letterSpacing: 2, fontWeight: '600' },
  certLabel:  { fontSize: 12, color: '#94A3B8', letterSpacing: 1.5, marginTop: 4, fontWeight: '700' },
  iconWrap:   {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2, justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 20, elevation: 10,
  },
  bigIcon:    { fontSize: 40 },
  tierName:   { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginBottom: 12 },
  divider:    { width: 60, height: 2, borderRadius: 1, marginBottom: 16, opacity: 0.6 },
  presentedTo:{ fontSize: 12, color: '#64748B', marginBottom: 6 },
  userName:   { fontSize: 20, fontWeight: '800', marginBottom: 12, letterSpacing: -0.3 },
  bodyText:   { fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 18, marginBottom: 16, paddingHorizontal: 8 },
  statsRow:   { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statChip:   { flex: 1, borderWidth: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  statVal:    { fontSize: 16, fontWeight: '800' },
  statLbl:    { fontSize: 10, color: '#64748B', marginTop: 2 },
  footer:     { width: '100%', borderTopWidth: 1, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', opacity: 0.6 },
  footerDate: { fontSize: 10, color: '#94A3B8' },
  footerSig:  { fontSize: 10, color: '#94A3B8' },
  // Corner decorations
  cornerTL:   { position: 'absolute', top: 10, left: 10, width: 16, height: 16, borderTopWidth: 2, borderLeftWidth: 2, borderRadius: 2 },
  cornerTR:   { position: 'absolute', top: 10, right: 10, width: 16, height: 16, borderTopWidth: 2, borderRightWidth: 2, borderRadius: 2 },
  cornerBL:   { position: 'absolute', bottom: 10, left: 10, width: 16, height: 16, borderBottomWidth: 2, borderLeftWidth: 2, borderRadius: 2 },
  cornerBR:   { position: 'absolute', bottom: 10, right: 10, width: 16, height: 16, borderBottomWidth: 2, borderRightWidth: 2, borderRadius: 2 },
});

// ── Screen styles ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0F0F1A' },
  center:         { flex: 1, backgroundColor: '#0F0F1A', justifyContent: 'center', alignItems: 'center' },
  header:         { padding: 20, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  title:          { fontSize: 24, fontWeight: '700', color: '#E2E8F0' },
  subtitle:       { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  content:        { padding: 16 },
  sectionLabel:   { fontSize: 11, fontWeight: '700', color: '#475569', letterSpacing: 1.5, marginBottom: 10, marginTop: 4 },
  certRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, gap: 12 },
  certRowLocked:  { borderColor: 'rgba(255,255,255,0.06)', opacity: 0.6 },
  certIconWrap:   { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  certIcon:       { fontSize: 22 },
  certInfo:       { flex: 1 },
  certName:       { fontSize: 15, fontWeight: '700' },
  certNameLocked: { fontSize: 15, fontWeight: '700', color: '#475569' },
  certDate:       { fontSize: 12, color: '#64748B', marginTop: 2 },
  viewBtn:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  viewBtnText:    { fontSize: 13, fontWeight: '700' },
  lockedBadge:    { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  lockedBadgeText:{ fontSize: 12, color: '#475569', fontWeight: '600' },
  emptyBox:       { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon:      { fontSize: 48, marginBottom: 12 },
  emptyTitle:     { fontSize: 18, fontWeight: '700', color: '#E2E8F0', marginBottom: 8 },
  emptyText:      { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  // Modal
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard:      { backgroundColor: '#0F0F1A', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32, maxHeight: '92%' },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  modalTitle:     { fontSize: 18, fontWeight: '700', color: '#E2E8F0' },
  closeBtn:       { padding: 4 },
  saveBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6C63FF', borderRadius: 14, padding: 16, marginHorizontal: 20, marginTop: 8 },
  saveBtnText:    { color: '#fff', fontWeight: '700', fontSize: 16 },
});
