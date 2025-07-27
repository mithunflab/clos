
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CloudN8nDeleteButtonProps {
  instanceId: string;
  instanceName: string;
  renderServiceId: string | null;
  onDelete: () => void;
}

export const CloudN8nDeleteButton: React.FC<CloudN8nDeleteButtonProps> = ({
  instanceId,
  instanceName,
  renderServiceId,
  onDelete
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Delete from Render if service exists
      if (renderServiceId) {
        const { error: renderError } = await supabase.functions.invoke('cloud-runner-manager', {
          body: {
            action: 'delete-render-service',
            serviceId: renderServiceId
          }
        });

        if (renderError) {
          console.warn('Failed to delete Render service:', renderError);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('cloud_n8n_instances')
        .delete()
        .eq('id', instanceId);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: `N8N instance "${instanceName}" deleted successfully`,
      });

      onDelete();
    } catch (error) {
      console.error('Error deleting N8N instance:', error);
      toast({
        title: "Error",
        description: "Failed to delete N8N instance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={isDeleting}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete N8N Instance</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the N8N instance "{instanceName}"? This action cannot be undone and will permanently remove the instance and all associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
