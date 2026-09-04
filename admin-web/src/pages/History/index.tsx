import { useState, useEffect, useCallback } from 'react';
import { Eye, Filter, Paperclip } from 'lucide-react';
import { AxiosError } from 'axios';
import { messageService } from '@/services/message.service';
import Table, { type Column } from '@/components/ui/Table';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import Pagination from '@/components/ui/Pagination';
import Button from '@/components/ui/Button';
import { formatDateTime, getPriorityLabel, getPriorityColor } from '@/utils/formatters';
import type { Message, MessageRecipient } from '@/types';

function getDetailError(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response?.status === 404) return 'Ce message n’existe pas ou n’est plus accessible.';
    if (error.response?.status === 403) return 'Vous n’êtes pas autorisé à consulter ce message.';
    if (error.response?.status === 401) return 'Votre session a expiré. Veuillez vous reconnecter.';
  }
  return 'Impossible de charger les détails de ce message.';
}

function recipientName(recipient: MessageRecipient): string {
  const first = recipient.firstName || recipient.user?.firstName || '';
  const last = recipient.lastName || recipient.user?.lastName || '';
  return `${first} ${last}`.trim() || recipient.userId;
}

function recipientClass(recipient: MessageRecipient): string {
  if (recipient.className) return `${recipient.className}${recipient.level ? ` · ${recipient.level}` : ''}${recipient.section ? ` · ${recipient.section}` : ''}`;
  return '—';
}

function recipientStatus(recipient: MessageRecipient): string {
  return recipient.interactionStatus || recipient.status || 'pending';
}

const statusLabels: Record<string, string> = {
  pending: 'En attente', delivered: 'Livré', read: 'Lu', acknowledged: 'Accusé', failed: 'Échec',
  sent: 'Envoyé', processing: 'En traitement', draft: 'Brouillon',
};

const statusVariants: Record<string, 'default' | 'success' | 'danger' | 'warning' | 'info'> = {
  pending: 'warning', delivered: 'info', read: 'success', acknowledged: 'success', failed: 'danger',
  sent: 'success', processing: 'warning', draft: 'default',
};

export default function HistoryPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [detailMsg, setDetailMsg] = useState<Message | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params: Record<string, string | number> = { page, limit: 15, status: 'sent' };
      if (priorityFilter) params.priority = priorityFilter;
      if (typeFilter) params.type = typeFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await messageService.getMessageHistory(params);
      setMessages(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (error) {
      console.error('Erreur lors du chargement de l’historique:', error);
      setLoadError(getDetailError(error));
    } finally { setLoading(false); }
  }, [page, priorityFilter, typeFilter, startDate, endDate]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const showDetail = async (msg: Message) => {
    setDetailId(msg.id);
    setDetailLoading(true);
    setDetailError(null);
    setDetailMsg(null);
    try {
      const detail = await messageService.getMessageHistoryDetail(msg.id);
      setDetailMsg(detail);
    } catch (error) {
      console.error('Erreur lors du chargement du détail:', error);
      setDetailError(getDetailError(error));
    } finally { setDetailLoading(false); }
  };

  const closeDetail = () => {
    if (!detailLoading) {
      setDetailMsg(null);
      setDetailId(null);
      setDetailError(null);
    }
  };

  const retryDetail = () => {
    if (!detailId) return;
    const message = messages.find((item) => item.id === detailId);
    if (message) void showDetail(message);
  };

  const clearFilters = () => {
    setPriorityFilter(''); setTypeFilter(''); setStartDate(''); setEndDate(''); setPage(1);
  };

  const hasFilters = Boolean(priorityFilter || typeFilter || startDate || endDate);
  const typeLabel: Record<string, string> = { text: 'Texte', image: 'Image', pdf: 'PDF', link: 'Lien', circular: 'Circulaire' };
  const typeVariant: Record<string, 'info' | 'success' | 'danger' | 'warning'> = { text: 'info', image: 'success', pdf: 'danger', link: 'warning', circular: 'info' };
  const detailRecipients = detailMsg?.recipients || [];
  const detailReadRate = detailMsg && detailMsg.totalRecipients > 0 ? (detailMsg.readCount / detailMsg.totalRecipients) * 100 : 0;

  const columns: Column<Message>[] = [
    { key: 'title', header: 'Titre', render: (m) => <span className="font-medium text-slate-900">{m.title || `${m.content.slice(0, 40)}${m.content.length > 40 ? '...' : ''}`}</span> },
    { key: 'type', header: 'Type', render: (m) => <Badge variant={typeVariant[m.type] || 'default'}>{typeLabel[m.type] || m.type}</Badge> },
    { key: 'priority', header: 'Priorité', render: (m) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityColor(m.priority)}`}>{getPriorityLabel(m.priority)}</span> },
    { key: 'recipients', header: 'Destinataires', render: (m) => <span className="text-xs text-slate-600">{m.totalRecipients}</span> },
    { key: 'sentAt', header: 'Date d’envoi', render: (m) => <span className="text-xs text-slate-600">{formatDateTime(m.sentAt || m.createdAt)}</span> },
    { key: 'readRate', header: 'Taux de lecture', render: (m) => {
      const rate = m.totalRecipients > 0 ? (m.readCount / m.totalRecipients) * 100 : 0;
      return <ProgressBar value={rate} color={rate >= 70 ? 'green' : rate >= 40 ? 'amber' : 'red'} />;
    }},
    { key: 'actions', header: 'Actions', className: 'text-right', render: (m) => (
      <button type="button" aria-label={`Voir les détails de ${m.title || 'ce message'}`} onClick={() => showDetail(m)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary focus-visible:outline-none"><Eye className="h-4 w-4" /></button>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-lg font-semibold tracking-tight text-slate-900">Historique des messages</h1><p className="mt-0.5 text-xs text-muted">Messages envoyés et suivi de lecture</p></div>
        <div className="flex items-center gap-2">
          <Button variant={showFilters ? 'primary' : 'secondary'} size="sm" onClick={() => setShowFilters(!showFilters)}><Filter className="h-4 w-4" /> Filtres</Button>
          {hasFilters && <button type="button" onClick={clearFilters} className="text-xs font-medium text-red-600 hover:text-red-700">Réinitialiser</button>}
        </div>
      </div>

      {loadError && <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"><span>{loadError}</span><Button variant="secondary" size="sm" onClick={fetchMessages}>Réessayer</Button></div>}

      {showFilters && (
        <Card>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><label className="mb-1 block text-xs font-medium text-muted">Priorité</label><select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }} className="w-full rounded-md border border-line bg-white px-3 py-2 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"><option value="">Toutes</option><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></select></div>
            <div><label className="mb-1 block text-xs font-medium text-muted">Type</label><select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="w-full rounded-md border border-line bg-white px-3 py-2 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"><option value="">Tous</option><option value="text">Texte</option><option value="image">Image</option><option value="pdf">PDF</option><option value="link">Lien</option><option value="circular">Circulaire</option></select></div>
            <div><label className="mb-1 block text-xs font-medium text-muted">Date début</label><input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="w-full rounded-md border border-line bg-white px-3 py-2 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted">Date fin</label><input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="w-full rounded-md border border-line bg-white px-3 py-2 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
          </div>
        </Card>
      )}

      <Card className="!p-0 overflow-hidden"><Table columns={columns} data={messages} loading={loading} keyExtractor={(m) => m.id} emptyMessage="Aucun message envoyé" /></Card>
      <div className="flex justify-center"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>

      <Modal open={!!detailId} onClose={closeDetail} title={detailMsg?.title || 'Détails du message'} size="lg">
        {detailLoading ? <div className="py-10 text-center text-xs text-slate-400">Chargement des détails et des destinataires...</div> : detailError ? (
          <div role="alert" className="space-y-3 rounded-md border border-red-200 bg-red-50 p-4 text-xs text-red-700"><p>{detailError}</p><Button variant="secondary" size="sm" onClick={retryDetail}>Réessayer</Button></div>
        ) : detailMsg ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-line bg-slate-50 p-4 sm:grid-cols-2">
              <div><span className="text-xs text-muted">Auteur</span><p className="mt-1 text-sm font-medium text-slate-900">{detailMsg.sender ? `${detailMsg.sender.firstName} ${detailMsg.sender.lastName}`.trim() : '—'}</p></div>
              <div><span className="text-xs text-muted">Établissement</span><p className="mt-1 text-sm font-medium text-slate-900">{(detailMsg as Message & { establishmentName?: string }).establishmentName || '—'}</p></div>
              <div><span className="text-xs text-muted">Date d’envoi</span><p className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(detailMsg.sentAt || detailMsg.createdAt)}</p></div>
              <div><span className="text-xs text-muted">Statut</span><div className="mt-1"><Badge variant={statusVariants[detailMsg.status] || 'default'}>{statusLabels[detailMsg.status] || detailMsg.status}</Badge></div></div>
            </div>

            <div><span className="text-xs font-medium text-muted">Contenu</span><p className="mt-1 whitespace-pre-wrap rounded-md border border-line p-3 text-sm leading-6 text-slate-900">{detailMsg.content || 'Aucun contenu'}</p></div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-md border border-line p-3"><span className="text-xs text-muted">Destinataires</span><p className="mt-1 text-lg font-semibold text-slate-900">{detailMsg.totalRecipients}</p></div>
              <div className="rounded-md border border-line p-3"><span className="text-xs text-muted">Livrés</span><p className="mt-1 text-lg font-semibold text-slate-900">{detailMsg.deliveryCount}</p></div>
              <div className="rounded-md border border-line p-3"><span className="text-xs text-muted">Lus</span><p className="mt-1 text-lg font-semibold text-slate-900">{detailMsg.readCount}</p></div>
              <div className="rounded-md border border-line p-3"><span className="text-xs text-muted">Accusés</span><p className="mt-1 text-lg font-semibold text-slate-900">{detailMsg.acknowledgedCount ?? 0}</p></div>
            </div>

            <div><div className="mb-1 flex justify-between text-xs"><span className="font-medium text-muted">Taux de lecture</span><span className="font-medium text-slate-700">{detailReadRate.toFixed(1)}%</span></div><ProgressBar value={detailReadRate} color={detailReadRate >= 70 ? 'green' : detailReadRate >= 40 ? 'amber' : 'red'} /></div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><h3 className="mb-2 text-xs font-semibold text-slate-900">Groupes concernés</h3>{detailMsg.groups?.length ? <div className="space-y-1">{detailMsg.groups.map((group) => <div key={group.id} className="rounded-md border border-line px-3 py-2 text-xs"><span className="font-medium">{group.name}</span>{group.type && <span className="ml-2 text-muted">({group.type})</span>}</div>)}</div> : <p className="text-xs text-muted">Aucun groupe identifié</p>}</div>
              <div><h3 className="mb-2 text-xs font-semibold text-slate-900">Classes concernées</h3>{detailMsg.classes?.length ? <div className="space-y-1">{detailMsg.classes.map((item) => <div key={item.id} className="rounded-md border border-line px-3 py-2 text-xs"><span className="font-medium">{item.name}</span>{item.level && <span className="ml-2 text-muted">{item.level}{item.section ? ` · ${item.section}` : ''}</span>}</div>)}</div> : <p className="text-xs text-muted">Aucune classe identifiée</p>}</div>
            </div>

            <div><h3 className="mb-2 text-xs font-semibold text-slate-900">Destinataires réels ({detailRecipients.length})</h3>{detailRecipients.length === 0 ? <div className="rounded-md border border-dashed border-line p-4 text-center text-xs text-muted">Aucun destinataire trouvé.</div> : <div className="overflow-x-auto rounded-md border border-line"><table className="min-w-full text-xs"><thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left font-medium text-muted">Nom</th><th className="px-3 py-2 text-left font-medium text-muted">Rôle</th><th className="px-3 py-2 text-left font-medium text-muted">Matricule</th><th className="px-3 py-2 text-left font-medium text-muted">Classe</th><th className="px-3 py-2 text-left font-medium text-muted">Téléphone</th><th className="px-3 py-2 text-left font-medium text-muted">Statut</th></tr></thead><tbody>{detailRecipients.map((recipient, index) => { const status = recipientStatus(recipient); return <tr key={recipient.id || `${recipient.userId}-${index}`} className="border-t border-line"><td className="px-3 py-2"><div className="font-medium text-slate-900">{recipientName(recipient)}</div><div className="text-[11px] text-muted">{recipient.matricule || recipient.user?.matricule || '—'}</div></td><td className="px-3 py-2 text-slate-600">{recipient.role || recipient.user?.role || '—'}</td><td className="px-3 py-2 text-slate-600">{recipient.schoolMatricule || recipient.matricule || '—'}</td><td className="px-3 py-2 text-slate-600">{recipientClass(recipient)}</td><td className="px-3 py-2 text-slate-600">{recipient.phone || recipient.user?.phone || '—'}</td><td className="px-3 py-2"><Badge variant={statusVariants[status] || 'default'}>{statusLabels[status] || status}</Badge></td></tr>; })}</tbody></table></div>}</div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><h3 className="mb-2 text-xs font-semibold text-slate-900">Pièces jointes</h3>{detailMsg.attachments.length ? <div className="space-y-1">{detailMsg.attachments.map((attachment) => <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md border border-line bg-slate-50 px-3 py-2 text-xs text-primary hover:bg-slate-100"><Paperclip className="h-3.5 w-3.5" />{attachment.filename}</a>)}</div> : <p className="text-xs text-muted">Aucune pièce jointe</p>}</div>
              <div><h3 className="mb-2 text-xs font-semibold text-slate-900">Détails</h3><div className="space-y-1 text-xs text-slate-600"><p>Type : <strong>{typeLabel[detailMsg.type] || detailMsg.type}</strong></p><p>Priorité : <strong>{getPriorityLabel(detailMsg.priority)}</strong></p><p>Échecs : <strong>{detailMsg.failedCount ?? 0}</strong></p><p>Dernière modification : <strong>{formatDateTime(detailMsg.updatedAt)}</strong></p></div></div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
