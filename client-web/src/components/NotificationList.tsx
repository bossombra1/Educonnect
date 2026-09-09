import { Bell, CheckCircle2, Clock3, FileText, RefreshCw, Send, XCircle } from 'lucide-react';
import type { Notification } from '../types';

interface NotificationListProps { notifications: Notification[]; loading: boolean; error: string; onRefresh: () => void; }

const statusLabels: Record<Notification['fcm_status'], string> = { pending: 'En attente', sent: 'Envoyée', delivered: 'Délivrée', failed: 'Échec' };
const statusIcons = { pending: Clock3, sent: Send, delivered: CheckCircle2, failed: XCircle };

function formatDate(value: string) { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }

export default function NotificationList({ notifications, loading, error, onRefresh }: NotificationListProps) {
  return <section className="mx-auto max-w-4xl">
    <div className="mb-7 flex items-end justify-between gap-4"><div><p className="eyebrow">Alertes de l&apos;établissement</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Notifications</h1><p className="mt-2 text-sm text-ink/55">Les informations ciblées envoyées par votre établissement.</p></div><button onClick={onRefresh} disabled={loading} className="button-quiet"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualiser</button></div>
    {error && <div className="notice-error mb-5">{error}</div>}
    {loading ? <div className="grid min-h-56 place-items-center rounded-2xl border border-line bg-white text-moss"><RefreshCw className="animate-spin" size={22} /></div> : notifications.length === 0 ? <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-line bg-white/50 px-6 text-center text-ink/45"><Bell size={28} className="mb-3 text-moss/60" /><p>Aucune notification pour le moment.</p></div> : <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">{notifications.map((notification) => { const Icon = statusIcons[notification.fcm_status] || Bell; return <article key={notification.id} className="flex gap-4 px-5 py-5 sm:px-6"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-moss"><Icon size={18} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-ink">{notification.title}</h2><span className="text-xs text-ink/40">{formatDate(notification.created_at)}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/65">{notification.body || 'Notification sans contenu.'}</p><div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink/40"><span>{statusLabels[notification.fcm_status]}</span>{notification.message_id && <span className="inline-flex items-center gap-1"><FileText size={13} /> Message associé</span>}</div></div></article>; })}</div>}
  </section>;
}