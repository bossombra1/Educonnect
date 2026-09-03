import { useEffect, useState } from 'react';
import { Building2, Phone, Mail, MapPin, Save, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import apiClient from '@/services/api';

interface EstablishmentSettings { id?: string | number; name: string; address: string; phone: string; email: string; logo_url: string | null; }

function assetUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^https?:\\/\\//i.test(value)) return value;
  return value.startsWith('/') ? value : `/${value}`;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clearTarget, setClearTarget] = useState(false);

  const loadSettings = async () => {
    setLoading(true); setLoadError(null);
    try {
      const { data } = await apiClient.get<{ success: boolean; data: EstablishmentSettings }>('/settings');
      const value = data.data;
      setSettings(value); setName(value?.name ?? ''); setAddress(value?.address ?? ''); setPhone(value?.phone ?? ''); setEmail(value?.email ?? ''); setLogoUrl(value?.logo_url ?? null);
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
      setLoadError('Impossible de charger les paramètres de l’établissement.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadSettings(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await apiClient.put<{ success: boolean; data: EstablishmentSettings }>('/settings', { name, address, phone, email });
      setSettings(data.data); setLogoUrl(data.data?.logo_url ?? null);
      toast.success('Paramètres sauvegardés');
    } catch (error) {
      console.error('Erreur sauvegarde paramètres:', error);
      toast.error('Impossible de sauvegarder les paramètres');
    } finally { setSaving(false); }
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiClient.post<{ success: boolean; data: EstablishmentSettings }>('/settings/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSettings(data.data); setLogoUrl(data.data?.logo_url ?? null);
      toast.success('Logo de l’établissement enregistré');
    } catch (error) {
      console.error('Erreur upload logo:', error);
      toast.error('Impossible d’enregistrer le logo');
    } finally { setUploadingLogo(false); }
  };

  const handleRemoveLogo = async () => {
    setRemovingLogo(true);
    try {
      const { data } = await apiClient.delete<{ success: boolean; data: EstablishmentSettings }>('/settings/logo');
      setSettings(data.data); setLogoUrl(null);
      toast.success('Logo supprimé');
    } catch (error) {
      console.error('Erreur suppression logo:', error);
      toast.error('Impossible de supprimer le logo');
    } finally { setRemovingLogo(false); }
  };

  const handleClearCache = async () => { localStorage.clear(); setClearTarget(false); toast.success('Cache effacé avec succès'); window.location.reload(); };
  const previewLogo = assetUrl(logoUrl);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header className="border-b border-line pb-4"><p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Administration</p><h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Paramètres</h1><p className="mt-1 max-w-2xl text-sm text-muted">Gérez l’identité et les informations persistées de votre établissement.</p></header>
      {loadError && <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"><span>{loadError}</span><Button variant="secondary" size="sm" onClick={() => void loadSettings()}>Réessayer</Button></div>}
      <Card title="Identité de l’établissement">
        {loading ? <div className="py-8 text-center text-sm text-muted">Chargement...</div> : <div className="space-y-5">
          <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-white">
              {previewLogo ? <img src={previewLogo} alt={`Logo de ${name || 'l’établissement'}`} className="h-full w-full object-contain" /> : <ImageIcon className="h-8 w-8 text-slate-300" />}
            </div>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">Logo de l’établissement</p><p className="mt-1 text-xs leading-5 text-muted">Ce logo sera utilisé dans la barre latérale, la barre supérieure et les fiches individuelles des élèves.</p><div className="mt-3 flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white hover:opacity-90"><Upload className="h-4 w-4" />{uploadingLogo ? 'Téléversement...' : 'Choisir un logo'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={uploadingLogo} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void handleLogoUpload(file); }} /></label>{previewLogo && <Button variant="secondary" size="sm" onClick={() => void handleRemoveLogo()} loading={removingLogo}><Trash2 className="h-4 w-4" /> Supprimer</Button>}</div></div>
          </div>
          <Input label="Nom de l'établissement" value={name} onChange={(e) => setName(e.target.value)} icon={<Building2 className="h-4 w-4" />} placeholder="Nom de l'établissement" />
          <Input label="Adresse" value={address} onChange={(e) => setAddress(e.target.value)} icon={<MapPin className="h-4 w-4" />} placeholder="Adresse" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><Input label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} icon={<Phone className="h-4 w-4" />} placeholder="Téléphone" /><Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail className="h-4 w-4" />} placeholder="E-mail" /></div>
        </div>}
        <div className="mt-5 flex justify-end border-t border-line pt-4"><Button onClick={handleSave} loading={saving} disabled={loading || !!loadError}><Save className="h-4 w-4" /> Enregistrer</Button></div>
      </Card>
      <Card title="Zone de danger"><div className="border-l-2 border-red-500 pl-3"><h3 className="text-sm font-semibold text-red-700">Cache local</h3><p className="mt-1 text-xs text-muted">Supprime toutes les données stockées localement dans votre navigateur.</p></div><div className="mt-4 flex flex-col gap-3 rounded-md border border-red-100 bg-red-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-sm font-medium text-red-800">Effacer le cache local</p><p className="mt-1 text-xs leading-5 text-red-600">Vous serez déconnecté après cette action.</p></div><Button variant="danger" size="sm" onClick={() => setClearTarget(true)}><Trash2 className="h-4 w-4" /> Effacer</Button></div></Card>
      <ConfirmDialog open={clearTarget} title="Effacer le cache" message="Voulez-vous vraiment effacer le cache local ? Vous serez déconnecté." onConfirm={handleClearCache} onCancel={() => setClearTarget(false)} variant="danger" />
    </div>
  );
}
