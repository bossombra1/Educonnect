import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FileText, Image, File, Link2, AlertTriangle } from 'lucide-react-native';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/theme';
import type { Message, MessageType, MessagePriority } from '@/types';

interface MessageCardProps {
  message: Message;
  onPress: (id: string) => void;
  isUnread: boolean;
}

function getTypeIcon(type: MessageType) {
  switch (type) {
    case 'image':
      return <Image size={18} color={Colors.primary} />;
    case 'pdf':
      return <File size={18} color={Colors.danger} />;
    case 'link':
      return <Link2 size={18} color={Colors.primaryLight} />;
    default:
      return <FileText size={18} color={Colors.primary} />;
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return 'Hier';
  return format(date, 'd MMM yyyy', { locale: fr });
}

function getPriorityBadge(priority: MessagePriority) {
  if (priority === 'urgent') {
    return (
      <View style={[styles.badge, styles.badgeUrgent]}>
        <AlertTriangle size={10} color={Colors.white} />
        <Text style={styles.badgeText}>Urgent</Text>
      </View>
    );
  }
  if (priority === 'high') {
    return (
      <View style={[styles.badge, styles.badgeHigh]}>
        <Text style={styles.badgeText}>Important</Text>
      </View>
    );
  }
  return null;
}

export default function MessageCard({ message, onPress, isUnread }: MessageCardProps) {
  const hasAttachment = message.message_type !== 'text' || !!message.file_url || !!message.link_url;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        Shadows.sm,
        isUnread && styles.cardUnread,
      ]}
      onPress={() => onPress(message.id)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {getTypeIcon(message.message_type)}
          <Text style={[styles.title, isUnread && styles.titleBold]} numberOfLines={1}>
            {message.title}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {isUnread && <View style={styles.unreadDot} />}
          <Text style={styles.date}>{formatDate(message.sent_at)}</Text>
        </View>
      </View>

      <Text style={styles.content} numberOfLines={3}>
        {message.content}
      </Text>

      <View style={styles.footer}>
        {getPriorityBadge(message.priority)}
        {hasAttachment && (
          <View style={styles.attachmentChip}>
            <File size={12} color={Colors.gray500} />
            <Text style={styles.attachmentText}>
              {message.file_name ?? (message.message_type === 'pdf' ? 'Document PDF' : message.message_type === 'image' ? 'Image' : 'Pièce jointe')}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '400',
    color: Colors.gray800,
    fontFamily: 'system-ui',
    flex: 1,
  },
  titleBold: {
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  date: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontFamily: 'system-ui',
  },
  content: {
    fontSize: FontSize.sm,
    color: Colors.gray600,
    lineHeight: 20,
    fontFamily: 'system-ui',
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  badgeUrgent: {
    backgroundColor: Colors.urgent,
  },
  badgeHigh: {
    backgroundColor: Colors.warning,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'system-ui',
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  attachmentText: {
    fontSize: 10,
    color: Colors.gray500,
    fontFamily: 'system-ui',
  },
});
