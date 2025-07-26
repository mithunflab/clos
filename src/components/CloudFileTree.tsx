
import React, { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, Plus, X, Edit, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface FileTreeNode {
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileTreeNode[];
  isOpen?: boolean;
}

interface CloudFileTreeProps {
  files: Array<{ name: string; content: string; language: string; }>;
  onFileSelect: (fileName: string, content: string) => void;
  onFileCreate: (fileName: string, content: string) => void;
  onFileUpdate: (fileName: string, content: string) => void;
  onFileDelete: (fileName: string) => void;
  selectedFile?: string;
}

const CloudFileTree: React.FC<CloudFileTreeProps> = ({
  files,
  onFileSelect,
  onFileCreate,
  onFileUpdate,
  onFileDelete,
  selectedFile
}) => {
  const [newFileName, setNewFileName] = useState('');
  const [showNewFile, setShowNewFile] = useState(false);
  const [editingFile, setEditingFile] = useState<string | null>(null);

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      const defaultContent = newFileName.endsWith('.py') ? 
        '# New Python file\nprint("Hello, World!")' : 
        '// New file\nconsole.log("Hello, World!");';
      
      onFileCreate(newFileName.trim(), defaultContent);
      setNewFileName('');
      setShowNewFile(false);
    }
  };

  const handleDeleteFile = (fileName: string) => {
    if (confirm(`Are you sure you want to delete ${fileName}?`)) {
      onFileDelete(fileName);
    }
  };

  return (
    <Card className="h-full p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Files</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNewFile(true)}
          className="h-6 w-6 p-0"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {showNewFile && (
        <div className="flex gap-1 mb-2">
          <Input
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="filename.py"
            className="text-xs h-6"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateFile()}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCreateFile}
            className="h-6 w-6 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNewFile(false)}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="space-y-1">
        {files.map((file) => (
          <div
            key={file.name}
            className={`flex items-center gap-2 p-1 rounded text-xs cursor-pointer hover:bg-muted/50 ${
              selectedFile === file.name ? 'bg-muted' : ''
            }`}
            onClick={() => onFileSelect(file.name, file.content)}
          >
            <File className="h-3 w-3 text-blue-500" />
            <span className="flex-1 truncate">{file.name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setEditingFile(file.name);
              }}
              className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
            >
              <Edit className="h-2 w-2" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFile(file.name);
              }}
              className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
            >
              <X className="h-2 w-2" />
            </Button>
          </div>
        ))}
      </div>

      {files.length === 0 && (
        <div className="text-center text-muted-foreground text-xs mt-4">
          <File className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No files yet</p>
          <p>AI will create files here</p>
        </div>
      )}
    </Card>
  );
};

export default CloudFileTree;
