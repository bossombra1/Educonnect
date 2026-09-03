import { useState, useEffect, useCallback } from 'react';
import { Bell, Send, TrendingUp, TrendingDown, Hash } from 'lucide-react';
import apiClient from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SearchBar from '@/components/ui/SearchBar';
import Table, { type Column } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import StatCard from '@/components/ui/StatCard';
import Pagination from '@/components/ui/Pagination';
import { formatDateTime } from '@/utils/formatters';
import toast from 'react-hot-toast';

interface NotificationItem { id: string; user_id: string; user_name: string; title: string; body: string; fcm_status: 'pending' | 'sent' | 'delivered' | 'failed'; fcm_message_id?: string; created_at: string; delivered_at?: string; failed_reason?: string; }
interface NotificationStats { today: number; week: number; deliveryRate: number; failureRate: number; }
interface UserOption { id: string; name: string; email: string; }
interface GroupOption { id: string; name: string; }

const FCM_STATUS_MAP: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'danger' }> = {
  pending: { label: 'En attente', variant: 'warning' }, sent: { label: 'Envoyé', variant: 'info' }, delivered: { label: 'Délivré', variant: 'success' }, failed: { label: 'Échoué', variant: 'danger' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendTitle, setSendTitle] = useState('');
  const [sendBody, setSendBody] = useState('');
  const [sendTargetType, setSendTargetType] = useState<'users' | 'groups'>('users');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [sendErrors, setSendErrors] = useState<Record<string, string>>({});
  const [recipientLoadError, setRecipientLoadError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true); setLoadError(null);
    try {
      const params: Record<string, string | number> = { page, limit: 15 };
      if (search) params.search = search;
      const { data } = await apiClient.get<{ success: boolean; data: NotificationItem[]; pagination: { page: number; totalPages: number; total: number } }>('/notifications', { params });
      setNotifications(data.data); setTotalPages(data.pagination?.totalPages || 1); setTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
      setLoadError('Impossible de charger les notifications.');
    } finally { setLoading(false); }
  }, [page, search]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true); setStatsError(null);
    try {
      const { data } = await apiClient.get<{ success: boolean; data: NotificationStats }>('/notifications/stats');
      setStats(data.data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques de notifications:', error);
      setStatsError('Impossible de charger les statistiques.');
    } finally { setStatsLoading(false); }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleRowClick = (notification: NotificationItem) => { setSelectedNotification(notification); setDetailModalOpen(true); };

  const loadRecipients = async () => {
    setRecipientLoadError(null);
    try {
      const [usersRes, groupsRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: UserOption[] }>('/users/list'),
        apiClient.get<{ success: boolean; data: GroupOption[] }>('/groups'),
      ]);
      setUsers(usersRes.data.data || []); setGroups(groupsRes.data.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des destinataires:', error);
      setRecipientLoadError('Impossible de charger les utilisateurs et groupes.');
    }
  };

  const openSendModal = async () => {
    setSendTitle(''); setSendBody(''); setSendTargetType('users'); setSelectedUserIds([]); setSelectedGroupIds([]); setUserSearch(''); setSendErrors({}); setRecipientLoadError(null); setSendModalOpen(true);
    await loadRecipients();
  };

  const toggleUser = (id: string) => setSelectedUserIds((prev) => prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]);
  const toggleGroup = (id: string) => setSelectedGroupIds((prev) => prev.includes(id) ? prev.filter((gid) => gid !== id) : [...prev, id]);

  const validateSend = (): boolean => {
    const errors: Record<string, string> = {};
    if (!sendTitle.trim()) errors.title = 'Le titre est requis';
    if (!sendBody.trim()) errors.body = 'Le contenu est requis';
    if (sendTargetType === 'users' && selectedUserIds.length === 0) errors.recipients = 'Sélectionnez au moins un destinataire';
    if (sendTargetType === 'groups' && selectedGroupIds.length === 0) errors.recipients = 'Sélectionnez au moins un groupe';
    setSendErrors(errors); return Object.keys(errors).length === 0;
  };

  const handleSend = async () => {
    if (!validateSend()) return;
    setSending(true);
    try {
      const payload: Record<string, unknown> = { title: sendTitle.trim(), body: sendBody.trim() };
      if (sendTargetType === 'users') payload.user_ids = selectedUserIds; else payload.group_ids = selectedGroupIds;
      await apiClient.post('/notifications/send', payload);
      toast.success('Notification envoyée avec succès'); setSendModalOpen(false); await fetchNotifications(); await fetchStats();
    } catch (error) {
      console.error('Erreur lors de l’envoi de la notification:', error);
      toast.error('Erreur lors de l\'envoi de la notification');
    } finally { setSending(false); }
  };

  const filteredUsers = userSearch ? users.filter((u) => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())) : users;
  const columns: Column<NotificationItem>[] = [
    { key: 'created_at', header: 'Date', render: (n) => <span className="text-xs text-muted">{formatDateTime(n.created_at)}</span> },
    { key: 'user_name', header: 'Destinataire', render: (n) => <span className="text-sm font-medium text-slate-900">{n.user_name || '—'}</span> },
    { key: 'title', header: 'Titre', render: (n) => <span className="text-sm text-slate-700">{n.title}</span> },
    { key: 'fcm_status', header: 'Statut FCM', render: (n) => { const status = FCM_STATUS_MAP[n.fcm_status] || FCM_STATUS_MAP.pending; return <Badge variant={status.variant}>{status.label}</Badge>; } },
    { key: 'fcm_message_id', header: 'Message ID', render: (n) => <span className="font-mono text-[11px] text-slate-500">{n.fcm_message_id ? n.fcm_message_id.slice(0, 16) + '...' : '—'}</span> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-muted">Suivez les notifications push et envoyez des messages ciblés.</p>
        </div>
        <Button onClick={openSendModal}><Send className="h-4 w-4" /> Envoyer une notification</Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Bell className="h-5 w-5" />} label="Envoyées aujourd'hui" value={statsLoading ? '...' : stats?.today ?? 0} color="blue" />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Cette semaine" value={statsLoading ? '...' : stats?.week ?? 0} color="purple" />
        <StatCard icon={<Send className="h-5 w-5" />} label="Taux de délivrance" value={statsLoading ? '...' : `${(stats?.deliveryRate ?? 0).toFixed(1)}%`} color="green" />
        <StatCard icon={<TrendingDown className="h-5 w-5" />} label="Taux d'échec" value={statsLoading ? '...' : `${(stats?.failureRate ?? 0).toFixed(1)}%`} color="red" />
      </div>
      {statsError && <div role="alert" className="flex items-center justify-between gap-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"><span>{statsError}</span><Button variant="secondary" size="sm" onClick={fetchStats}>Réessayer</Button></div>}

      <Card className="overflow-hidden !p-0">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-sm font-semibold text-slate-900">Historique des notifications</h2><p className="mt-0.5 text-xs text-muted">{total} notification(s)</p></div>
          <div className="w-full sm:max-w-xs"><SearchBar onSearch={(value) => { setSearch(value); setPage(1); }} placeholder="Rechercher par nom ou titre..." /></div>
        </div>
        {loadError && <div role="alert" className="mx-4 mt-3 flex items-center justify-between gap-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"><span>{loadError}</span><Button variant="secondary" size="sm" onClick={fetchNotifications}>Réessayer</Button></div>}
        <div className="overflow-x-auto"><Table columns={columns} data={notifications as any} loading={loading} onRowClick={handleRowClick} keyExtractor={(n) => n.id} emptyMessage="Aucune notification trouvée" /></div>
      </Card>
      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}

      <Modal open={detailModalOpen} onClose={() => setDetailModalOpen(false)} title="Détails de la notification" size="md">
        {selectedNotification && <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><p className="text-[11px] font-medium uppercase tracking-wider text-muted">Destinataire</p><p className="mt-1 text-sm font-medium text-slate-900">{selectedNotification.user_name || '—'}</p></div><div><p className="text-[11px] font-medium uppercase tracking-wider text-muted">Statut FCM</p><div className="mt-1">{(() => { const status = FCM_STATUS_MAP[selectedNotification.fcm_status] || FCM_STATUS_MAP.pending; return <Badge variant={status.variant}>{status.label}</Badge>; })()}</div></div><div><p className="text-[11px] font-medium uppercase tracking-wider text-muted">Date d'envoi</p><p className="mt-1 text-sm text-slate-700">{formatDateTime(selectedNotification.created_at)}</p></div><div><p className="text-[11px] font-medium uppercase tracking-wider text-muted">Date de délivrance</p><p className="mt-1 text-sm text-slate-700">{selectedNotification.delivered_at ? formatDateTime(selectedNotification.delivered_at) : '—'}</p></div></div>
          <div><p className="text-[11px] font-medium uppercase tracking-wider text-muted">Titre</p><p className="mt-1 text-sm font-semibold text-slate-900">{selectedNotification.title}</p></div><div><p className="text-[11px] font-medium uppercase tracking-wider text-muted">Contenu</p><div className="mt-1 rounded-md border border-line bg-slate-50 p-3"><p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{selectedNotification.body}</p></div></div>
          {selectedNotification.fcm_message_id && <div><p className="text-[11px] font-medium uppercase tracking-wider text-muted">FCM Message ID</p><div className="mt-1 flex items-center gap-2 rounded-md border border-line bg-slate-50 px-3 py-2"><Hash className="h-4 w-4 text-slate-400" /><span className="break-all font-mono text-xs text-slate-600">{selectedNotification.fcm_message_id}</span></div></div>}
          {selectedNotification.failed_reason && <div><p className="text-[11px] font-medium uppercase tracking-wider text-muted">Raison de l'échec</p><div className="mt-1 rounded-md border border-red-200 bg-red-50 px-3 py-2"><p className="text-sm text-red-700">{selectedNotification.failed_reason}</p></div></div>}
        </div>}
      </Modal>

      <Modal open={sendModalOpen} onClose={() => setSendModalOpen(false)} title="Envoyer une notification" size="lg">
        <div className="space-y-4">
          <div className="flex gap-1 rounded-md border border-line bg-slate-50 p-1"><button onClick={() => setSendTargetType('users')} className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors ${sendTargetType === 'users' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Utilisateurs</button><button onClick={() => setSendTargetType('groups')} className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors ${sendTargetType === 'groups' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Groupes</button></div>
          <div><div className="mb-2 flex items-center justify-between"><label className="text-sm font-medium text-slate-700">Destinataires</label>{sendTargetType === 'users' && selectedUserIds.length > 0 && <span className="text-xs font-medium text-primary">{selectedUserIds.length} sélectionné(s)</span>}{sendTargetType === 'groups' && selectedGroupIds.length > 0 && <span className="text-xs font-medium text-primary">{selectedGroupIds.length} sélectionné(s)</span>}</div>
            {sendErrors.recipients && <p className="mb-2 text-sm text-red-600">{sendErrors.recipients}</p>}
            {recipientLoadError && <div role="alert" className="mb-2 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span>{recipientLoadError}</span><Button variant="secondary" size="sm" onClick={loadRecipients}>Réessayer</Button></div>}
            <div className="max-h-48 overflow-y-auto rounded-md border border-line bg-white">
              {sendTargetType === 'users' && <><div className="border-b border-line p-2.5"><input type="search" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Rechercher un utilisateur..." className="w-full rounded-md border border-line px-3 py-2 text-sm placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>{filteredUsers.length === 0 ? <div className="p-4 text-center text-sm text-muted">Aucun utilisateur trouvé</div> : filteredUsers.slice(0, 30).map((u) => <label key={u.id} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2 hover:bg-slate-50 last:border-0"><input type="checkbox" checked={selectedUserIds.includes(u.id)} onChange={() => toggleUser(u.id)} className="rounded border-slate-300 text-primary focus:ring-primary" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-900">{u.name}</p><p className="truncate text-xs text-muted">{u.email}</p></div></label>)}</>}
              {sendTargetType === 'groups' && <>{groups.length === 0 ? <div className="p-4 text-center text-sm text-muted">Aucun groupe disponible</div> : groups.map((g) => <label key={g.id} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2 hover:bg-slate-50 last:border-0"><input type="checkbox" checked={selectedGroupIds.includes(g.id)} onChange={() => toggleGroup(g.id)} className="rounded border-slate-300 text-primary focus:ring-primary" /><span className="text-sm font-medium text-slate-900">{g.name}</span></label>)}</>}
            </div>
          </div>
          <Input label="Titre *" value={sendTitle} onChange={(e) => setSendTitle(e.target.value)} placeholder="Titre de la notification" error={sendErrors.title} />
          <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Contenu *</label><textarea value={sendBody} onChange={(e) => setSendBody(e.target.value)} rows={4} placeholder="Saisissez le contenu de la notification..." className={`w-full rounded-md border bg-white px-3 py-2 text-sm placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${sendErrors.body ? 'border-red-500' : 'border-line'}`} />{sendErrors.body && <p className="mt-1 text-sm text-red-600">{sendErrors.body}</p>}</div>
          <div className="flex flex-col-reverse justify-end gap-2 border-t border-line pt-3 sm:flex-row"><Button variant="secondary" onClick={() => setSendModalOpen(false)}>Annuler</Button><Button onClick={handleSend} loading={sending}><Send className="h-4 w-4" /> Envoyer</Button></div>
        </div>
      </Modal>
    </div>
  );
}