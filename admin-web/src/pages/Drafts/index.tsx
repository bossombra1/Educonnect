import { useCallback, useEffect, useState } from 'react';
import { Edit3, Send, Clock, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';
import { messageService } from '@/services/message.service';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { formatDateTime } from '@/utils/formatters';
import type { Message } from '@/types';

const statusLabels: Record<string, string> = { draft: 'Brouillon', pending: 'En attente', sent: 'Envoyé' };
const typeLabels: Record<string, string> = { text: 'Texte', image: 'Image', pdf: 'PDF', link: 'Lien', circular: 'Circulaire' };

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) return error.response?.data?.error || fallback;
  return fallback;
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('text');
  const [priority, setPriority] = useState('normal');
  const [saving, setSaving] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const loadDrafts = useCallback(async () => {
    setLoading(true); setError(null);
    try { setDrafts(await messageService.getDrafts()); }
    catch (e) { setError(errorMessage(e, 'Impossible de charger les brouillons.')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadDrafts(); }, [loadDrafts]);

  const openEdit = async (draft: Message) => {
    setSaving(true); setError(null);
    try {
      const detail = await messageService.getDraft(draft.id);
      setEditing(detail); setTitle(detail.title || ''); setContent(detail.content); setType(detail.type); setPriority(detail.priority);
    } catch (e) { toast.error(errorMessage(e, 'Impossible de charger le brouillon.')); }
    finally { setSaving(false); }
  };

  const saveChanges = async () => {
    if (!editing || !content.trim()) { toast.error('Le contenu du message est requis.'); return; }
    setSaving(true);
    try { await messageService.updateDraft(editing.id, { title: title || undefined, content: content.trim(), type, priority }); toast.success('Brouillon modifié.'); setEditing(null); await loadDrafts(); }
    catch (e) { toast.error(errorMessage(e, 'Impossible de modifier le brouillon.')); }
    finally { setSaving(false); }
  };

  const send = async () => {
    if (!editing) return;
    setSaving(true);
    try { await messageService.updateDraft(editing.id, { title: title || undefined, content: content.trim(), type, priority }); await messageService.sendDraft(editing.id); toast.success('Brouillon envoyé avec succès.'); setEditing(null); await loadDrafts(); }
    catch (e) { toast.error(errorMessage(e, 'Impossible d’envoyer le brouillon.')); }
    finally { setSaving(false); }
  };

  const schedule = async () => {
    if (!editing || !scheduleDate || !scheduleTime) { toast.error("Choisissez la date et l'heure."); return; }
    const date = new Date(`${scheduleDate}T${scheduleTime}`);
    if (Number.isNaN(date.getTime()) || date <= new Date()) { toast.error('La date de programmation doit être dans le futur.'); return; }
    setSaving(true);
    try { await messageService.updateDraft(editing.id, { title: title || undefined, content: content.trim(), type, priority }); await messageService.scheduleDraft(editing.id, date.toISOString()); toast.success('Brouillon programmé avec succès.'); setScheduleOpen(false); setEditing(null); await loadDrafts(); }
    catch (e) { toast.error(errorMessage(e, 'Impossible de programmer le brouillon.')); }
    finally { setSaving(false); }
  };

  const remove = async (draft: Message) => {
    if (!window.confirm('Supprimer définitivement ce brouillon ?')) return;
    try { await messageService.deleteDraft(draft.id); toast.success('Brouillon supprimé.'); await loadDrafts(); }
    catch (e) { toast.error(errorMessage(e, 'Impossible de supprimer le brouillon.')); }
  };

  return <div className="space-y-4">
    <div className="flex flex-col gap-2 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-lg font-semibold tracking-tight text-slate-900">Brouillons</h1><p className="mt-0.5 text-xs text-muted">Modifiez un brouillon puis envoyez-le immédiatement ou programmez son envoi.</p></div>
      <Button variant="secondary" size="sm" onClick={() => void loadDrafts()} disabled={loading}><RefreshCw className="h-4 w-4" /> Actualiser</Button>
    </div>
    {error && <div role="alert" className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"><span>{error}</span><Button variant="secondary" size="sm" onClick={() => void loadDrafts()}>Réessayer</Button></div>}
    <Card className="!p-0 overflow-hidden">
      {loading ? <div className="py-12 text-center text-xs text-muted">Chargement des brouillons...</div> : drafts.length === 0 ? <div className="py-12 text-center text-xs text-muted">Aucun brouillon enregistré.</div> : <div className="divide-y divide-line">{drafts.map((draft) => <div key={draft.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-sm font-semibold text-slate-900">{draft.title || 'Sans titre'}</h2><Badge variant="default">Brouillon</Badge></div><p className="mt-1 line-clamp-2 text-xs text-slate-600">{draft.content}</p><p className="mt-2 text-[11px] text-muted">{draft.totalRecipients} destinataire(s) · {typeLabels[draft.type] || draft.type} · Modifié le {formatDateTime(draft.updatedAt || draft.createdAt)}</p></div>
        <div className="flex shrink-0 items-center gap-1.5"><Button variant="secondary" size="sm" onClick={() => void openEdit(draft)}><Edit3 className="h-4 w-4" /> Modifier</Button><Button variant="primary" size="sm" onClick={() => void (async () => { await openEdit(draft); })()}><Send className="h-4 w-4" /> Ouvrir</Button><button type="button" aria-label="Supprimer le brouillon" onClick={() => void remove(draft)} className="rounded-md p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div>
      </div>)}</div>}
    </Card>

    <Modal open={!!editing} onClose={() => !saving && setEditing(null)} title="Modifier le brouillon" size="lg">
      {editing && <div className="space-y-4">
        <div className="rounded-md border border-line bg-slate-50 px-3 py-2 text-xs text-slate-600">Les destinataires enregistrés ({editing.totalRecipients}) sont conservés pendant la modification.</div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre (optionnel)" className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none" />
        <div className="grid grid-cols-2 gap-3"><select value={type} onChange={(e) => setType(e.target.value)} className="rounded-md border border-line bg-white px-3 py-2 text-sm"><option value="text">Texte</option><option value="image">Image</option><option value="pdf">PDF</option><option value="link">Lien</option><option value="circular">Circulaire</option></select><select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-md border border-line bg-white px-3 py-2 text-sm"><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></select></div>
        <textarea rows={8} value={content} onChange={(e) => setContent(e.target.value)} className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none" />
        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-3"><Button variant="secondary" onClick={() => setEditing(null)} disabled={saving}>Fermer</Button><Button variant="secondary" onClick={() => void saveChanges()} disabled={saving}>Enregistrer</Button><Button variant="secondary" onClick={() => setScheduleOpen(true)} disabled={saving}><Clock className="h-4 w-4" /> Programmer</Button><Button variant="primary" onClick={() => void send()} disabled={saving}><Send className="h-4 w-4" /> Envoyer maintenant</Button></div>
      </div>}
    </Modal>

    <Modal open={scheduleOpen} onClose={() => !saving && setScheduleOpen(false)} title="Programmer le brouillon" size="sm">
      <div className="space-y-4"><p className="text-xs text-muted">Le brouillon sera transformé en message programmé et sera envoyé automatiquement à la date choisie.</p><div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-xs font-medium">Date</label><input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full rounded-md border border-line px-3 py-2 text-sm" /></div><div><label className="mb-1 block text-xs font-medium">Heure</label><input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-full rounded-md border border-line px-3 py-2 text-sm" /></div></div><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setScheduleOpen(false)} disabled={saving}>Annuler</Button><Button variant="primary" onClick={() => void schedule()} disabled={saving}><Clock className="h-4 w-4" /> Confirmer</Button></div></div>
    </Modal>
  </div>;
}
