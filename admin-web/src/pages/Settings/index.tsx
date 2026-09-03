import { useEffect, useState } from 'react';
import { Building2, Phone, Mail, MapPin, Save, Trash2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import FileUpload from '@/components/ui/FileUpload';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import apiClient from '@/services/api';

interface EstablishmentSettings { name: string; address: string; phone: string; email: string; }

export default function SettingsPage() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clearTarget, setClearTarget] = useState(false);

  const loadSettings = async () => {
    setLoading(true); setLoadError(null);
    try {
      const { data } = await apiClient.get<{ success: boolean; data: EstablishmentSettings }>('/settings');
      setName(data.data?.name ?? ''); setAddress(data.data?.address ?? ''); setPhone(data.data?.phone ?? ''); setEmail(data.data?.email ?? '');
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
      setLoadError('Impossible de charger les paramètres de l’établissement.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadSettings(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put('/settings', { name, address, phone, email });
      toast.success('Paramètres sauvegardés');
    } catch (error) {
      console.error('Erreur sauvegarde paramètres:', error);
      toast.error('Impossible de sauvegarder les paramètres');
    } finally { setSaving(false); }
  };

  const handleClearCache = async () => { localStorage.clear(); setClearTarget(false); toast.success('Cache effacé avec succès'); window.location.reload(); };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header className="border-b border-line pb-4"><p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Administration</p><h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Paramètres</h1><p className="mt-1 max-w-2xl text-sm text-muted">Gérez les informations persistées de votre établissement et les données locales de cette interface.</p></header>
      {loadError && <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"><span>{loadError}</span><Button variant="secondary" size="sm" onClick={() => void loadSettings()}>Réessayer</Button></div>}
      <Card title="Informations de l'établissement">
        {loading ? <div className="py-8 text-center text-sm text-muted">Chargement...</div> : <div className="space-y-4"><Input label="Nom de l'établissement" value={name} onChange={(e) => setName(e.target.value)} icon={<Building2 className="h-4 w-4" />} placeholder="Nom de l'établissement" /><Input label="Adresse" value={address} onChange={(e) => setAddress(e.target.value)} icon={<MapPin className="h-4 w-4" />} placeholder="Adresse" /><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><Input label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} icon={<Phone className="h-4 w-4" />} placeholder="Téléphone" /><Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail className="h-4 w-4" />} placeholder="E-mail" /></div></div>}
        <div className="mt-5 flex justify-end border-t border-line pt-4"><Button onClick={handleSave} loading={saving} disabled={loading || !!loadError}><Save className="h-4 w-4" /> Enregistrer</Button></div>
      </Card>
      <Card title="Import de données"><p className="mb-4 text-sm text-muted">Importez des données en masse à partir de fichiers Excel ou CSV.</p><div className="rounded-md border border-line bg-surface p-3"><FileUpload accept=".xlsx,.xls,.csv" onFileSelect={() => undefined} maxFiles={1} /></div></Card>
      <Card><div className="border-l-2 border-red-500 pl-3"><h3 className="text-sm font-semibold text-red-700">Zone de danger</h3><p className="mt-1 text-xs text-muted">Actions locales irréversibles. Vérifiez avant de continuer.</p></div><div className="mt-4 flex flex-col gap-3 rounded-md border border-red-100 bg-red-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-sm font-medium text-red-800">Effacer le cache local</p><p className="mt-1 text-xs leading-5 text-red-600">Supprime toutes les données stockées localement dans votre navigateur.</p></div><Button variant="danger" size="sm" onClick={() => setClearTarget(true)}><Trash2 className="h-4 w-4" /> Effacer</Button></div></Card>
      <ConfirmDialog open={clearTarget} title="Effacer le cache" message="Voulez-vous vraiment effacer le cache local ? Vous serez déconnecté." onConfirm={handleClearCache} onCancel={() => setClearTarget(false)} variant="danger" />
    </div>
  );
}
