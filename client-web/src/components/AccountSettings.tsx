import { FormEvent, useState } from 'react';
import { Check, KeyRound, Mail, Phone, ShieldCheck } from 'lucide-react';
import { ApiError, authApi } from '../services/api';
import type { User } from '../types';

interface AccountSettingsProps { user: User; onUpdated: (user: User) => void; }

export default function AccountSettings({ user, onUpdated }: AccountSettingsProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [contact, setContact] = useState(user.role === 'PARENT' ? user.phone || '' : user.email || '');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const isParent = user.role === 'PARENT';

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setFeedback('');
    try {
      const payload = { currentPassword, ...(newPassword ? { password: newPassword } : {}), ...(isParent ? { phone: contact } : { email: contact }) };
      const updated = await authApi.updateProfile(payload); onUpdated(updated); setCurrentPassword(''); setNewPassword(''); setFeedback('Vos informations ont été mises à jour.');
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Impossible de mettre à jour le compte.'); }
    finally { setBusy(false); }
  }

  return <section className="mx-auto max-w-3xl"><div className="mb-7"><p className="eyebrow">Compte sécurisé</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Mon compte</h1><p className="mt-2 text-sm text-ink/55">Gérez le moyen de contact et le mot de passe utilisés pour EduConnect.</p></div><div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]"><div className="rounded-2xl border border-line bg-ink p-6 text-paper"><ShieldCheck size={25} className="mb-8 text-mint" /><p className="text-lg font-semibold">{user.first_name} {user.last_name}</p><p className="mt-1 text-sm text-paper/60">{isParent ? 'Parent' : user.role === 'STUDENT' ? 'Élève' : 'Personnel'}</p><div className="mt-8 border-t border-paper/15 pt-4 text-sm text-paper/65"><p>Identifiant</p><strong className="mt-1 block text-paper">{user.matricule || user.email || '—'}</strong></div></div><form onSubmit={submit} className="rounded-2xl border border-line bg-white p-6 shadow-soft sm:p-8"><label className="block text-sm font-medium">{isParent ? <><Phone size={15} className="mr-2 inline text-moss" />Numéro de téléphone</> : <><Mail size={15} className="mr-2 inline text-moss" />Adresse email</>}<input required value={contact} onChange={(event) => setContact(event.target.value)} className="field mt-2" /></label><label className="mt-5 block text-sm font-medium"><KeyRound size={15} className="mr-2 inline text-moss" />Nouveau mot de passe<input type="password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Laisser vide pour conserver l&apos;actuel" className="field mt-2" /></label><label className="mt-5 block text-sm font-medium">Mot de passe actuel<input required type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="field mt-2" /></label>{error && <p className="notice-error mt-5">{error}</p>}{feedback && <p className="mt-5 flex items-center gap-2 rounded-xl bg-mint px-4 py-3 text-sm text-moss"><Check size={16} />{feedback}</p>}<button disabled={busy} className="button-primary mt-6 w-full">{busy ? 'Enregistrement...' : 'Enregistrer les modifications'}</button></form></div></section>;
}