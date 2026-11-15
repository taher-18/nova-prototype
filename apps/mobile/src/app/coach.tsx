import { Ionicons } from '@expo/vector-icons';
import {
  builtinAnswer,
  COACH_HISTORY_MAX,
  COACH_QUESTION_MAX,
  COACH_SUGGESTIONS,
  getExercise,
  type CoachAnswer,
  type CoachFallbackReason,
  type CoachSource,
} from '@gymapp/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { Stack, useLocalSearchParams } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { AppText } from '../components/AppText';
import { Screen } from '../components/Screen';
import { ApiError } from '../lib/api';
import { colors, fonts, radius, space } from '../theme';

interface Message {
  id: string;
  role: 'user' | 'coach';
  text: string;
  source?: CoachSource;
  reason?: CoachFallbackReason;
}

/** The general chat is kept on the phone; chats about one exercise start fresh. */
const CHAT_KEY = 'coach.chat';
const KEEP = 30;

function loadChat(): Message[] {
  try {
    return JSON.parse(Storage.getItemSync(CHAT_KEY) ?? '[]') as Message[];
  } catch {
    return [];
  }
}

export default function CoachScreen() {
  const { t, i18n } = useTranslation();
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const { exerciseId } = useLocalSearchParams<{ exerciseId?: string }>();
  const exercise = exerciseId ? getExercise(exerciseId) : undefined;
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const [messages, setMessages] = useState<Message[]>(() => (exercise ? [] : loadChat()));
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scroll = useRef<ScrollView>(null);

  const status = useQuery({
    queryKey: ['coach', 'status'],
    queryFn: () => api.get<{ ai: boolean; remaining: number | null; limit: number }>('/v1/coach/status'),
    retry: false,
  });

  useEffect(() => {
    if (exercise) return;
    try {
      Storage.setItemSync(CHAT_KEY, JSON.stringify(messages.slice(-KEEP)));
    } catch {}
  }, [messages, exercise]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || sending) return;
    const history = messages.slice(-COACH_HISTORY_MAX).map((m) => ({ role: m.role, text: m.text }));
    setMessages((m) => [...m, { id: randomUUID(), role: 'user', text: q }]);
    setText('');
    setSending(true);
    let reply: CoachAnswer;
    try {
      reply = await api.post<CoachAnswer>('/v1/coach/ask', { question: q, lang, exerciseId: exercise?.id, history });
      queryClient.setQueryData(['coach', 'status'], (old: typeof status.data) =>
        old && reply.remaining !== null ? { ...old, remaining: reply.remaining } : old,
      );
    } catch (err) {
      // Offline (or the server failed): answer on the phone.
      reply = {
        answer: builtinAnswer({ question: q, lang, exerciseId: exercise?.id }),
        source: 'builtin',
        remaining: null,
        reason: err instanceof ApiError && err.status === 0 ? 'offline' : 'unavailable',
      };
    }
    setMessages((m) => [...m, { id: randomUUID(), role: 'coach', text: reply.answer, source: reply.source, reason: reply.reason }]);
    setSending(false);
  }

  const suggestions = exercise ? COACH_SUGGESTIONS[lang].exercise : COACH_SUGGESTIONS[lang].general;
  const exName = exercise ? (lang === 'ar' ? exercise.nameAr : exercise.nameEn) : null;

  return (
    <Screen
      scroll={false}
      edges={['bottom']}
      footer={
        <View style={{ gap: space.sm }}>
          {status.data?.ai && status.data.remaining !== null ? (
            <AppText variant="caption" color={colors.muted} center>
              {t('coach.remaining', { count: status.data.remaining })}
            </AppText>
          ) : null}
          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('coach.placeholder')}
              placeholderTextColor={colors.muted}
              style={styles.input}
              multiline
              maxLength={COACH_QUESTION_MAX}
              accessibilityLabel={t('coach.placeholder')}
            />
            <Pressable
              onPress={() => void send(text)}
              disabled={!text.trim() || sending}
              style={({ pressed }) => [styles.send, (!text.trim() || sending) && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
              accessibilityLabel={t('coach.send')}
            >
              <Ionicons name="arrow-up" size={22} color={colors.onPrimary} />
            </Pressable>
          </View>
        </View>
      }
    >
      <Stack.Screen options={{ title: exName ? t('coach.titleAbout', { name: exName }) : t('coach.title') }} />
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.thread}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          <View style={styles.intro}>
            <View style={styles.introIcon}>
              <Ionicons name="sparkles" size={26} color={colors.primary} />
            </View>
            <AppText variant="heading" center>{exName ? t('coach.introAbout', { name: exName }) : t('coach.intro')}</AppText>
            <AppText variant="caption" color={colors.muted} center>{t('coach.disclaimer')}</AppText>
          </View>
        ) : null}

        {messages.map((m) => (
          <Bubble key={m.id} message={m} />
        ))}
        {sending ? (
          <View style={[styles.bubble, styles.coach]}>
            <ActivityIndicator color={colors.muted} />
          </View>
        ) : null}

        {!sending && (messages.length === 0 || messages.at(-1)?.role === 'coach') ? (
          <View style={styles.chips}>
            {suggestions.map((s) => (
              <Pressable key={s} onPress={() => void send(s)} style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}>
                <AppText variant="caption">{s}</AppText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Bubble({ message }: { message: Message }) {
  const { t } = useTranslation();
  const mine = message.role === 'user';
  const safety = message.source === 'safety';
  return (
    <View style={{ gap: 4, alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
      <View style={[styles.bubble, mine ? styles.mine : styles.coach, safety && styles.safety]}>
        {safety ? <Ionicons name="warning" size={18} color={colors.danger} /> : null}
        <AppText color={mine ? colors.onPrimary : colors.text}>{message.text}</AppText>
      </View>
      {message.source === 'builtin' ? (
        <AppText variant="caption" color={colors.muted}>
          {message.reason === 'limit'
            ? t('coach.quickLimit')
            : message.reason === 'offline'
              ? t('coach.quickOffline')
              : t('coach.quick')}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  thread: { gap: space.md, paddingBottom: space.md },
  intro: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  introIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg, gap: space.xs },
  mine: { backgroundColor: colors.primary, borderBottomEndRadius: radius.sm },
  coach: { backgroundColor: colors.surface, borderBottomStartRadius: radius.sm, alignSelf: 'flex-start' },
  safety: { backgroundColor: colors.dangerSoft },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingHorizontal: space.md,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
    paddingHorizontal: space.md,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
