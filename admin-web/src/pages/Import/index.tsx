import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, RotateCcw, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import apiClient from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Table, { type Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Pagination from '@/components/ui/Pagination';
import { formatDateTime } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

interface UploadResult {
  import_id: number;
  filename: string;
  total_rows: number;
  columns: string[];
  preview: Record<string, string>[];
}

interface ImportRecord {
  id: number;
  filename: string;
  total_rows: number;
  imported: number;
  failed: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errors: { row: number; message: string }[];
  created_at: string;
  completed_at?: string;
}

interface ImportHistoryResponse {
  data: ImportRecord[];
  total: number;
  page: number;
  totalPages: number;
}

const DATABASE_FIELDS = [
  { value: 'matricule', label: 'Matricule' },
  { value: 'first_name', label: 'Prénom' },
  { value: 'last_name', label: 'Nom' },
  { value: 'phone', label: 'Téléphone' },
  { value: 'email', label: 'E-mail' },
  { value: 'role', label: 'Rôle' },
  { value: 'class', label: 'Classe' },
  { value: 'level', label: 'Niveau' },
];

const EMPTY_MAPPING: Record<string, string> = {
  matricule: '',
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  role: '',
  class: '',
  level: '',
};

type Step = 'upload' | 'mapping' | 'importing' | 'result';

export default function ImportPage() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({ ...EMPTY_MAPPING });
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number; errors: { row: number; message: string }[] } | null>(null);
  const [importHistory, setImportHistory] = useState<ImportRecord[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedErrors, setExpandedErrors] = useState<number | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHistory = useCallback(async (page: number) => {
    setHistoryLoading(true);
    try {
      const { data } = await apiClient.get<ImportHistoryResponse>('/imports/history', {
        params: { page, limit: 10 },
      });
      setImportHistory(data.data);
      setHistoryTotalPages(data.totalPages);
    } catch {
      setImportHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(historyPage);
  }, [historyPage, fetchHistory]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      const selected = files[0];
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ];
      if (!validTypes.includes(selected.type) && !selected.name.match(/\.(xlsx|xls|csv)$/i)) {
        toast.error('Veuillez sélectionner un fichier Excel (.xlsx, .xls) ou CSV');
        return;
      }
      setFile(selected);
      setUploadResult(null);
      setColumnMapping({ ...EMPTY_MAPPING });
      setImportResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiClient.post<{ success: boolean; data: UploadResult }>('/imports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadResult(data.data);

      // Auto-map columns by matching names
      const mapping = { ...EMPTY_MAPPING };
      if (data.data.columns) {
        const colLower = data.data.columns.map((c: string) => c.toLowerCase().trim());
        const fieldAliases: Record<string, string[]> = {
          matricule: ['matricule', 'mat', 'id', 'numéro', 'numero', 'n°'],
          first_name: ['prénom', 'prenom', 'first_name', 'firstname', 'prenom', 'given name'],
          last_name: ['nom', 'last_name', 'lastname', 'nom de famille', 'family name'],
          phone: ['téléphone', 'telephone', 'phone', 'tel', 'mobile', 'portable'],
          email: ['email', 'e-mail', 'courriel', 'mail'],
          role: ['rôle', 'role', 'statut'],
          class: ['classe', 'class', 'groupe', 'section'],
          level: ['niveau', 'level', 'année', 'annee', 'grade'],
        };
        for (const [field, aliases] of Object.entries(fieldAliases)) {
          const matchIdx = colLower.findIndex((c: string) => aliases.includes(c));
          if (matchIdx >= 0) {
            mapping[field] = data.data.columns[matchIdx];
          }
        }
      }
      setColumnMapping(mapping);
      setStep('mapping');
    } catch {
      toast.error('Erreur lors du téléchargement du fichier');
    } finally {
      setUploading(false);
    }
  };

  const isMappingValid = () => {
    return Object.values(columnMapping).some((v) => v !== '');
  };

  const handleStartImport = async () => {
    if (!uploadResult) return;
    const activeMapping: Record<string, string> = {};
    for (const [field, col] of Object.entries(columnMapping)) {
      if (col) activeMapping[field] = col;
    }
    if (Object.keys(activeMapping).length === 0) {
      toast.error('Veuillez mapper au moins une colonne');
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setStep('importing');

    try {
      await apiClient.post(`/imports/${uploadResult.import_id}/start`, { column_mapping: activeMapping });

      // Poll for progress
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
        try {
          const { data } = await apiClient.get<{ success: boolean; data: ImportRecord }>(
            `/imports/${uploadResult.import_id}/status`
          );
          const record = data.data;
          const total = record.total_rows || 1;
          const processed = record.imported + record.failed;
          setImportProgress((processed / total) * 100);

          if (record.status === 'completed' || record.status === 'failed') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setImporting(false);
            setImportResult({
              imported: record.imported,
              failed: record.failed,
              errors: record.errors || [],
            });
            setImportProgress(100);
            setStep('result');
            fetchHistory(1);
            setHistoryPage(1);
            if (record.failed === 0) {
              toast.success(`${record.imported} ligne(s) importée(s) avec succès`);
            } else {
              toast.success(`${record.imported} importée(s), ${record.failed} échouée(s)`);
            }
          }
        } catch {
          // Continue polling
        }
      }, 2000);
    } catch {
      toast.error('Erreur lors du démarrage de l\'import');
      setImporting(false);
      setStep('mapping');
    }
  };

  const handleReset = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setFile(null);
    setUploadResult(null);
    setColumnMapping({ ...EMPTY_MAPPING });
    setImportProgress(0);
    setImportResult(null);
    setImporting(false);
    setStep('upload');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    handleFileSelect(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Terminé</Badge>;
      case 'processing':
        return <Badge variant="info">En cours</Badge>;
      case 'failed':
        return <Badge variant="danger">Échoué</Badge>;
      default:
        return <Badge variant="warning">En attente</Badge>;
    }
  };

  const historyColumns: Column<ImportRecord>[] = [
    {
      key: 'filename',
      header: 'Fichier',
      render: (r) => (
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
          <span className="font-medium text-gray-900">{r.filename}</span>
        </div>
      ),
    },
    {
      key: 'total_rows',
      header: 'Lignes',
      render: (r) => <span className="text-gray-700">{r.total_rows}</span>,
    },
    {
      key: 'imported',
      header: 'Importées',
      render: (r) => (
        <span className={cn('font-medium', r.imported > 0 ? 'text-emerald-600' : 'text-gray-400')}>
          {r.imported}
        </span>
      ),
    },
    {
      key: 'failed',
      header: 'Échouées',
      render: (r) => (
        <span className={cn('font-medium', r.failed > 0 ? 'text-red-600' : 'text-gray-400')}>
          {r.failed}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (r) => getStatusBadge(r.status),
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (r) => <span className="text-sm text-gray-500">{formatDateTime(r.created_at)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {(['upload', 'mapping', 'importing', 'result'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                step === s
                  ? 'bg-primary text-white'
                  : i < ['upload', 'mapping', 'importing', 'result'].indexOf(step)
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-400'
              )}
            >
              {i < ['upload', 'mapping', 'importing', 'result'].indexOf(step) ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={cn(
                'text-sm font-medium',
                step === s ? 'text-gray-900' : 'text-gray-400'
              )}
            >
              {s === 'upload' && 'Fichier'}
              {s === 'mapping' && 'Mappage'}
              {s === 'importing' && 'Import'}
              {s === 'result' && 'Résultat'}
            </span>
            {i < 3 && <div className="h-px w-8 bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Upload Step */}
      {step === 'upload' && (
        <Card>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-12 transition-colors hover:border-primary/50 hover:bg-blue-50/30"
          >
            <div className="mb-4 rounded-full bg-blue-50 p-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <p className="text-base font-medium text-gray-700">
              Cliquez ou glissez votre fichier Excel ici
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Fichiers acceptés : .xlsx, .xls, .csv
            </p>
            {file && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">{file.name}</span>
                <span className="text-xs text-emerald-500">({(file.size / 1024).toFixed(1)} Ko)</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                if (e.target.files) handleFileSelect(Array.from(e.target.files));
              }}
              className="hidden"
            />
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={handleUpload} loading={uploading} disabled={!file}>
              <Upload className="h-4 w-4" /> Analyser le fichier
            </Button>
          </div>
        </Card>
      )}

      {/* Mapping Step */}
      {step === 'mapping' && uploadResult && (
        <div className="space-y-6">
          {/* Column Mapping Table */}
          <Card title="Mappage des colonnes">
            <p className="mb-4 text-sm text-gray-500">
              Associez les colonnes de votre fichier Excel aux champs de la base de données.
              Fichier : <span className="font-medium text-gray-700">{uploadResult.filename}</span> —{' '}
              <span className="font-medium text-gray-700">{uploadResult.total_rows} ligne(s)</span>
            </p>

            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Champ base de données
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Colonne Excel
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {DATABASE_FIELDS.map((field) => (
                    <tr key={field.value} className="border-b border-gray-50">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900">{field.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          options={
                            [
                              { value: '', label: '— Ne pas importer —' },
                              ...uploadResult.columns.map((col) => ({
                                value: col,
                                label: col,
                              })),
                            ]
                          }
                          value={columnMapping[field.value] || ''}
                          onChange={(e) =>
                            setColumnMapping((prev) => ({
                              ...prev,
                              [field.value]: e.target.value,
                            }))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Preview Table */}
            {uploadResult.preview && uploadResult.preview.length > 0 && (
              <div className="mt-6">
                <h4 className="mb-3 text-sm font-semibold text-gray-700">
                  Aperçu (5 premières lignes)
                </h4>
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          #
                        </th>
                        {uploadResult.preview[0] &&
                          Object.keys(uploadResult.preview[0]).map((col) => (
                            <th
                              key={col}
                              className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                            >
                              {col}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResult.preview.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="border-b border-gray-50">
                          <td className="px-3 py-2 text-xs text-gray-400">{idx + 1}</td>
                          {Object.values(row).map((val, colIdx) => (
                            <td key={colIdx} className="px-3 py-2 text-sm text-gray-700">
                              {val || <span className="text-gray-300">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" /> Recommencer
            </Button>
            <Button onClick={handleStartImport} disabled={!isMappingValid()}>
              <Upload className="h-4 w-4" /> Importer
            </Button>
          </div>
        </div>
      )}

      {/* Importing Step */}
      {step === 'importing' && (
        <Card>
          <div className="flex flex-col items-center py-8">
            <div className="mb-4 rounded-full bg-blue-50 p-4">
              {importing ? (
                <Clock className="h-8 w-8 animate-pulse text-primary" />
              ) : (
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {importing ? 'Import en cours...' : 'Import terminé'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {importing
                ? 'Veuillez patienter pendant le traitement des données.'
                : 'Le traitement est terminé. Consultez les résultats ci-dessous.'}
            </p>
            <div className="mt-6 w-full max-w-md">
              <ProgressBar
                value={importProgress}
                color={importing ? 'blue' : 'green'}
                label={importing ? 'Progression' : 'Terminé'}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Result Step */}
      {step === 'result' && importResult && (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Résumé de l'import</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Fichier : {uploadResult?.filename} — {uploadResult?.total_rows} ligne(s) au total
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-blue-50 p-4 text-center">
                <p className="text-3xl font-bold text-blue-700">{uploadResult?.total_rows || 0}</p>
                <p className="mt-1 text-sm font-medium text-blue-600">Total</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <p className="text-3xl font-bold text-emerald-700">{importResult.imported}</p>
                </div>
                <p className="mt-1 text-sm font-medium text-emerald-600">Importées avec succès</p>
              </div>
              <div className="rounded-xl bg-red-50 p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <p className="text-3xl font-bold text-red-700">{importResult.failed}</p>
                </div>
                <p className="mt-1 text-sm font-medium text-red-600">Échouées</p>
              </div>
            </div>

            {/* Error details */}
            {importResult.errors.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() =>
                    setExpandedErrors(expandedErrors === 1 ? null : 1)
                  }
                  className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700"
                >
                  {expandedErrors === 1 ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  Détails des erreurs ({importResult.errors.length})
                </button>
                {expandedErrors === 1 && (
                  <div className="mt-2 max-h-60 overflow-y-auto rounded-lg border border-red-100 bg-red-50/50">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-red-100">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-red-600">Ligne</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-red-600">Erreur</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.errors.map((err, i) => (
                          <tr key={i} className="border-b border-red-50">
                            <td className="px-3 py-2 text-sm font-medium text-red-700">{err.row}</td>
                            <td className="px-3 py-2 text-sm text-red-600">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </Card>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" /> Nouvel import
            </Button>
          </div>
        </div>
      )}

      {/* Import History */}
      <Card title="Historique des imports">
        {historyLoading ? (
          <LoadingSpinner />
        ) : importHistory.length === 0 ? (
          <EmptyState
            icon={<FileSpreadsheet className="h-8 w-8" />}
            title="Aucun import"
            description="Les imports effectués apparaîtront ici."
          />
        ) : (
          <>
            <Table
              columns={historyColumns}
              data={importHistory as any}
              keyExtractor={(r) => String(r.id)}
            />
            <div className="mt-4">
              <Pagination
                page={historyPage}
                totalPages={historyTotalPages}
                onPageChange={setHistoryPage}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
