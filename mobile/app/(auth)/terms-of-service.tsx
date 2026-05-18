import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TermsOfServiceScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#E2E8F0" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.meta}>Task Tracker (APMS PRO)</Text>
        <Text style={styles.meta}>Effective Date: May 18, 2026</Text>
        <Text style={styles.meta}>Company: Amazing Devs | Owner: Yash Lad</Text>
        <Text style={styles.meta}>Contact: tasktracker351@gmail.com</Text>

        <Section title="1. Acceptance of Terms">
          By accessing or using Task Tracker (APMS PRO), provided by Amazing Devs, you agree to be bound by these Terms of Service. If you do not agree to these Terms, please do not use our application. These Terms apply to all users of the web application and the Android APK version of Task Tracker.
        </Section>

        <Section title="2. Eligibility">
          {`• You must be at least 13 years of age to use Task Tracker\n• The application is primarily designed for engineering students and academic users\n• By creating an account, you confirm that the information you provide is accurate and complete\n• Admin access is restricted to users explicitly authorized by Amazing Devs`}
        </Section>

        <Section title="3. Account Registration">
          {`• You must register with a valid email address and complete OTP verification via Google Firebase\n• You are responsible for maintaining the confidentiality of your account credentials\n• You are responsible for all activity that occurs under your account\n• Notify us immediately at tasktracker351@gmail.com if you suspect unauthorized access\n• Do not share your account credentials with others`}
        </Section>

        <Section title="4. Use of the Application">
          <Bold>4.1 Permitted Use</Bold>
          {`\nYou may use Task Tracker to:\n• Create, manage, and track your academic tasks and deadlines\n• Use the AI Mentor feature to get guidance on your academic workload\n• Track your streaks, progress analytics, and earn completion certificates\n• Access smart reminders for your upcoming deadlines\n\n`}
          <Bold>4.2 Prohibited Use</Bold>
          {`\nYou agree NOT to:\n• Use Task Tracker for any unlawful, harmful, or fraudulent purpose\n• Attempt to reverse-engineer, hack, or gain unauthorized access to the app or its servers\n• Upload or submit any malicious code, viruses, or harmful content\n• Misuse the AI Mentor feature to generate harmful, abusive, or inappropriate content\n• Impersonate another user or any representative of Amazing Devs\n• Scrape, copy, or reproduce the platform's content without prior written permission`}
        </Section>

        <Section title="5. AI Mentor Feature">
          By using the AI Mentor feature, you acknowledge and agree that:{`\n• Your task data is sent to Google Gemini API to generate responses\n• The AI Mentor provides suggestions only — it is not a substitute for professional academic advice\n• Amazing Devs is not responsible for decisions you make based on AI-generated responses\n• AI responses may occasionally be inaccurate or incomplete — use your own judgment\n• Amazing Devs reserves the right to disable or modify the AI Mentor feature at any time`}
        </Section>

        <Section title="6. Intellectual Property">
          All content, features, design, code, logos, and materials within Task Tracker are the intellectual property of Amazing Devs and Yash Lad. You agree not to copy, reproduce, distribute, or create derivative works without prior written consent.{`\n\n`}Your task data (content you create) remains your own. By using Task Tracker, you grant Amazing Devs a limited, non-exclusive license to store and process your content solely to provide the services.
        </Section>

        <Section title="7. Data and Privacy">
          Your use of Task Tracker is also governed by our Privacy Policy, which is incorporated into these Terms by reference. By agreeing to these Terms, you also agree to our Privacy Policy.
        </Section>

        <Section title="8. Account Suspension and Termination">
          Amazing Devs reserves the right to suspend or terminate your account at any time if:{`\n• You violate any provision of these Terms\n• You engage in abusive, harmful, or fraudulent behavior\n• Required by law or to protect the safety of other users\n\n`}Upon termination, your access will be revoked. You may request export of your task data prior to termination by contacting tasktracker351@gmail.com.
        </Section>

        <Section title="9. Disclaimers">
          Task Tracker is provided on an "as is" and "as available" basis. Amazing Devs makes no warranties, including:{`\n• Uninterrupted or error-free availability of the application\n• Accuracy or completeness of AI Mentor responses\n• Fitness of the app for any particular academic or professional purpose\n\n`}We reserve the right to modify, suspend, or discontinue any part of the service at any time without prior notice.
        </Section>

        <Section title="10. Limitation of Liability">
          To the maximum extent permitted by applicable Indian law, Amazing Devs and Yash Lad shall not be liable for:{`\n• Any indirect, incidental, or consequential damages arising from your use of Task Tracker\n• Loss of data, academic performance outcomes, or missed deadlines\n• Any reliance placed on AI Mentor recommendations\n• Service interruptions caused by server downtime or third-party failures`}
        </Section>

        <Section title="11. Updates to the Application">
          Amazing Devs may release updates, new features, or changes to Task Tracker at any time. Continued use of the app after updates constitutes acceptance of the modified version.
        </Section>

        <Section title="12. Governing Law and Dispute Resolution">
          These Terms are governed by the laws of the Republic of India, specifically the Information Technology Act, 2000. Any disputes shall be subject to the exclusive jurisdiction of the courts located in Maharashtra, India.
        </Section>

        <Section title="13. Changes to These Terms">
          We reserve the right to update these Terms at any time. Significant changes will be communicated via the app or to your registered email. It is your responsibility to review these Terms periodically.
        </Section>

        <Section title="14. Contact Us">
          {`Company: Amazing Devs\nOwner: Yash Lad\nEmail: tasktracker351@gmail.com\nWebsite: https://tasktracker-apms.onrender.com\nGoverning Jurisdiction: Maharashtra, India`}
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
