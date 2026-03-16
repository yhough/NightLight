/**
 * MessageQueue component
 *
 * Reads queued messages from the native QueueBridge module and displays
 * them in a bottom-sheet modal. Refreshes when the app comes to foreground.
 */

import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  AppStateStatus,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Lazy-load the native module so the app doesn't crash on Android / web
// where the module won't be present.
let QueueBridge: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  QueueBridge = require('@/modules/queue-bridge').default;
} catch {
  // Native module not available (e.g. Expo Go, web)
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QueueItem {
  id: string;
  text: string;
  timestamp: number;
  status: 'cooling' | 'held' | 'draft' | 'ready';
  sendAt?: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

// ─── Colour tokens (NightLight palette) ──────────────────────────────────────

const C = {
  bg:          '#0D0D0D',
  surface:     'rgba(255,255,255,0.05)',
  border:      'rgba(255,255,255,0.08)',
  gold:        '#E8B030',
  goldDim:     'rgba(232,176,48,0.2)',
  pink:        '#E8558A',
  pinkDim:     'rgba(232,85,138,0.18)',
  white:       '#FFFFFF',
  muted:       'rgba(255,255,255,0.5)',
  dimText:     'rgba(255,255,255,0.65)',
  red:         'rgba(239,68,68,0.8)',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function useCountdown(sendAt: number | undefined): string {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!sendAt) return;

    const tick = () => {
      const remaining = sendAt - Date.now();
      if (remaining <= 0) {
        setLabel('ready');
        return;
      }
      const minutes = Math.floor(remaining / 60_000);
      const seconds = Math.floor((remaining % 60_000) / 1000);
      setLabel(`${minutes}:${seconds.toString().padStart(2, '0')} left`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sendAt]);

  return label;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ item }: { item: QueueItem }) {
  const countdown = useCountdown(item.status === 'cooling' ? item.sendAt : undefined);

  const labelMap: Record<QueueItem['status'], string> = {
    cooling: countdown || 'cooling',
    held:    'held until morning',
    draft:   'draft',
    ready:   'ready',
  };

  const colorMap: Record<QueueItem['status'], string> = {
    cooling: C.gold,
    held:    C.pink,
    draft:   C.muted,
    ready:   '#10B981',
  };

  return (
    <View style={[sb.badge, { borderColor: colorMap[item.status] + '44' }]}>
      <View style={[sb.dot, { backgroundColor: colorMap[item.status] }]} />
      <Text style={[sb.label, { color: colorMap[item.status] }]}>
        {labelMap[item.status]}
      </Text>
    </View>
  );
}

const sb = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
});

// ─── Individual queue card ────────────────────────────────────────────────────

interface CardProps {
  item: QueueItem;
  onSend: (item: QueueItem) => void;
  onRewrite: (item: QueueItem) => void;
  onDelete: (id: string) => void;
}

function QueueCard({ item, onSend, onRewrite, onDelete }: CardProps) {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -80) {
          // Swipe to delete
          Animated.timing(translateX, { toValue: -400, duration: 200, useNativeDriver: true }).start(
            () => onDelete(item.id)
          );
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[card.wrapper, { transform: [{ translateX }] }]}
      {...panResponder.panHandlers}
    >
      {/* Preview */}
      <Text style={card.preview} numberOfLines={3}>
        {item.text}
      </Text>

      {/* Meta row */}
      <View style={card.meta}>
        <Text style={card.time}>
          {formatDate(item.timestamp)} · {formatTimestamp(item.timestamp)}
        </Text>
        <StatusBadge item={item} />
      </View>

      {/* Actions */}
      <View style={card.actions}>
        <TouchableOpacity style={[card.btn, { borderColor: C.gold + '44' }]} onPress={() => onSend(item)}>
          <Text style={[card.btnText, { color: C.gold }]}>Send</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[card.btn, { borderColor: C.border }]} onPress={() => onRewrite(item)}>
          <Text style={[card.btnText, { color: C.dimText }]}>Rewrite</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[card.btn, { borderColor: 'rgba(239,68,68,0.3)' }]} onPress={() => onDelete(item.id)}>
          <Text style={[card.btnText, { color: C.red }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const card = StyleSheet.create({
  wrapper: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 12,
  },
  preview: {
    fontSize: 15,
    color: C.dimText,
    lineHeight: 22,
    marginBottom: 10,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  time: {
    fontSize: 12,
    color: C.muted,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

// ─── Rewrite modal ────────────────────────────────────────────────────────────

function RewriteModal({
  item,
  onSave,
  onClose,
}: {
  item: QueueItem | null;
  onSave: (id: string, text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(item?.text ?? '');

  useEffect(() => {
    setText(item?.text ?? '');
  }, [item]);

  if (!item) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={rw.overlay}>
        <View style={rw.sheet}>
          <Text style={rw.title}>Rewrite</Text>
          <TextInput
            style={rw.input}
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            placeholderTextColor={C.muted}
            placeholder="Edit your message…"
          />
          <View style={rw.row}>
            <TouchableOpacity style={rw.cancelBtn} onPress={onClose}>
              <Text style={rw.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={rw.saveBtn}
              onPress={() => {
                onSave(item.id, text.trim());
                onClose();
              }}
            >
              <Text style={rw.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const rw = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#161616',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: C.white,
    marginBottom: 16,
  },
  input: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    color: C.white,
    fontSize: 15,
    lineHeight: 22,
    padding: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelText: {
    color: C.muted,
    fontSize: 15,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: C.gold,
  },
  saveText: {
    color: '#0D0D0D',
    fontSize: 15,
    fontWeight: '600',
  },
});

// ─── Main MessageQueue component ──────────────────────────────────────────────

export default function MessageQueue({ visible, onClose }: Props) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [rewriteItem, setRewriteItem] = useState<QueueItem | null>(null);
  const appState = useRef(AppState.currentState);

  const loadItems = useCallback(async () => {
    if (!QueueBridge) return;
    try {
      const raw: QueueItem[] = await QueueBridge.getQueueItems();
      setItems(raw.sort((a, b) => b.timestamp - a.timestamp));
    } catch (e) {
      console.warn('[MessageQueue] Failed to load queue items', e);
    }
  }, []);

  // Load on open
  useEffect(() => {
    if (visible) loadItems();
  }, [visible, loadItems]);

  // Reload when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && state === 'active') {
        loadItems();
      }
      appState.current = state;
    });
    return () => sub.remove();
  }, [loadItems]);

  const handleSend = useCallback(async (item: QueueItem) => {
    // Copy to clipboard and open Messages
    await Clipboard.setStringAsync(item.text);
    try {
      await Linking.openURL('sms:');
    } catch {
      // Fallback: just notify user to paste
      Alert.alert('Copied!', 'Message copied to clipboard. Open Messages and paste.');
    }
    if (QueueBridge) {
      await QueueBridge.removeQueueItem(item.id);
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (QueueBridge) {
      await QueueBridge.removeQueueItem(id);
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleRewriteSave = useCallback(async (id: string, text: string) => {
    // Update status to "draft" with new text — we recreate via remove+add
    // since QueueBridge only exposes status updates, not text edits.
    // For a full implementation the native module would expose updateText.
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, text, status: 'draft' } : i))
    );
    if (QueueBridge) {
      await QueueBridge.updateQueueItemStatus(id, 'draft');
    }
  }, []);

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={mq.overlay}>
          <Pressable style={mq.backdrop} onPress={onClose} />

          <View style={mq.sheet}>
            {/* Handle */}
            <View style={mq.handle} />

            {/* Header */}
            <View style={mq.header}>
              <Text style={mq.title}>Message Queue</Text>
              <TouchableOpacity onPress={onClose} style={mq.closeBtn}>
                <Text style={mq.closeTxt}>Done</Text>
              </TouchableOpacity>
            </View>

            {items.length === 0 ? (
              <View style={mq.empty}>
                <Text style={mq.emptyIcon}>✦</Text>
                <Text style={mq.emptyTitle}>Queue is clear</Text>
                <Text style={mq.emptyBody}>
                  Messages you save from the Impulse Check extension will appear here.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={mq.list}
                contentContainerStyle={mq.listContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={mq.hint}>Swipe left on a card to delete</Text>
                {items.map((item) => (
                  <QueueCard
                    key={item.id}
                    item={item}
                    onSend={handleSend}
                    onRewrite={setRewriteItem}
                    onDelete={handleDelete}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <RewriteModal
        item={rewriteItem}
        onSave={handleRewriteSave}
        onClose={() => setRewriteItem(null)}
      />
    </>
  );
}

const mq = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: C.white,
  },
  closeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  closeTxt: {
    fontSize: 15,
    color: C.gold,
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },
  hint: {
    fontSize: 12,
    color: C.muted,
    textAlign: 'center',
    marginBottom: 16,
  },
  empty: {
    alignItems: 'center',
    padding: 48,
  },
  emptyIcon: {
    fontSize: 32,
    color: C.gold,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: C.white,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
