import { useState, useEffect, useCallback } from 'react';
import { Bell, Send, TrendingUp, TrendingDown, Hash } from 'lucide-react';
import apiClient from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import SearchBar from '@/components/ui/SearchBar';
import Table, { type Column } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import StatCard from '@/components/ui/StatCard';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDateTime } from '@/utils/formatters';
import toast from 'react-hot-toast';

interface NotificationItem {
  id: string;
  user_id: string;
  user_name: string;
  title: string;
  body: string;
  fcm_status: 'pending' | 'sent' | 'delivered' | 'failed';
  fcm_message_id?: string;
  created_at: string;
  delivered_at?: string;
  failed_reason?: string;
}

interface NotificationStats {
  today: number;
  week: number;
  deliveryRate: number;
  failureRate: number;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface GroupOption {
  id: string;
  name: string;
}

const FCM_STATUS_MAP: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'danger' }> = {
  pending: { label: 'En attente', variant: 'warning' },
  sent: { label: 'Envoyé', variant: 'info' },
  delivered: { label: 'Délivré', variant: 'success' },
  failed: { label: 'Échoué', variant: 'danger' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

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

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 15 };
      if (search) params.search = search;
      const { data } = await apiClient.get<{ success: boolean; data: NotificationItem[]; pagination: { page: number; totalPages: number; total: number } }>('/notifications', { params });
      setNotifications(data.data);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data } = await apiClient.get<{ success: boolean; data: NotificationStats }>('/notifications/stats');
      setStats(data.data);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRowClick = (notification: NotificationItem) => {
    setSelectedNotification(notification);
    setDetailModalOpen(true);
  };

  const openSendModal = async () => {
    setSendTitle('');
    setSendBody('');
    setSendTargetType('users');
    setSelectedUserIds([]);
    setSelectedGroupIds([]);
    setUserSearch('');
    setSendErrors({});
    setSendModalOpen(true);
    try {
      const [usersRes, groupsRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: UserOption[] }>('/users/list').catch(() => ({ data: { data: [] } })),
        apiClient.get<{ success: boolean; data: GroupOption[] }>('/groups').catch(() => ({ data: { data: [] } })),
      ]);
      setUsers(usersRes.data.data || []);
      setGroups(groupsRes.data.data || []);
    } catch {
      setUsers([]);
      setGroups([]);
    }
  };

  const toggleUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  const toggleGroup = (id: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((gid) => gid !== id) : [...prev, id]
    );
  };

  const validateSend = (): boolean => {
    const errors: Record<string, string> = {};
    if (!sendTitle.trim()) errors.title = 'Le titre est requis';
    if (!sendBody.trim()) errors.body = 'Le contenu est requis';
    if (sendTargetType === 'users' && selectedUserIds.length === 0) {
      errors.recipients = 'Sélectionnez au moins un destinataire';
    }
    if (sendTargetType === 'groups' && selectedGroupIds.length === 0) {
      errors.recipients = 'Sélectionnez au moins un groupe';
    }
    setSendErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSend = async () => {
    if (!validateSend()) return;
    setSending(true);
    try {
      const payload: Record<string, unknown> = {
        title: sendTitle.trim(),
        body: sendBody.trim(),
      };
      if (sendTargetType === 'users') {
        payload.user_ids = selectedUserIds;
      } else {
        payload.group_ids = selectedGroupIds;
      }
      await apiClient.post('/notifications/send', payload);
      toast.success('Notification envoyée avec succès');
      setSendModalOpen(false);
      fetchNotifications();
      fetchStats();
    } catch {
      toast.error('Erreur lors de l\'envoi de la notification');
    } finally {
      setSending(false);
    }
  };

  const filteredUsers = userSearch
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(userSearch.toLowerCase())
      )
    : users;

  const columns: Column<NotificationItem>[] = [
    {
      key: 'created_at',
      header: 'Date',
      render: (n) => <span className="text-sm text-gray-600">{formatDateTime(n.created_at)}</span>,
    },
    {
      key: 'user_name',
      header: 'Destinataire',
      render: (n) => <span className="font-medium text-gray-900">{n.user_name || '—'}</span>,
    },
    {
      key: 'title',
      header: 'Titre',
      render: (n) => <span className="text-gray-700">{n.title}</span>,
    },
    {
      key: 'fcm_status',
      header: 'Statut FCM',
      render: (n) => {
        const status = FCM_STATUS_MAP[n.fcm_status] || FCM_STATUS_MAP.pending;
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
    {
      key: 'fcm_message_id',
      header: 'Message ID',
      render: (n) => (
        <span className="font-mono text-xs text-gray-500">
          {n.fcm_message_id ? n.fcm_message_id.slice(0, 16) + '...' : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Bell className="h-6 w-6" />}
          label="Envoyées aujourd'hui"
          value={statsLoading ? '...' : stats?.today ?? 0}
          color="blue"
        />
        <StatCard
          icon={<TrendingUp className="h-6 w-6" />}
          label="Cette semaine"
          value={statsLoading ? '...' : stats?.week ?? 0}
          color="purple"
        />
        <StatCard
          icon={<Send className="h-6 w-6" />}
          label="Taux de délivrance"
          value={statsLoading ? '...' : `${(stats?.deliveryRate ?? 0).toFixed(1)}%`}
          color="green"
        />
        <StatCard
          icon={<TrendingDown className="h-6 w-6" />}
          label="Taux d'échec"
          value={statsLoading ? '...' : `${(stats?.failureRate ?? 0).toFixed(1)}%`}
          color="red"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <SearchBar onSearch={setSearch} placeholder="Rechercher par nom ou titre..." />
        </div>
        <Button onClick={openSendModal}>
          <Send className="h-4 w-4" /> Envoyer une notification
        </Button>
      </div>

      {/* Notifications Table */}
      <Card className="!p-0 overflow-hidden">
        <div className="px-6 py-4">
          <p className="text-sm text-gray-500">Total : {total} notification(s)</p>
        </div>
        <Table
          columns={columns}
          data={notifications as any}
          loading={loading}
          onRowClick={handleRowClick}
          keyExtractor={(n) => n.id}
          emptyMessage="Aucune notification trouvée"
        />
      </Card>

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* Detail Modal */}
      <Modal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Détails de la notification"
        size="md"
      >
        {selectedNotification && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Destinataire</p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {selectedNotification.user_name || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Statut FCM</p>
                <div className="mt-1">
                  {(() => {
                    const status = FCM_STATUS_MAP[selectedNotification.fcm_status] || FCM_STATUS_MAP.pending;
                    return <Badge variant={status.variant}>{status.label}</Badge>;
                  })()}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Date d'envoi</p>
                <p className="mt-1 text-sm text-gray-700">{formatDateTime(selectedNotification.created_at)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Date de délivrance</p>
                <p className="mt-1 text-sm text-gray-700">
                  {selectedNotification.delivered_at
                    ? formatDateTime(selectedNotification.delivered_at)
                    : '—'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Titre</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{selectedNotification.title}</p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Contenu</p>
              <div className="mt-1 rounded-lg bg-gray-50 p-4">
                <p className="whitespace-pre-wrap text-sm text-gray-700">{selectedNotification.body}</p>
              </div>
            </div>

            {selectedNotification.fcm_message_id && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">FCM Message ID</p>
                <div className="mt-1 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                  <Hash className="h-4 w-4 text-gray-400" />
                  <span className="font-mono text-xs text-gray-600">{selectedNotification.fcm_message_id}</span>
                </div>
              </div>
            )}

            {selectedNotification.failed_reason && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Raison de l'échec</p>
                <div className="mt-1 rounded-lg bg-red-50 px-3 py-2">
                  <p className="text-sm text-red-700">{selectedNotification.failed_reason}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Send Notification Modal */}
      <Modal
        open={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        title="Envoyer une notification"
        size="lg"
      >
        <div className="space-y-4">
          {/* Target Type Tabs */}
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setSendTargetType('users')}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                sendTargetType === 'users'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Utilisateurs
            </button>
            <button
              onClick={() => setSendTargetType('groups')}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                sendTargetType === 'groups'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Groupes
            </button>
          </div>

          {/* Recipient Selection */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Destinataires</label>
              {sendTargetType === 'users' && selectedUserIds.length > 0 && (
                <span className="text-xs font-medium text-primary">
                  {selectedUserIds.length} sélectionné(s)
                </span>
              )}
              {sendTargetType === 'groups' && selectedGroupIds.length > 0 && (
                <span className="text-xs font-medium text-primary">
                  {selectedGroupIds.length} sélectionné(s)
                </span>
              )}
            </div>
            {sendErrors.recipients && (
              <p className="mb-2 text-sm text-red-600">{sendErrors.recipients}</p>
            )}
            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white">
              {sendTargetType === 'users' && (
                <>
                  <div className="border-b border-gray-100 p-3">
                    <input
                      type="search"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Rechercher un utilisateur..."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-400">
                      Aucun utilisateur trouvé
                    </div>
                  ) : (
                    filteredUsers.slice(0, 30).map((u) => (
                      <label
                        key={u.id}
                        className="flex cursor-pointer items-center gap-3 border-b border-gray-50 px-4 py-2.5 hover:bg-gray-50 last:border-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(u.id)}
                          onChange={() => toggleUser(u.id)}
                          className="rounded border-gray-300 text-primary focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{u.name}</p>
                          <p className="truncate text-xs text-gray-400">{u.email}</p>
                        </div>
                      </label>
                    ))
                  )}
                </>
              )}
              {sendTargetType === 'groups' && (
                <>
                  {groups.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-400">
                      Aucun groupe disponible
                    </div>
                  ) : (
                    groups.map((g) => (
                      <label
                        key={g.id}
                        className="flex cursor-pointer items-center gap-3 border-b border-gray-50 px-4 py-2.5 hover:bg-gray-50 last:border-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroupIds.includes(g.id)}
                          onChange={() => toggleGroup(g.id)}
                          className="rounded border-gray-300 text-primary focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-900">{g.name}</span>
                      </label>
                    ))
                  )}
                </>
              )}
            </div>
          </div>

          {/* Title */}
          <Input
            label="Titre *"
            value={sendTitle}
            onChange={(e) => setSendTitle(e.target.value)}
            placeholder="Titre de la notification"
            error={sendErrors.title}
          />

          {/* Body */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Contenu *
            </label>
            <textarea
              value={sendBody}
              onChange={(e) => setSendBody(e.target.value)}
              rows={4}
              placeholder="Saisissez le contenu de la notification..."
              className={`w-full rounded-lg border bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 ${
                sendErrors.body ? 'border-red-500' : 'border-gray-200'
              }`}
            />
            {sendErrors.body && (
              <p className="mt-1 text-sm text-red-600">{sendErrors.body}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setSendModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSend} loading={sending}>
              <Send className="h-4 w-4" /> Envoyer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
