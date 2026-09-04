import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Clock, Save, Users, BookOpen, UserCheck, User, AlertCircle, RefreshCw } from 'lucide-react';
import { messageService } from '@/services/message.service';
import { groupService } from '@/services/group.service';
import { classService } from '@/services/class.service';
import { userService } from '@/services/user.service';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import FileUpload from '@/components/ui/FileUpload';
import Modal from '@/components/ui/Modal';
import { cn } from '@/utils/cn';
import type { Group, Class, User as TUser, MessageType, MessagePriority, UserRole } from '@/types';
import toast from 'react-hot-toast';

const typeOptions: { value: MessageType; label: string }[] = [
  { value: 'text', label: 'Texte' }, { value: 'image', label: 'Image' }, { value: 'pdf', label: 'PDF' }, { value: 'link', label: 'Lien' },
];
const priorityOptions: { value: MessagePriority; label: string }[] = [
  { value: 'normal', label: 'Normal' }, { value: 'important', label: 'Important' }, { value: 'urgent', label: 'Urgent' },
];
type RecipientTab = 'groups' | 'classes' | 'roles' | 'individuals';
type ApiErrorLike = { response?: { data?: { error?: string; message?: string } } };
function getApiErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as ApiErrorLike;
  return apiError.response?.data?.error || apiError.response?.data?.message || fallback;
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState(''); const [content, setContent] = useState('');
  const [msgType, setMsgType] = useState<MessageType>('text'); const [priority, setPriority] = useState<MessagePriority>('normal');
  const [activeTab, setActiveTab] = useState<RecipientTab>('groups');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]); const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]); const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]); const [scheduleModal, setScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(''); const [scheduleTime, setScheduleTime] = useState('');
  const [sending, setSending] = useState(false); const [scheduling, setScheduling] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [groups, setGroups] = useState<Group[]>([]); const [classes, setClasses] = useState<Class[]>([]); const [users, setUsers] = useState<TUser[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recipientPreviewCount, setRecipientPreviewCount] = useState(0);
  const [recipientPreviewLoading, setRecipientPreviewLoading] = useState(false);
  const [recipientPreviewError, setRecipientPreviewError] = useState<string | null>(null);

  const loadRecipients = async () => {
    setLoadError(null);
    const results = await Promise.allSettled([groupService.getGroups(), classService.getClasses(), userService.getUsers({ limit: 200 })]);
    const failures: string[] = [];
    if (results[0].status === 'fulfilled') setGroups(results[0].value); else failures.push('groupes');
    if (results[1].status === 'fulfilled') setClasses(results[1].value); else failures.push('classes');
    if (results[2].status === 'fulfilled') setUsers(results[2].value.data); else failures.push('utilisateurs');
    if (failures.length) setLoadError(`Impossible de charger ${failures.join(', ')}. Vérifiez la connexion puis réessayez.`);
  };

  useEffect(() => { void loadRecipients(); }, []);

  const selectedTargetCount = selectedGroupIds.length + selectedClassIds.length + selectedRoles.length + selectedUserIds.length;
  const previewPayload = () => ({ groupIds: selectedGroupIds, classIds: selectedClassIds, roleIds: selectedRoles, recipientIds: selectedUserIds });

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (selectedTargetCount === 0) {
        setRecipientPreviewCount(0);
        setRecipientPreviewError(null);
        setRecipientPreviewLoading(false);
        return;
      }
      setRecipientPreviewLoading(true);
      setRecipientPreviewError(null);
      try {
        const result = await messageService.previewRecipients(previewPayload());
        if (!cancelled) setRecipientPreviewCount(result.recipientCount);
      } catch (error) {
        if (!cancelled) {
          setRecipientPreviewCount(0);
          setRecipientPreviewError(getApiErrorMessage(error, 'Impossible de calculer les destinataires réels.'));
        }
      } finally {
        if (!cancelled) setRecipientPreviewLoading(false);
      }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [selectedGroupIds, selectedClassIds, selectedRoles, selectedUserIds, selectedTargetCount]);

  const refreshRecipientPreview = async () => {
    if (selectedTargetCount === 0) return;
    setRecipientPreviewLoading(true); setRecipientPreviewError(null);
    try {
      const result = await messageService.previewRecipients(previewPayload());
      setRecipientPreviewCount(result.recipientCount);
    } catch (error) {
      setRecipientPreviewCount(0);
      setRecipientPreviewError(getApiErrorMessage(error, 'Impossible de calculer les destinataires réels.'));
    } finally { setRecipientPreviewLoading(false); }
  };

  const toggleGroup = (id: string) => setSelectedGroupIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleClass = (id: string) => setSelectedClassIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleRole = (role: UserRole) => setSelectedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  const toggleUser = (id: string) => setSelectedUserIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const [userSearch, setUserSearch] = useState('');
  const normalizedSearch = userSearch.trim().toLowerCase();
  const filteredUsers = users.filter(u => {
    if (!normalizedSearch) return true;
    return [u.firstName, u.lastName, u.email, u.phone, u.matricule, u.role].filter(Boolean).some(value => String(value).toLowerCase().includes(normalizedSearch));
  });

  const buildFormData = (): FormData => {
    const fd = new FormData(); fd.append('content', content); fd.append('type', msgType); fd.append('priority', priority);
    if (title) fd.append('title', title); selectedGroupIds.forEach(id => fd.append('groupIds', id)); selectedClassIds.forEach(id => fd.append('classIds', id));
    selectedRoles.forEach(r => fd.append('roleIds', r)); selectedUserIds.forEach(id => fd.append('recipientIds', id)); attachments.forEach(f => fd.append('attachments', f));
    return fd;
  };
  const validate = (): boolean => { const errs: Record<string, string> = {}; if (!content.trim()) errs.content = 'Le contenu du message est requis'; if (selectedTargetCount === 0) errs.recipients = 'Sélectionnez au moins un destinataire'; setErrors(errs); return Object.keys(errs).length === 0; };

  const handleSend = async () => { if (!validate()) return; setSending(true); try { await messageService.sendMessage(buildFormData()); toast.success('Message envoyé avec succès'); navigate('/historique'); } catch (error) { console.error('Erreur envoi message:', error); toast.error(getApiErrorMessage(error, 'Impossible d’envoyer le message. Réessayez.')); } finally { setSending(false); } };
  const handleSchedule = async () => { if (!validate()) return; if (!scheduleDate || !scheduleTime) { toast.error("Veuillez spécifier la date et l'heure"); return; } setScheduling(true); try { const fd = buildFormData(); fd.append('scheduledAt', new Date(`${scheduleDate}T${scheduleTime}`).toISOString()); await messageService.scheduleMessage(fd); toast.success('Message programmé'); navigate('/programmes'); } catch (error) { console.error('Erreur programmation message:', error); toast.error(getApiErrorMessage(error, 'Impossible de programmer le message. Réessayez.')); } finally { setScheduling(false); } };
  const handleDraft = async () => { if (!content.trim()) { toast.error('Le contenu est requis pour un brouillon'); return; } try { const fd = buildFormData(); fd.append('status', 'draft'); await messageService.sendMessage(fd); toast.success('Brouillon enregistré'); navigate('/historique'); } catch (error) { console.error('Erreur enregistrement brouillon:', error); toast.error(getApiErrorMessage(error, 'Impossible d’enregistrer le brouillon. Réessayez.')); } };

  const roleOptions = [
    { value: 'STUDENT' as UserRole, label: 'Élèves' }, { value: 'PARENT' as UserRole, label: 'Parents' }, { value: 'TEACHER' as UserRole, label: 'Enseignants' }, { value: 'STAFF' as UserRole, label: 'Personnel' },
  ];
  const tabs: { key: RecipientTab; label: string; icon: React.ReactNode }[] = [
    { key: 'groups', label: 'Groupes', icon: <Users className="h-4 w-4" /> }, { key: 'classes', label: 'Classes', icon: <BookOpen className="h-4 w-4" /> }, { key: 'roles', label: 'Rôles', icon: <UserCheck className="h-4 w-4" /> }, { key: 'individuals', label: 'Individuels', icon: <User className="h-4 w-4" /> },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {loadError && <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><span>{loadError}</span><Button variant="secondary" onClick={() => void loadRecipients()}>Réessayer</Button></div>}
      <Card>
        <div className="space-y-4">
          <div className="flex flex-col gap-1 border-b border-line pb-3"><h1 className="text-lg font-semibold tracking-tight text-slate-900">Nouveau message</h1><p className="text-xs text-muted">Rédigez un message et choisissez précisément ses destinataires.</p></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Input label="Titre (optionnel)" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Réunion parents-professeurs" /><div className="grid grid-cols-2 gap-3"><Select label="Type" options={typeOptions} value={msgType} onChange={(e) => setMsgType(e.target.value as MessageType)} /><Select label="Priorité" options={priorityOptions} value={priority} onChange={(e) => setPriority(e.target.value as MessagePriority)} /></div></div>
          <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Contenu du message *</label><textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="Saisissez votre message ici..." className={cn('w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20', errors.content && 'border-red-500 focus:border-red-500 focus:ring-red-500/20')} />{errors.content && <p className="mt-1 text-xs text-red-600">{errors.content}</p>}</div>
          <FileUpload accept="image/*,.pdf" onFileSelect={setAttachments} label="Pièces jointes" />
          <div><div className="mb-2 flex items-center justify-between gap-3"><div><label className="text-sm font-medium text-slate-700">Destinataires *</label><p className="mt-0.5 text-xs text-muted">Le compteur est calculé sur les utilisateurs réels, avec déduplication automatique.</p></div>{selectedTargetCount > 0 && <div className="flex items-center gap-2"><span className={cn('rounded-md px-2.5 py-1 text-xs font-semibold', recipientPreviewError ? 'bg-red-50 text-red-700' : 'bg-primary-50 text-primary-700')}>{recipientPreviewLoading ? 'Calcul…' : `${recipientPreviewCount} destinataire(s) réel(s)`}</span><button type="button" onClick={() => void refreshRecipientPreview()} disabled={recipientPreviewLoading} title="Actualiser le nombre réel" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><RefreshCw className={cn('h-4 w-4', recipientPreviewLoading && 'animate-spin')} /></button></div>}</div>{recipientPreviewError && <div role="alert" className="mb-2 flex items-center gap-1.5 text-xs text-red-600"><AlertCircle className="h-4 w-4" /> {recipientPreviewError}</div>}{errors.recipients && <div className="mb-2 flex items-center gap-1.5 text-xs text-red-600"><AlertCircle className="h-4 w-4" /> {errors.recipients}</div>}
            <div className="mb-2 grid grid-cols-2 gap-1 rounded-md border border-line bg-slate-50 p-1 sm:grid-cols-4">{tabs.map(tab => <button type="button" key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn('flex items-center justify-center gap-1.5 rounded px-2 py-2 text-xs font-semibold transition-colors', activeTab === tab.key ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:bg-white/70 hover:text-slate-700')}>{tab.icon} <span>{tab.label}</span></button>)}</div>
            <div className="max-h-56 overflow-y-auto rounded-md border border-line bg-white">
              {activeTab === 'groups' && groups.length === 0 && <div className="p-4 text-center text-xs text-slate-500">Aucun groupe disponible. Créez-en depuis la page Groupes.</div>}
              {activeTab === 'groups' && groups.map(g => <label key={g.id} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2.5 hover:bg-slate-50 last:border-0"><input type="checkbox" checked={selectedGroupIds.includes(g.id)} onChange={() => toggleGroup(g.id)} className="rounded border-slate-300 text-primary focus:ring-primary" /><div className="flex-1"><p className="text-sm font-medium text-slate-900">{g.name}</p><p className="text-xs text-muted">{g.memberCount} membre(s)</p></div></label>)}
              {activeTab === 'classes' && classes.length === 0 && <div className="p-4 text-center text-xs text-slate-500">Aucune classe disponible.</div>}
              {activeTab === 'classes' && classes.map(c => <label key={c.id} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2.5 hover:bg-slate-50 last:border-0"><input type="checkbox" checked={selectedClassIds.includes(c.id)} onChange={() => toggleClass(c.id)} className="rounded border-slate-300 text-primary focus:ring-primary" /><div className="flex-1"><p className="text-sm font-medium text-slate-900">{c.name}</p><p className="text-xs text-muted">{c.level} - {c.studentCount ?? 0} élèves</p></div></label>)}
              {activeTab === 'roles' && roleOptions.map(r => <label key={r.value} className="flex items-center gap-3 border-b border-slate-100 px-3 py-2.5"><input type="checkbox" checked={selectedRoles.includes(r.value)} onChange={() => toggleRole(r.value)} className="rounded border-slate-300 text-primary focus:ring-primary" /><span className="text-sm font-medium text-slate-900">{r.label}</span></label>)}
              {activeTab === 'individuals' && <><div className="border-b border-line bg-slate-50 p-2.5"><input type="search" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Nom, e-mail, téléphone ou matricule..." className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>{filteredUsers.length === 0 && <div className="p-4 text-center text-xs text-slate-500">Aucun utilisateur trouvé.</div>}{filteredUsers.slice(0, 20).map(u => <label key={u.id} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2.5 hover:bg-slate-50 last:border-0"><input type="checkbox" checked={selectedUserIds.includes(u.id)} onChange={() => toggleUser(u.id)} className="rounded border-slate-300 text-primary focus:ring-primary" /><div className="flex-1"><p className="text-sm font-medium text-slate-900">{u.firstName} {u.lastName}</p><p className="text-xs text-muted">{u.email || '—'}</p></div><span className="text-xs text-muted">{u.role}</span></label>)}</>}
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-line pt-3 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={handleDraft}><Save className="h-4 w-4" /> Brouillon</Button><Button variant="secondary" onClick={() => setScheduleModal(true)} className="!bg-slate-700 !text-white hover:!bg-slate-800"><Clock className="h-4 w-4" /> Programmer</Button><Button onClick={handleSend} loading={sending}><Send className="h-4 w-4" /> Envoyer maintenant</Button></div>
        </div>
      </Card>
      <Modal open={scheduleModal} onClose={() => setScheduleModal(false)} title="Programmer l'envoi" size="sm">
        <div className="space-y-3">
          <Input label="Date" type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
          <Input label="Heure" type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setScheduleModal(false)}>Annuler</Button>
            <Button onClick={handleSchedule} loading={scheduling} className="!bg-slate-700 !text-white hover:!bg-slate-800"><Clock className="h-4 w-4" /> Programmer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
