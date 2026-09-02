import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Mail, Clock, Download, Users, Eye, BookOpen } from 'lucide-react';
import apiClient from '@/services/api';
import { messageService } from '@/services/message.service';
import { classService } from '@/services/class.service';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Table, { type Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDateTime } from '@/utils/formatters';
import type { Message, Class } from '@/types';
import toast from 'react-hot-toast';

interface Recipient {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  class_name: string;
  status: 'delivered' | 'read' | 'acknowledged' | 'pending';
  delivered_at: string | null;
  read_at: string | null;
  acknowledged_at: string | null;
}

interface RecipientStats {
  delivered: number;
  read: number;
  acknowledged: number;
  pending: number;
  total: number;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'default' }> = {
  delivered: { label: 'Délivré', variant: 'info' },
  read: { label: 'Lu', variant: 'success' },
  acknowledged: { label: 'Accusé de réception', variant: 'success' },
  pending: { label: 'En attente', variant: 'warning' },
};

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'delivered', label: 'Délivré' },
  { value: 'read', label: 'Lu' },
  { value: 'acknowledged', label: 'Accusé de réception' },
  { value: 'pending', label: 'En attente' },
];

export default function AcknowledgementsPage() {
  // Filters
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string>('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Table data
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Stats
  const [stats, setStats] = useState<RecipientStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Initial data loading
  const [initialLoading, setInitialLoading] = useState(true);

  // Fetch available messages and classes
  useEffect(() => {
    const fetchInitialData = async () => {
      setInitialLoading(true);
      try {
        const [messagesRes, classesRes] = await Promise.all([
          messageService.getMessages({ page: 1, limit: 100, status: 'sent' }).catch(() => ({ data: [], pagination: { page: 1, totalPages: 1, total: 0, limit: 100 } })),
          classService.getClasses().catch(() => []),
        ]);
        setMessages(messagesRes.data);
        setClasses(classesRes);
      } catch {
        setMessages([]);
        setClasses([]);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch recipients when filters change
  const fetchRecipients = useCallback(async () => {
    if (!selectedMessageId) {
      setRecipients([]);
      setStats(null);
      setTotalPages(1);
      return;
    }

    setLoading(true);
    setStatsLoading(true);

    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (selectedStatus) params.status = selectedStatus;
      if (selectedClassId) params.class_id = selectedClassId;

      const [recipientsRes, statsRes] = await Promise.all([
        apiClient
          .get<{ success: boolean; data: Recipient[]; pagination: { page: number; totalPages: number; total: number } }>(
            `/messages/${selectedMessageId}/recipients`,
            { params }
          )
          .catch(() => null),
        apiClient
          .get<{ success: boolean; data: RecipientStats }>(
            `/messages/${selectedMessageId}/recipient-stats`
          )
          .catch(() => null),
      ]);

      if (recipientsRes) {
        setRecipients(recipientsRes.data.data || []);
        setTotalPages(recipientsRes.data.pagination?.totalPages || 1);
      } else {
        setRecipients([]);
        setTotalPages(1);
      }

      if (statsRes) {
        setStats(statsRes.data.data);
      } else {
        setStats(null);
      }
    } catch {
      setRecipients([]);
      setStats(null);
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }, [selectedMessageId, selectedClassId, selectedStatus, page]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedMessageId, selectedClassId, selectedStatus]);

  const handleExport = async () => {
    if (!selectedMessageId) {
      toast.error('Veuillez sélectionner un message');
      return;
    }
    try {
      const params: Record<string, string> = {};
      if (selectedStatus) params.status = selectedStatus;
      if (selectedClassId) params.class_id = selectedClassId;

      const response = await apiClient.get(`/messages/${selectedMessageId}/acknowledgements/export`, {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `accuses-reception-${selectedMessageId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export téléchargé');
    } catch {
      toast.error('Erreur lors de l\'export');
    }
  };

  const columns: Column<Recipient>[] = [
    {
      key: 'last_name',
      header: 'Nom',
      render: (r) => <span className="font-medium text-gray-900">{r.last_name}</span>,
    },
    {
      key: 'first_name',
      header: 'Prénom',
      render: (r) => <span className="text-gray-700">{r.first_name}</span>,
    },
    {
      key: 'class_name',
      header: 'Classe',
      render: (r) => (
        <span className="text-gray-600">{r.class_name || '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (r) => {
        const config = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: 'delivered_at',
      header: 'Date réception',
      render: (r) => (
        <span className="text-sm text-gray-500">
          {r.delivered_at ? formatDateTime(r.delivered_at) : '—'}
        </span>
      ),
    },
    {
      key: 'read_at',
      header: 'Date lecture',
      render: (r) => (
        <span className="text-sm text-gray-500">
          {r.read_at ? formatDateTime(r.read_at) : '—'}
        </span>
      ),
    },
    {
      key: 'acknowledged_at',
      header: 'Date accusé',
      render: (r) => (
        <span className="text-sm text-gray-500">
          {r.acknowledged_at ? formatDateTime(r.acknowledged_at) : '—'}
        </span>
      ),
    },
  ];

  if (initialLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            label="Message"
            options={[
              { value: '', label: 'Sélectionner un message' },
              ...messages.map((m) => ({
                value: m.id,
                label: m.title || m.content.slice(0, 50) + '...',
              })),
            ]}
            value={selectedMessageId}
            onChange={(e) => setSelectedMessageId(e.target.value)}
          />
          <Select
            label="Classe"
            options={[
              { value: '', label: 'Toutes les classes' },
              ...classes.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          />
          <Select
            label="Statut"
            options={STATUS_OPTIONS}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          />
        </div>
      </Card>

      {/* Recipients Table */}
      {!selectedMessageId ? (
        <EmptyState
          icon={<Mail className="h-8 w-8" />}
          title="Sélectionnez un message"
          description="Choisissez un message ci-dessus pour voir les accusés de réception des destinataires."
        />
      ) : loading ? (
        <LoadingSpinner />
      ) : recipients.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8" />}
          title="Aucun destinataire"
          description="Aucun destinataire trouvé pour les filtres sélectionnés."
        />
      ) : (
        <Card className="!p-0 overflow-hidden">
          <Table
            columns={columns}
            data={recipients as any}
            keyExtractor={(r) => r.id}
          />
          <div className="border-t border-gray-100 px-6 py-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </Card>
      )}

      {/* Summary Bar + Export */}
      {stats && selectedMessageId && (
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">Total :</span>
                <span className="text-sm font-bold text-gray-900">{stats.total}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-500">Délivrés :</span>
                <span className="text-sm font-bold text-blue-700">{stats.delivered}</span>
                <span className="text-xs text-gray-400">
                  ({stats.total > 0 ? ((stats.delivered / stats.total) * 100).toFixed(1) : 0}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-sm text-gray-500">Lus :</span>
                <span className="text-sm font-bold text-emerald-700">{stats.read}</span>
                <span className="text-xs text-gray-400">
                  ({stats.total > 0 ? ((stats.read / stats.total) * 100).toFixed(1) : 0}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-gray-500">Accusés :</span>
                <span className="text-sm font-bold text-emerald-700">{stats.acknowledged}</span>
                <span className="text-xs text-gray-400">
                  ({stats.total > 0 ? ((stats.acknowledged / stats.total) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            </div>
            <Button variant="secondary" onClick={handleExport}>
              <Download className="h-4 w-4" /> Exporter CSV
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
