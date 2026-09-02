import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, FileText, Download, ExternalLink, AlertTriangle, Shield } from 'lucide-react-native';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/theme';
import messageService from '@/services/message.service';
import { offlineManager } from '@/storage/offline';
import type { Message } from '@/types';

export default function MessageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMessage();
  }, [id]);

  const loadMessage = async () => {
    setLoading(true);
    setError('');
    try {
      const msg = await messageService.getMessageById(id);
      setMessage(msg);
      // Marquer comme lu
      try {
        await messageService.markAsRead(id);
      } catch {
        await offlineManager.queueReadReceipt(id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Impossible de charger ce message.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLink = (url: string) => {
    Linking.canOpenURL(url).then((can) => {
      if (can) {
        Linking.openURL(url);
      } else {
        Alert.alert('Erreur', 'Impossible d\'ouvrir ce lien.');
      }
    });
  };

  const getPriorityBadge = () => {
    if (message?.priority === 'urgent') {
      return (
        <View style={[styles.badge, styles.badgeUrgent]}>
          <AlertTriangle size={12} color={Colors.white} />
          <Text style={styles.badgeText}>Urgent</Text>
        </View>
      );
    }
    if (message?.priority === 'high') {
      return (
        <View style={[styles.badge, styles.badgeHigh]}>
          <Text style={styles.badgeText}>Important</Text>
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !message) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error || 'Message introuvable.'}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadMessage}>
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const formattedDate = format(new Date(message.sent_at), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* En-tête */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Titre et date */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>{message.title}</Text>
            {getPriorityBadge()}
          </View>
          <Text style={styles.date}>{formattedDate}</Text>
          {message.sender_name ? (
            <Text style={styles.sender}>Envoyé par {message.sender_name}</Text>
          ) : null}
        </View>

        {/* Contenu */}
        <View style={[styles.contentCard, Shadows.sm]}>
          <Text style={styles.content}>{message.content}</Text>
        </View>

        {/* Pièce jointe PDF */}
        {message.file_url && message.message_type === 'pdf' && (
          <TouchableOpacity
            style={[styles.attachmentCard, Shadows.sm]}
            onPress={() => handleOpenLink(message.file_url!)}
          >
            <FileText size={24} color={Colors.danger} />
            <View style={styles.attachmentInfo}>
              <Text style={styles.attachmentName}>{message.file_name ?? 'Document PDF'}</Text>
              <Text style={styles.attachmentHint}>Appuyez pour ouvrir</Text>
            </View>
            <Download size={20} color={Colors.gray400} />
          </TouchableOpacity>
        )}

        {/* Lien */}
        {message.link_url && (
          <TouchableOpacity
            style={[styles.attachmentCard, Shadows.sm]}
            onPress={() => handleOpenLink(message.link_url!)}
          >
            <ExternalLink size={24} color={Colors.primary} />
            <View style={styles.attachmentInfo}>
              <Text style={styles.attachmentName}>Lien externe</Text>
              <Text style={styles.attachmentHint} numberOfLines={1}>{message.link_url}</Text>
            </View>
            <ExternalLink size={20} color={Colors.gray400} />
          </TouchableOpacity>
        )}

        {/* Image placeholder */}
        {message.message_type === 'image' && message.file_url && (
          <TouchableOpacity
            style={[styles.attachmentCard, Shadows.sm]}
            onPress={() => handleOpenLink(message.file_url!)}
          >
            <FileText size={24} color={Colors.primary} />
            <View style={styles.attachmentInfo}>
              <Text style={styles.attachmentName}>Image jointe</Text>
              <Text style={styles.attachmentHint}>Appuyez pour afficher</Text>
            </View>
            <Download size={20} color={Colors.gray400} />
          </TouchableOpacity>
        )}

        {/* Pied de page */}
        <View style={styles.footer}>
          <Shield size={14} color={Colors.gray400} />
          <Text style={styles.footerText}>Message officiel de l'établissement</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing['3xl'],
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: Spacing.sm,
  },
  titleSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: FontSize['2xl'],
    fontWeight: '700',
    color: Colors.gray900,
    fontFamily: 'system-ui',
  },
  date: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    fontFamily: 'system-ui',
    textTransform: 'capitalize',
  },
  sender: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontFamily: 'system-ui',
    marginTop: 2,
  },
  contentCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing['2xl'],
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  content: {
    fontSize: FontSize.md,
    color: Colors.gray800,
    lineHeight: 24,
    fontFamily: 'system-ui',
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.gray800,
    fontFamily: 'system-ui',
  },
  attachmentHint: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontFamily: 'system-ui',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
    marginTop: 4,
  },
  badgeUrgent: {
    backgroundColor: Colors.urgent,
  },
  badgeHigh: {
    backgroundColor: Colors.warning,
  },
  badgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '600',
    fontFamily: 'system-ui',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xl,
    marginHorizontal: Spacing.lg,
  },
  footerText: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontFamily: 'system-ui',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  errorText: {
    color: Colors.danger,
    fontSize: FontSize.md,
    textAlign: 'center',
    fontFamily: 'system-ui',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '500',
    fontFamily: 'system-ui',
  },
});
