import { useEffect, useState } from 'react';
import { Bell, LogOut, MessageCircle, RefreshCw, Settings2 } from 'lucide-react';
import Login from './components/Login';
import MessageDetail from './components/MessageDetail';
import MessageList, { categoryOf } from './components/MessageList';
import NotificationList from './components/NotificationList';
import AccountSettings from './components/AccountSettings';
import { useAuth } from './hooks/useAuth';
import { ApiError, messagesApi, notificationsApi } from './services/api';
import type { Message, MessageCategory, Notification, User } from './types';

type View = 'inbox' | 'notifications' | 'account';

export default function App() {
  const { user, loading: authLoading, isAuthenticated, signIn, signOut } = useAuth();
  const [view, setView] = useState<View>('inbox');
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<Message | null>(null);
  const [category, setCategory] = useState<MessageCategory | 'Tous'>('Tous');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notificationsError, setNotificationsError] = useState('');

  async function loadMessages() {
    setLoading(true); setError('');
    try { const result = await messagesApi.list(); setMessages(result); if (!selected && result[0]) setSelected(result[0]); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Impossible de charger vos messages.'); }
    finally { setLoading(false); }
  }

  async function loadNotifications() {
    setNotificationsLoading(true); setNotificationsError('');
    try { setNotifications(await notificationsApi.list()); }
    catch (cause) { setNotificationsError(cause instanceof ApiError ? cause.message : 'Impossible de charger vos notifications.'); }
    finally { setNotificationsLoading(false); }
  }

  useEffect(() => { if (isAuthenticated) { void loadMessages(); void loadNotifications(); } }, [isAuthenticated]);
  useEffect(() => { if (!selected || selected.is_read) return; messagesApi.markRead(selected.id).then(() => { setSelected((current) => current ? { ...current, is_read: true } : current); setMessages((current) => current.map((item) => item.id === selected.id ? { ...item, is_read: true } : item)); }).catch(() => undefined); }, [selected]);

  if (authLoading) return <div className="grid min-h-[100dvh] place-items-center bg-paper text-moss"><RefreshCw className="animate-spin" size={22} /></div>;
  if (!isAuthenticated || !user) return <Login onAuthenticated={signIn} />;

  const unread = messages.filter((message) => !message.is_read).length;
  const notificationCount = notifications.length;
  const firstName = user.first_name || 'Utilisateur';
  const updateUser = (updated: User) => { localStorage.setItem('educonnect_client_user', JSON.stringify(updated)); window.location.reload(); };

  return <main className="min-h-[100dvh] bg-paper text-ink"><header className="border-b border-line bg-paper/90"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-moss text-paper"><MessageCircle size={20} /></span><div><p className="font-semibold tracking-[-0.02em]">EduConnect</p><p className="text-xs text-ink/45">Espace établissement</p></div></div><div className="flex items-center gap-3"><span className="hidden text-sm text-ink/60 sm:block">Bonjour, <strong className="text-ink">{firstName}</strong></span><button title="Se déconnecter" aria-label="Se déconnecter" onClick={signOut} className="icon-button"><LogOut size={18} /></button></div></div></header><div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:py-10"><nav className="mb-9 flex gap-2 overflow-x-auto border-b border-line pb-3" aria-label="Espace personnel"><button onClick={() => setView('inbox')} className={`category-tab ${view === 'inbox' ? 'category-tab-active' : ''}`}><MessageCircle size={16} />Réception{unread > 0 && <span className="rounded-full bg-coral px-1.5 py-0.5 text-[10px] text-white">{unread}</span>}</button><button onClick={() => setView('notifications')} className={`category-tab ${view === 'notifications' ? 'category-tab-active' : ''}`}><Bell size={16} />Notifications{notificationCount > 0 && <span className="rounded-full bg-moss px-1.5 py-0.5 text-[10px] text-paper">{notificationCount}</span>}</button><button onClick={() => setView('account')} className={`category-tab ${view === 'account' ? 'category-tab-active' : ''}`}><Settings2 size={16} />Mon compte</button></nav>{view === 'inbox' && <><div className="mb-8 flex items-end justify-between gap-4"><div><p className="eyebrow">Votre établissement</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Boîte de réception</h1><p className="mt-2 text-sm text-ink/55">{unread ? `${unread} message${unread > 1 ? 's' : ''} non lu${unread > 1 ? 's' : ''}` : 'Tout est à jour'}</p></div><button onClick={() => void loadMessages()} className="button-quiet" disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualiser</button></div>{error && <div className="notice-error mb-5">{error}</div>}<div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"><MessageList messages={messages} selectedId={selected?.id} category={category} onCategory={setCategory} onSelect={setSelected} /><MessageDetail message={selected} onRead={(id) => setMessages((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item))} onAcknowledged={(id) => { setSelected((current) => current ? { ...current, is_acknowledged: true } : current); setMessages((current) => current.map((item) => item.id === id ? { ...item, is_acknowledged: true } : item)); }} /></div></>}{view === 'notifications' && <NotificationList notifications={notifications} loading={notificationsLoading} error={notificationsError} onRefresh={() => void loadNotifications()} />}{view === 'account' && <AccountSettings user={user} onUpdated={updateUser} />}</div><footer className="mx-auto flex max-w-7xl items-center gap-2 px-5 pb-8 text-xs text-ink/40 sm:px-8"><Bell size={14} /> Compte {user.role === 'PARENT' ? 'parent' : user.role === 'STUDENT' ? 'élève' : 'personnel'} sécurisé</footer></main>;
}
