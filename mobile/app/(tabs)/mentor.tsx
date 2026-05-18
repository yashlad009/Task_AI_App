import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import Animated, { FadeInDown, FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../src/context/AuthContext';
import { ENDPOINTS } from '../../src/config/api';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content?: string;  // from backend history
  text?: string;     // local messages
}

function getMessageText(msg: Message): string {
  return msg.content ?? msg.text ?? '';
}

// Proper component — hooks at top level
function MessageBubble({ item }: { item: Message }) {
  const entering = item.role === 'user'
    ? FadeInRight.duration(300).springify()
    : FadeInLeft.duration(300).springify();

  return (
    <Animated.View entering={entering} style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
      {item.role === 'ai' && (
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={14} color="#6C63FF" />
        </View>
      )}
      <View style={[styles.bubbleContent, item.role === 'user' ? styles.userContent : styles.aiContent]}>
        <Text style={[styles.bubbleText, item.role === 'user' ? styles.userText : styles.aiText]}>
          {getMessageText(item)}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function MentorScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const listRef = useRef<FlatList>(null);

  // Load chat history on mount
  const loadHistory = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(ENDPOINTS.aiChatHistory(user.id));
      if (res.data && res.data.length > 0) {
        setMessages(res.data);
      } else {
        // No history — show welcome message
        setMessages([{
          id: '0', role: 'ai',
          text: "Hey! I'm Task AI, your AI mentor. Ask me anything about your tasks, productivity, or how to stay on track. 🚀",
        }]);
      }
    } catch (e) {
      // On error still show welcome
      setMessages([{
        id: '0', role: 'ai',
        text: "Hey! I'm Task AI, your AI mentor. Ask me anything about your tasks, productivity, or how to stay on track. 🚀",
      }]);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await axios.post(ENDPOINTS.aiChat(user!.id), { message: msg });
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', text: res.data.response };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'ai',
        text: 'Sorry, I had trouble connecting. Please try again.',
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const clearHistory = () => {
    Alert.alert('Clear Chat', 'Delete all chat history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive', onPress: async () => {
          try {
            await axios.delete(ENDPOINTS.aiClearHistory(user!.id));
            setMessages([{
              id: '0', role: 'ai',
              text: "Chat cleared! I'm Task AI, your AI mentor. How can I help you today? 🚀",
            }]);
          } catch (e) {
            Alert.alert('Error', 'Failed to clear history.');
          }
        }
      }
    ]);
  };

  if (historyLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={{ color: '#94A3B8', marginTop: 12, fontSize: 14 }}>Loading chat history...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Animated.View entering={FadeInDown.duration(500).springify()} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarCircle}>
            <Ionicons name="sparkles" size={20} color="#6C63FF" />
          </View>
          <View>
            <Text style={styles.title}>Task AI</Text>
            <Text style={styles.subtitle}>AI Productivity Mentor</Text>
          </View>
        </View>
        <TouchableOpacity onPress={clearHistory} style={styles.clearBtn}>
          <Ionicons name="trash-outline" size={18} color="#475569" />
        </TouchableOpacity>
      </Animated.View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={i => i.id}
        renderItem={({ item }) => <MessageBubble item={item} />}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {loading && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color="#6C63FF" />
          <Text style={styles.typingText}>Task AI is thinking...</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask your mentor..."
          placeholderTextColor="#64748B"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || loading}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0F0F1A' },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  headerLeft:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(108,99,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(108,99,255,0.3)' },
  title:           { fontSize: 18, fontWeight: '700', color: '#E2E8F0' },
  subtitle:        { fontSize: 12, color: '#94A3B8' },
  clearBtn:        { padding: 8 },
  messageList:     { padding: 16, paddingBottom: 8 },
  bubble:          { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  userBubble:      { justifyContent: 'flex-end' },
  aiBubble:        { justifyContent: 'flex-start', gap: 8 },
  aiAvatar:        { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(108,99,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  bubbleContent:   { maxWidth: '80%', borderRadius: 16, padding: 12 },
  userContent:     { backgroundColor: '#6C63FF', borderBottomRightRadius: 4 },
  aiContent:       { backgroundColor: '#1A1A2E', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  bubbleText:      { fontSize: 15, lineHeight: 22 },
  userText:        { color: '#fff' },
  aiText:          { color: '#E2E8F0' },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  typingText:      { fontSize: 13, color: '#94A3B8' },
  inputRow:        { flexDirection: 'row', padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', alignItems: 'flex-end' },
  input:           { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#E2E8F0', fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sendBtn:         { backgroundColor: '#6C63FF', borderRadius: 20, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  sendDisabled:    { opacity: 0.4 },
});
