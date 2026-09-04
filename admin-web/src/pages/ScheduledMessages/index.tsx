import { useState, useEffect, useCallback } from 'react';
import { XCircle, Eye, RefreshCw } from 'lucide-react';
import { messageService } from '@/services/message.service';
import Table, { type Column } from '@/components/ui/Table';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatDateTime, getPriorityLabel, getPriorityColor } from '@/utils/formatters';
import toast from 'react-hot-toast';

type ScheduledRow = {
  id: string;
  messageId: string;
  title: string | null;
  content: string;
  messageType: string;
  priority: 'normal' | 'important' | 'urgent';
  scheduledAt: string;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  retryCount: number;
  errorMessage?: string | null;
  recipientCount: number;
  targetGroups: Array<{ id: string; name: string; type?: string }>;
  targetClasses: Array<{ id: string; name: string; level?: string; section?: string }>;
  senderName: string;
};

const statusBadge: Record<ScheduledRow['status'], 'warning' | 'info' | 'success' | 'danger'> = { pending: 'warning', processing: 'info', sent: 'success', failed: 'danger', cancelled: 'info' };
const statusLabel: Record<ScheduledRow['status'], string> = { pending: 'En attente', processing: 'En cours', sent: 'Envoyé', failed: 'Échoué', cancelled: 'Annulé' };

export default function ScheduledMessagesPage() {
  const [messages, setMessages] = useState<ScheduledRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detailMsg, setDetailMsg] = useState<ScheduledRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ScheduledRow | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchScheduled = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await messageService.getScheduledMessages({ status: 'pending', limit: 100 });
      const rows = (res.data || []).map((row: any): ScheduledRow => ({
        id: String(row.id),
        messageId: String(row.message_id),
        title: row.title || null,
        content: row.content || '',
        messageType: row.message_type || 'text',
        priority: row.priority || 'normal',
        scheduledAt: row.scheduled_for,
        status: row.status,
        retryCount: Number(row.retry_count || 0),
        errorMessage: row.error_message || null,
        recipientCount: Number(row.recipient_count || 0),
        targetGroups: Array.isArray(row.target_groups) ? row.target_groups.map((group: any) => ({ id: String(group.id), name: group.name || '', type: group.type })) : [],
        targetClasses: Array.isArray(row.target_classes) ? row.target_classes.map((item: any) => ({ id: String(item.id), name: item.name || '', level: item.level, section: item.section })) : [],
        senderName: [row.sender_first_name, row.sender_last_name].filter(Boolean).join(' ') || '—',
      }));
      setMessages(rows);
    } catch (error) {
      console.error('Erreur chargement messages programmés:', error);
      setMessages([]);
      setLoadError('Impossible de charger les messages programmés. Vérifiez la connexion puis réessayez.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchScheduled(); }, [fetchScheduled]);

  const showDetail = (row: ScheduledRow) => setDetailMsg(row);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await messageService.cancelScheduledMessage(cancelTarget.id);
      toast.success('Message programmé annulé');
      setCancelTarget(null);
      await fetchScheduled();
    } catch (error) {
      console.error('Erreur annulation message programmé:', error);
      toast.error('Impossible d’annuler le message. Réessayez.');
    } finally {
      setCancelling(false);
    }
  };

  const columns: Column<ScheduledRow>[] = [
    { key: 'title', header: 'Titre', render: (row) => <span className="font-medium text-slate-900">{row.title || 'Sans titre'}</span> },
    { key: 'recipients', header: 'Destinataires', render: (row) => <span className="text-xs font-medium text-slate-700">{row.recipientCount}</span> },
    { key: 'scheduledAt', header: 'Date programmée', render: (row) => <span className="text-xs text-slate-600">{formatDateTime(row.scheduledAt)}</span> },
    { key: 'status', header: 'Statut', render: (row) => <Badge variant={statusBadge[row.status] || 'info'}>{statusLabel[row.status] || row.status}</Badge> },
    { key: 'priority', header: 'Priorité', render: (row) => <span className={getPriorityColor(row.priority)}>{getPriorityLabel(row.priority)}</span> },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (row) => <div className="flex items-center justify-end gap-1"><button type="button" aria-label={`Voir ${row.title || 'le message'}`} onClick={() => showDetail(row)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary focus-visible:outline-none"><Eye className="h-4 w-4" /></button>{row.status === 'pending' && <button type="button" aria-label={`Annuler ${row.title || 'le message'}`} onClick={() => setCancelTarget(row)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none"><XCircle className="h-4 w-4" /></button>}</div> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-lg font-semibold tracking-tight text-slate-900">Messages programmés</h1><p className="mt-0.5 text-xs text-muted">{messages.length} message(s) en attente</p></div>
        <Button variant="ghost" onClick={() => void fetchScheduled()}><RefreshCw className="h-4 w-4" /> Actualiser</Button>
      </div>
      {loadError && <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"><span>{loadError}</span><Button variant="secondary" onClick={() => void fetchScheduled()}>Réessayer</Button></div>}
      <Card className="!p-0 overflow-hidden"><Table columns={columns} data={messages} loading={loading} keyExtractor={(row) => row.id} emptyMessage={loadError ? 'Impossible de charger les messages' : 'Aucun message programmé'} /></Card>
      <Modal open={!!detailMsg} onClose={() => setDetailMsg(null)} title={detailMsg?.title || 'Détails du message'} size="lg">
        {detailMsg && <div className="space-y-4"><div><span className="text-xs font-medium text-muted">Contenu :</span><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-900">{detailMsg.content}</p></div><div className="grid grid-cols-1 gap-3 border-y border-line py-3 text-xs sm:grid-cols-2"><div><span className="text-muted">Auteur :</span> <span className="font-medium text-slate-900">{detailMsg.senderName}</span></div><div><span className="text-muted">Destinataires :</span> <span className="font-medium text-slate-900">{detailMsg.recipientCount}</span></div><div><span className="text-muted">Type :</span> <span className="font-medium text-slate-900">{detailMsg.messageType}</span></div><div><span className="text-muted">Priorité :</span> <span className={getPriorityColor(detailMsg.priority)}>{getPriorityLabel(detailMsg.priority)}</span></div><div><span className="text-muted">Programmation :</span> <span className="font-medium text-slate-900">{formatDateTime(detailMsg.scheduledAt)}</span></div><div><span className="text-muted">Tentatives :</span> <span className="font-medium text-slate-900">{detailMsg.retryCount}</span></div></div>{detailMsg.targetGroups.length > 0 && <div><span className="text-xs font-medium text-muted">Groupes ciblés</span><div className="mt-2 flex flex-wrap gap-2">{detailMsg.targetGroups.map((group) => <Badge key={group.id} variant="info">{group.name}</Badge>)}</div></div>}{detailMsg.targetClasses.length > 0 && <div><span className="text-xs font-medium text-muted">Classes concernées</span><div className="mt-2 flex flex-wrap gap-2">{detailMsg.targetClasses.map((item) => <Badge key={item.id} variant="info">{item.name}{item.section ? ` — ${item.section}` : ''}</Badge>)}</div></div>}{detailMsg.errorMessage && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">Dernière erreur : {detailMsg.errorMessage}</div>}</div>}
      </Modal>
      <ConfirmDialog open={!!cancelTarget} title="Annuler le message" message="Voulez-vous vraiment annuler l'envoi programmé de ce message ?" onConfirm={handleCancel} onCancel={() => setCancelTarget(null)} loading={cancelling} />
    </div>
  );
}
