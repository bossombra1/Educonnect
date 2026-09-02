import { useState, useEffect, useCallback } from 'react';
import { Eye, Filter } from 'lucide-react';
import { messageService } from '@/services/message.service';
import Table, { type Column } from '@/components/ui/Table';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import Pagination from '@/components/ui/Pagination';
import Button from '@/components/ui/Button';
import { formatDateTime, getPriorityLabel, getPriorityColor } from '@/utils/formatters';
import type { Message } from '@/types';

export default function HistoryPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [detailMsg, setDetailMsg] = useState<Message | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 15, status: 'sent' };
      if (priorityFilter) params.priority = priorityFilter;
      if (typeFilter) params.type = typeFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await messageService.getMessageHistory(params as any);
      setMessages(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch { setMessages([]); }
    finally { setLoading(false); }
  }, [page, priorityFilter, typeFilter, startDate, endDate]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const showDetail = async (msg: Message) => {
    setDetailLoading(true);
    setDetailMsg(msg);
    try { setDetailMsg(await messageService.getMessage(msg.id)); }
    catch {}
    finally { setDetailLoading(false); }
  };

  const clearFilters = () => {
    setPriorityFilter(''); setTypeFilter(''); setStartDate(''); setEndDate(''); setPage(1);
  };

  const hasFilters = priorityFilter || typeFilter || startDate || endDate;
  const typeLabel: Record<string, string> = { text: 'Texte', image: 'Image', pdf: 'PDF', link: 'Lien' };
  const typeVariant: Record<string, 'info' | 'success' | 'danger' | 'warning'> = { text: 'info', image: 'success', pdf: 'danger', link: 'warning' };

  const columns: Column<Message>[] = [
    { key: 'title', header: 'Titre', render: (m) => <span className="font-medium text-gray-900">{m.title || m.content.slice(0, 40)}...</span> },
    { key: 'type', header: 'Type', render: (m) => <Badge variant={typeVariant[m.type] || 'default'}>{typeLabel[m.type] || m.type}</Badge> },
    { key: 'priority', header: 'Priorité', render: (m) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityColor(m.priority)}`}>{getPriorityLabel(m.priority)}</span> },
    { key: 'recipients', header: 'Destinataires', render: (m) => <span className="text-sm text-gray-600">{m.totalRecipients}</span> },
    { key: 'sentAt', header: 'Date d\'envoi', render: (m) => <span className="text-sm text-gray-600">{formatDateTime(m.sentAt || m.createdAt)}</span> },
    { key: 'readRate', header: 'Taux de lecture', render: (m) => {
      const rate = m.totalRecipients > 0 ? (m.readCount / m.totalRecipients) * 100 : 0;
      return <ProgressBar value={rate} color={rate >= 70 ? 'green' : rate >= 40 ? 'amber' : 'red'} />;
    }},
    { key: 'actions', header: 'Actions', className: 'text-right', render: (m) => (
      <button onClick={() => showDetail(m)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-primary"><Eye className="h-4 w-4" /></button>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant={showFilters ? 'primary' : 'secondary'} size="sm" onClick={() => setShowFilters(!showFilters)}><Filter className="h-4 w-4" /> Filtres</Button>
          {hasFilters && <button onClick={clearFilters} className="text-sm text-red-500 hover:text-red-700">Réinitialiser</button>}
        </div>
      </div>

      {showFilters && (
        <Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Priorité</label><select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"><option value="">Toutes</option><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></select></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Type</label><select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"><option value="">Tous</option><option value="text">Texte</option><option value="image">Image</option><option value="pdf">PDF</option><option value="link">Lien</option></select></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Date début</label><input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Date fin</label><input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
          </div>
        </Card>
      )}

      <Card className="!p-0 overflow-hidden">
        <Table columns={columns} data={messages as any} loading={loading} keyExtractor={(m) => m.id} emptyMessage="Aucun message envoyé" />
      </Card>

      <div className="flex justify-center">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <Modal open={!!detailMsg} onClose={() => setDetailMsg(null)} title={detailMsg?.title || 'Détails du message'} size="lg">
        {detailLoading ? <div className="py-8 text-center text-gray-400">Chargement...</div> : detailMsg ? (
          <div className="space-y-4">
            <div><span className="text-sm text-gray-500">Contenu :</span><p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{detailMsg.content}</p></div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Type :</span> <span className="font-medium">{typeLabel[detailMsg.type]}</span></div>
              <div><span className="text-gray-500">Priorité :</span> <span className={getPriorityColor(detailMsg.priority)}>{getPriorityLabel(detailMsg.priority)}</span></div>
              <div><span className="text-gray-500">Date :</span> <span className="font-medium">{formatDateTime(detailMsg.sentAt || detailMsg.createdAt)}</span></div>
              <div><span className="text-gray-500">Destinataires :</span> <span className="font-medium">{detailMsg.totalRecipients}</span></div>
              <div><span className="text-gray-500">Lus :</span> <span className="font-medium">{detailMsg.readCount} ({detailMsg.totalRecipients > 0 ? ((detailMsg.readCount / detailMsg.totalRecipients) * 100).toFixed(1) : 0}%)</span></div>
              <div><span className="text-gray-500">Livrés :</span> <span className="font-medium">{detailMsg.deliveryCount}</span></div>
            </div>
            {detailMsg.attachments.length > 0 && (
              <div><span className="text-sm text-gray-500">Pièces jointes :</span>
                <div className="mt-2 space-y-1">{detailMsg.attachments.map(a => <div key={a.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">📎 {a.filename}</div>)}</div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}