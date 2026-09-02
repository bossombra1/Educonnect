import { useState, useRef, useCallback, type DragEvent } from 'react';
import { Upload, X, FileText, Image, File } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FileUploadProps {
  accept?: string;
  onFileSelect: (files: File[]) => void;
  maxFiles?: number;
  label?: string;
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
  if (type === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-gray-500" />;
}

export default function FileUpload({ accept, onFileSelect, maxFiles = 5, label }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const arr = Array.from(newFiles);
    const updated = [...files, ...arr].slice(0, maxFiles);
    setFiles(updated);
    onFileSelect(updated);
  }, [files, maxFiles, onFileSelect]);

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onFileSelect(updated);
  };

  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>}
      <div
        onDragOver={(e: DragEvent) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e: DragEvent) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
          dragOver ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
        )}
      >
        <Upload className="mb-2 h-8 w-8 text-gray-400" />
        <p className="text-sm text-gray-600">Cliquez ou glissez vos fichiers ici</p>
        <p className="mt-1 text-xs text-gray-400">Maximum {maxFiles} fichier(s)</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <div className="flex items-center gap-2">
                {getFileIcon(file.type)}
                <span className="text-sm text-gray-700 truncate max-w-[200px]">{file.name}</span>
                <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} Ko)</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="text-gray-400 hover:text-red-500">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}