
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCloudN8nInstances } from '@/hooks/useCloudN8nInstances';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CloudN8nDeleteButtonProps {
  instanceId: string;
  instanceName: string;
  renderServiceId?: string | null;
  onDelete: () => void;
}

export const CloudN8nDeleteButton: React.FC<CloudN8nDeleteButtonProps> = ({
  instanceId,
  instanceName,
  renderServiceId,
  onDelete
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { deleteInstance } = useCloudN8nInstances();
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    
    const success = await deleteInstance(instanceId, renderServiceId || undefined);
    
    if (success) {
      toast({
        title: "Success",
        description: "N8N instance deleted successfully",
      });
      onDelete();
    } else {
      toast({
        title: "Error",
        description: "Failed to delete N8N instance",
        variant: "destructive",
      });
    }
    
    setIsDeleting(false);
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete N8N Instance</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the N8N instance "{instanceName}"? 
            This will permanently delete the instance from both Render and your account.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Instance'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
