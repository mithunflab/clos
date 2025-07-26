
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, File, X } from 'lucide-react';
import { toast } from 'sonner';

interface SessionFileUploadProps {
  onFileUpload: (file: File) => void;
  currentFile?: File | null;
  onRemoveFile?: () => void;
}

const SessionFileUpload: React.FC<SessionFileUploadProps> = ({
  onFileUpload,
  currentFile,
  onRemoveFile
}) => {
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndUploadFile(file);
    }
  };

  const validateAndUploadFile = (file: File) => {
    if (!file.name.endsWith('.session')) {
      toast.error('Please upload a valid .session file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('File size must be less than 5MB');
      return;
    }

    onFileUpload(file);
    toast.success('Session file uploaded successfully');
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      validateAndUploadFile(files[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  if (currentFile) {
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
        <div className="flex items-center gap-2">
          <File className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">{currentFile.name}</span>
          <span className="text-xs text-muted-foreground">
            ({(currentFile.size / 1024).toFixed(1)} KB)
          </span>
        </div>
        {onRemoveFile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemoveFile}
            className="h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        dragOver
          ? 'border-primary bg-primary/10'
          : 'border-muted-foreground/25 hover:border-primary/50'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
      <p className="text-sm text-muted-foreground mb-3">
        Drag and drop your session.session file here, or click to browse
      </p>
      <Input
        type="file"
        accept=".session"
        onChange={handleFileChange}
        className="hidden"
        id="session-file-input"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => document.getElementById('session-file-input')?.click()}
      >
        <Upload className="w-4 h-4 mr-2" />
        Choose File
      </Button>
    </div>
  );
};

export default SessionFileUpload;
