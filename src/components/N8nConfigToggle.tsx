
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useN8nConfig } from "@/hooks/useN8nConfig";
import { useToast } from "@/hooks/use-toast";
import { Cloud, Server, Save, Eye, EyeOff, X } from "lucide-react";

interface N8nConfigToggleProps {
  onConfigChange?: (useCaselCloud: boolean, n8nUrl?: string, n8nApiKey?: string) => void;
  onClose?: () => void;
  showAsModal?: boolean;
}

const N8nConfigToggle = ({ onConfigChange, onClose, showAsModal = false }: N8nConfigToggleProps) => {
  const { config, loading, updateConfig } = useN8nConfig();
  const { toast } = useToast();
  
  const [useCaselCloud, setUseCaselCloud] = useState(true);
  const [n8nUrl, setN8nUrl] = useState('');
  const [n8nApiKey, setN8nApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (config) {
      setUseCaselCloud(config.use_casel_cloud);
      setN8nUrl(config.n8n_url || '');
      setN8nApiKey(config.n8n_api_key || '');
    }
  }, [config]);

  useEffect(() => {
    onConfigChange?.(useCaselCloud, n8nUrl, n8nApiKey);
  }, [useCaselCloud, n8nUrl, n8nApiKey, onConfigChange]);

  const handleSave = async () => {
    setIsUpdating(true);
    
    const updates = {
      use_casel_cloud: useCaselCloud,
      n8n_url: useCaselCloud ? null : n8nUrl,
      n8n_api_key: useCaselCloud ? null : n8nApiKey
    };

    const success = await updateConfig(updates);
    
    if (success) {
      toast({
        title: "Configuration Updated",
        description: useCaselCloud 
          ? "Switched to Casel Cloud N8N" 
          : "Updated your N8N instance configuration",
      });
      onClose?.();
    } else {
      toast({
        title: "Update Failed",
        description: "Failed to update N8N configuration. Please try again.",
        variant: "destructive",
      });
    }
    
    setIsUpdating(false);
  };

  if (loading) {
    const loadingContent = (
      <Card className={showAsModal ? "bg-black/80 backdrop-blur-sm border border-white/20 max-w-md w-full" : "border-border bg-card"}>
        <CardContent className="p-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );

    if (showAsModal) {
      return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          {loadingContent}
        </div>
      );
    }
    return loadingContent;
  }

  const cardContent = (
    <Card className={showAsModal ? "bg-black/80 backdrop-blur-sm border border-white/20 max-w-md w-full" : "border-border bg-card"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-white" />
            <CardTitle className={`text-lg ${showAsModal ? 'text-white' : 'text-card-foreground'}`}>
              N8N Configuration
            </CardTitle>
          </div>
          {showAsModal && onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription className={showAsModal ? "text-white/60" : "text-muted-foreground"}>
          Choose between Casel Cloud N8N or your own N8N instance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {useCaselCloud ? (
                <Cloud className="h-4 w-4 text-blue-500" />
              ) : (
                <Server className="h-4 w-4 text-orange-500" />
              )}
              <Label className={`text-sm font-medium ${showAsModal ? 'text-white' : 'text-foreground'}`}>
                {useCaselCloud ? 'Casel Cloud N8N' : 'Own N8N Instance'}
              </Label>
            </div>
          </div>
          <Switch
            checked={useCaselCloud}
            onCheckedChange={setUseCaselCloud}
          />
        </div>

        {!useCaselCloud && (
          <div className={`space-y-4 pt-4 border-t ${showAsModal ? 'border-white/20' : 'border-border'}`}>
            <div className="space-y-2">
              <Label htmlFor="n8nUrl" className={showAsModal ? 'text-white' : 'text-foreground'}>N8N Instance URL</Label>
              <Input
                id="n8nUrl"
                type="url"
                value={n8nUrl}
                onChange={(e) => setN8nUrl(e.target.value)}
                placeholder="https://your-n8n-instance.com"
                className={showAsModal ? "bg-white/5 border-white/20 text-white placeholder:text-white/40" : "bg-background text-foreground border-border"}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="n8nApiKey" className={showAsModal ? 'text-white' : 'text-foreground'}>N8N API Key</Label>
              <div className="relative">
                <Input
                  id="n8nApiKey"
                  type={showApiKey ? "text" : "password"}
                  value={n8nApiKey}
                  onChange={(e) => setN8nApiKey(e.target.value)}
                  placeholder="Your N8N API key"
                  className={showAsModal ? "bg-white/5 border-white/20 text-white placeholder:text-white/40 pr-10" : "bg-background text-foreground border-border pr-10"}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={`absolute right-1 top-1 h-8 w-8 p-0 ${showAsModal ? 'text-white/60 hover:text-white hover:bg-white/10' : ''}`}
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className={`flex gap-2 pt-4 ${showAsModal ? 'justify-stretch' : 'justify-end'}`}>
          <Button
            onClick={handleSave}
            disabled={isUpdating || (!useCaselCloud && (!n8nUrl || !n8nApiKey))}
            className={`flex items-center gap-2 ${showAsModal ? 'flex-1 bg-white text-black hover:bg-white/90' : ''}`}
          >
            <Save className="h-4 w-4" />
            {isUpdating ? 'Saving...' : 'Save Configuration'}
          </Button>
          {showAsModal && onClose && (
            <Button
              variant="outline"
              onClick={onClose}
              className="bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (showAsModal) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        {cardContent}
      </div>
    );
  }

  return cardContent;
};

export default N8nConfigToggle;
