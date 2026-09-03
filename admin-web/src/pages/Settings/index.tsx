import { useState } from 'react';
import { Building2, Phone, Mail, MapPin, Save, Trash2, Key } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import FileUpload from '@/components/ui/FileUpload';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import apiClient from '@/services/api';

export default function SettingsPage() {
  // Keep fields empty until the backend provides persisted establishment settings.
  // Do not display fictitious school identity/contact data in an admin tool.
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [firebaseKey, setFirebaseKey] = useState('');
  const [firebaseProjectId, setFirebaseProjectId] = useState('');
  const [saving, setSaving] = useState(false);
  const [clearTarget, setClearTarget] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = { name, address, phone, email, firebaseKey, firebaseProjectId };
      await apiClient.put('/settings', formData);
      toast.success('Paramètres sauvegardés');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de sauvegarder les paramètres');
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    localStorage.clear();
    setClearTarget(false);
    toast.success('Cache effacé avec succès');
    window.location.reload();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card title="Informations de l'établissement">
        <div className="space-y-4">
          <Input label="Nom de l'établissement" value={name} onChange={(e) => setName(e.target.value)} icon={<Building2 className="h-4 w-4" />} placeholder="Nom de l'établissement" />
          <Input label="Adresse" value={address} onChange={(e) => setAddress(e.target.value)} icon={<MapPin className="h-4 w-4" />} placeholder="Adresse" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} icon={<Phone className="h-4 w-4" />} placeholder="Téléphone" />
            <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail className="h-4 w-4" />} placeholder="E-mail" />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} loading={saving}><Save className="h-4 w-4" /> Enregistrer</Button>
        </div>
      </Card>

      <Card title="Configuration Firebase">
        <p className="mb-4 text-sm text-gray-500">Configurez les paramètres Firebase pour les notifications push.</p>
        <div className="space-y-4">
          <Input label="Clé API" value={firebaseKey} onChange={(e) => setFirebaseKey(e.target.value)} icon={<Key className="h-4 w-4" />} placeholder="Clé API Firebase" type="password" />
          <Input label="ID du projet" value={firebaseProjectId} onChange={(e) => setFirebaseProjectId(e.target.value)} placeholder="ID du projet Firebase" />
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} loading={saving}><Save className="h-4 w-4" /> Enregistrer</Button>
        </div>
      </Card>

      <Card title="Import de données">
        <p className="mb-4 text-sm text-gray-500">Importez des données en masse à partir de fichiers Excel.</p>
        <FileUpload accept=".xlsx,.xls,.csv" onFileSelect={() => undefined} maxFiles={1} />
      </Card>

      <Card>
        <div className="border-l-4 border-red-500">
          <h3 className="text-lg font-semibold text-red-700">Zone de danger</h3>
          <p className="mt-1 text-sm text-gray-500">Actions irréversibles. Soyez prudent.</p>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-lg bg-red-50 p-4">
          <div>
            <p className="text-sm font-medium text-red-700">Effacer le cache local</p>
            <p className="text-xs text-red-500">Supprime toutes les données stockées localement dans votre navigateur</p>
          </div>
          <Button variant="danger" size="sm" onClick={() => setClearTarget(true)}><Trash2 className="h-4 w-4" /> Effacer</Button>
        </div>
      </Card>

      <ConfirmDialog
        open={clearTarget}
        title="Effacer le cache"
        message="Voulez-vous vraiment effacer le cache local ? Vous serez déconnecté."
        onConfirm={handleClearCache}
        onCancel={() => setClearTarget(false)}
        variant="danger"
      />
    </div>
  );
}
