import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#E2E8F0" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.meta}>Task Tracker (APMS PRO)</Text>
        <Text style={styles.meta}>Effective Date: May 18, 2026</Text>
        <Text style={styles.meta}>Company: Amazing Devs | Owner: Yash Lad</Text>
        <Text style={styles.meta}>Contact: tasktracker351@gmail.com</Text>

        <Section title="1. Introduction">
          Amazing Devs ("we", "our", or "us") operates the Task Tracker application, also known as APMS PRO. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our services. By registering or using Task Tracker, you agree to the terms described in this policy.
        </Section>

        <Section title="2. Information We Collect">
          <Bold>2.1 Information You Provide Directly</Bold>
          {`\n• Full name and email address during registration\n• OTP entered for email verification\n• Tasks you create — including titles, descriptions, deadlines, priorities, and progress updates\n• Any text or queries you submit to the AI Mentor\n• Admin key, if you register as an administrator`}
          {`\n\n`}<Bold>2.2 Information Collected Automatically</Bold>
          {`\n• Device type and operating system\n• App usage patterns such as task completion frequency, streak counts, and login times\n• Session activity such as pages visited within the app`}
          {`\n\n`}<Bold>2.3 Information We Do NOT Collect</Bold>
          {`\n• We do not collect your location or GPS data\n• We do not collect financial or payment information\n• We do not collect contacts, camera, microphone, or other sensitive device data`}
        </Section>

        <Section title="3. How We Use Your Information">
          {`• To create and manage your Task Tracker account\n• To verify your identity via OTP during registration and login\n• To display your tasks, deadlines, streaks, progress analytics, and certificates\n• To power the AI Mentor feature — your pending tasks and priorities are sent to Google Gemini API\n• To send smart reminders about upcoming deadlines\n• To improve the app experience based on aggregated, non-identifiable usage data\n• To respond to your support requests`}
        </Section>

        <Section title="4. Third-Party Services">
          <Bold>4.1 Google Gemini AI</Bold>
          {`\nThe AI Mentor feature sends your task-related data to Google's Gemini API. This data is processed by Google in accordance with their AI usage policies. We do not store your AI conversation history beyond the current session.\n\n`}
          <Bold>4.2 Google Firebase (OTP Verification)</Bold>
          {`\nWe use Google Firebase for OTP-based email verification. Firebase may collect device tokens and authentication metadata. Firebase is governed by Google's Privacy Policy at https://policies.google.com/privacy.`}
        </Section>

        <Section title="5. Data Storage and Security">
          {`• Your data is stored on secure servers hosted via Render (https://render.com)\n• We implement encrypted connections (HTTPS) and OTP-based authentication\n• Access to user data is restricted to authorized personnel of Amazing Devs only\n• No online system is 100% secure — we cannot guarantee absolute security`}
        </Section>

        <Section title="6. Data Retention">
          We retain your account information and task data for as long as your account remains active. You can delete individual tasks from within the app at any time. For full account deletion, contact us at tasktracker351@gmail.com and we will process it within 7 working days.
        </Section>

        <Section title="7. Data Sharing">
          We do not sell, rent, or trade your personal information to third parties. We may share your data only:{`\n• With Google Gemini AI and Firebase strictly for app functionality\n• If required by law or valid legal process\n• To protect the rights, safety, or property of Amazing Devs or its users`}
        </Section>

        <Section title="8. Children's Privacy">
          Task Tracker is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal data, contact us at tasktracker351@gmail.com.
        </Section>

        <Section title="9. Your Rights">
          {`• Access: Request a copy of the personal data we hold about you\n• Correction: Update your profile information within the app\n• Deletion: Delete task data within the app; contact us for full account deletion\n• Objection: Opt out of notifications via your device settings\n• Portability: Request an export of your task data by contacting us`}
        </Section>

        <Section title="10. Changes to This Privacy Policy">
          We may update this Privacy Policy periodically. When we make significant changes, we will update the effective date and notify users via the app or email. Continued use of Task Tracker after changes constitutes your acceptance of the revised policy.
        </Section>

        <Section title="11. Contact Us">
          {`Company: Amazing Devs\nOwner: Yash Lad\nEmail: tasktracker351@gmail.com\nWebsite: https://tasktracker-apms.onrender.com\nGoverning Law: Republic of India — Information Technology Act, 2000`}
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

function Bold({ children }: { children: React.ReactNode }) {
  return <Text style={styles.bold}>{children}</Text>;
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0F0F1A' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  backBtn:      { padding: 8 },
  headerTitle:  { fontSize: 17, fontWeight: '700', color: '#E2E8F0' },
  content:      { padding: 20, paddingBottom: 48 },
  meta:         { fontSize: 13, color: '#6C63FF', marginBottom: 4 },
  section:      { marginTop: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#E2E8F0', marginBottom: 8 },
  sectionBody:  { fontSize: 14, color: '#94A3B8', lineHeight: 22 },
  bold:         { fontWeight: '700', color: '#CBD5E1' },
});
