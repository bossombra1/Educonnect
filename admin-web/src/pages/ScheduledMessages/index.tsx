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
import type { ScheduledMessage, Message } from '@/types';
import toast from 'react-hot-toast';

const statusBadge: Record<string, 'warning' | 'info' | 'success' | 'danger'> = { pending: 'warning', processing: 'info', sent: 'success', failed: 'danger', cancelled: 'default' };
const statusLabel: Record<string, string> = { pending: 'En attente', processing: 'En cours', sent: 'Envoyé', failed: 'Échoué', cancelled: 'Annulé' };

export default function ScheduledMessagesPage() {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]); const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState<string | null>(null);
  const [detailMsg, setDetailMsg] = useState<Message | null>(null); const [detailLoading, setDetailLoading] = useState(false); const [detailError, setDetailError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ScheduledMessage | null>(null); const [cancelling, setCancelling] = useState(false);

  const fetchScheduled = useCallback(async () => {
    setLoading(true); setLoadError(null);
    try { const res = await messageService.getMessages({ status: 'pending' }); setMessages((res.data || []).map((m: Message) => ({ id: m.id, message: m, scheduledAt: m.scheduledAt || m.createdAt, status: m.status === 'pending' ? 'pending' : m.status === 'sent' ? 'sent' : m.status === 'failed' ? 'failed' : 'pending', retryCount: 0 }))); }
    catch (error) { console.error('Erreur chargement messages programmés:', error); setLoadError('Impossible de charger les messages programmés. Vérifiez la connexion puis réessayez.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void fetchScheduled(); }, [fetchScheduled]);

  const showDetail = async (sm: ScheduledMessage) => { setDetailLoading(true); setDetailError(null); setDetailMsg(sm.message); try { const msg = await messageService.getMessage(sm.id); setDetailMsg(msg); } catch (error) { console.error('Erreur détail message programmé:', error); setDetailError('Impossible de charger les détails du message. Réessayez.'); } finally { setDetailLoading(false); } };
  const handleCancel = async () => { if (!cancelTarget) return; setCancelling(true); try { await messageService.cancelScheduledMessage(cancelTarget.id); toast.success('Message programmé annulé'); setCancelTarget(null); await fetchScheduled(); } catch (error) { console.error('Erreur annulation message programmé:', error); toast.error('Impossible d’annuler le message. Réessayez.'); } finally { setCancelling(false); } };

  const columns: Column<ScheduledMessage>[] = [
    { key: 'title', header: 'Titre', render: (sm) => <span className="font-medium text-gray-900">{sm.message?.title || 'Sans titre'}</span> },
    { key: 'recipients', header: 'Destinataires', render: (sm) => <span className="text-sm text-gray-600">{sm.message?.totalRecipients ?? '—'}</span> },
    { key: 'scheduledAt', header: 'Date programmée', render: (sm) => <span className="text-sm text-gray-600">{formatDateTime(sm.scheduledAt)}</span> },
    { key: 'status', header: 'Statut', render: (sm) => <Badge variant={statusBadge[sm.status] || 'default'}>{statusLabel[sm.status] || sm.status}</Badge> },
    { key: 'priority', header: 'Priorité', render: (sm) => <span className={sm.message ? getPriorityColor(sm.message.priority) : ''}>{sm.message ? getPriorityLabel(sm.message.priority) : '—'}</span> },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (sm) => <div className="flex items-center justify-end gap-1"><button type="button" aria-label={`Voir ${sm.message?.title || 'le message'}`} onClick={() => void showDetail(sm)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-primary"><Eye className="h-4 w-4" /></button>{sm.status === 'pending' && <button type="button" aria-label={`Annuler ${sm.message?.title || 'le message'}`} onClick={() => setCancelTarget(sm)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><XCircle className="h-4 w-4" /></button>}</div> },
  ];

  return <div className="space-y-4">
    <div className="flex items-center justify-between"><p className="text-sm text-gray-500">{messages.length} message(s) programmé(s)</p><Button variant="ghost" onClick={() => void fetchScheduled}><RefreshCw className="h-4 w-4" /> Actualiser</Button></div>
    {loadError && <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{loadError}</span><Button variant="secondary" onClick={() => void fetchScheduled}>Réessayer</Button></div>}
    <Card className="!p-0 overflow-hidden"><Table columns={columns} data={messages as any} loading={loading} keyExtractor={(sm) => sm.id} emptyMessage={loadError ? 'Impossible de charger les messages' : 'Aucun message programmé'} /></Card>
    <Modal open={!!detailMsg} onClose={() => setDetailMsg(null)} title={detailMsg?.title || 'Détails du message'} size="lg">
      {detailLoading ? <div className="py-8 text-center text-gray-400">Chargement...</div> : detailError ? <div role="alert" className="space-y-3 py-6 text-center"><p className="text-sm text-red-600">{detailError}</p><Button variant="secondary" onClick={() => detailMsg && void showDetail({ id: detailMsg.id, message: detailMsg, scheduledAt: detailMsg.scheduledAt || detailMsg.createdAt, status: 'pending', retryCount: 0 })}>Réessayer</Button></div> : detailMsg ? <div className="space-y-4"><div><span className="text-sm font-medium text-gray-500">Contenu :</span><p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{detailMsg.content}</p></div><div className="grid grid-cols-2 gap-4 text-sm"><div><span className="text-gray-500">Type :</span> <span className="font-medium">{detailMsg.type}</span></div><div><span className="text-gray-500">Priorité :</span> <span className={getPriorityColor(detailMsg.priority)}>{getPriorityLabel(detailMsg.priority)}</span></div><div><span className="text-gray-500">Destinataires :</span> <span className="font-medium">{detailMsg.totalRecipients}</span></div><div><span className="text-gray-500">Taux de lecture :</span> <span className="font-medium">{detailMsg.totalRecipients > 0 ? ((detailMsg.readCount / detailMsg.totalRecipients) * 100).toFixed(1) : 0}%</span></div></div>{detailMsg.attachments.length > 0 && <div><span className="text-sm font-medium text-gray-500">Pièces jointes :</span><div className="mt-2 space-y-1">{detailMsg.attachments.map(a => <div key={a.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">📎 {a.filename}</div>)}</div></div>}</div> : null}
    </Modal>
    <ConfirmDialog open={!!cancelTarget} title="Annuler le message" message="Voulez-vous vraiment annuler l'envoi programmé de ce message ?" onConfirm={handleCancel} onCancel={() => setCancelTarget(null)} loading={cancelling} />
  </div>;
}
