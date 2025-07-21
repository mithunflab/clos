
import { useState, useEffect } from "react";
import { Plus, Search, Filter, Workflow, Calendar, ArrowRight, Github, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useGitHubIntegration } from "@/hooks/useGitHubIntegration";
import { toast } from "sonner";

const Workflows = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const { getUserWorkflows } = useGitHubIntegration();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      console.log('📥 Loading user workflows from database...');
      const userWorkflows = await getUserWorkflows();
      console.log('✅ Loaded workflows:', userWorkflows);
      setWorkflows(userWorkflows || []);
      
      if (userWorkflows && userWorkflows.length > 0) {
        toast.success(`Loaded ${userWorkflows.length} workflow${userWorkflows.length !== 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error('❌ Error loading workflows:', error);
      toast.error("Failed to load workflows. Please try again.");
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  };

  // Load workflows on component mount
  useEffect(() => {
    loadWorkflows();
  }, []);

  const filteredWorkflows = workflows.filter(workflow =>
    workflow.workflow_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const EmptyState = () => (
    <div className="text-center py-12">
      <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Workflow className="w-12 h-12 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No workflows yet
      </h3>
      <p className="text-gray-600 mb-6 max-w-sm mx-auto">
        Get started by creating your first automated workflow. Our AI will help you build it step by step.
      </p>
      <Button onClick={() => navigate("/playground")} className="inline-flex items-center">
        <Plus className="w-4 h-4 mr-2" />
        Create Your First Workflow
      </Button>
    </div>
  );

  const LoadingState = () => (
    <div className="text-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4">
        <RefreshCw className="w-8 h-8" />
      </div>
      <p className="text-gray-600">Loading workflows...</p>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Workflows</h1>
          <p className="text-gray-600">
            Create, manage, and monitor your automation workflows
          </p>
        </div>
        <Button 
          onClick={() => navigate("/playground")}
          className="mt-4 sm:mt-0 inline-flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Workflow
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search workflows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button 
          variant="outline" 
          className="inline-flex items-center"
          onClick={loadWorkflows}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState />
      ) : filteredWorkflows.length === 0 ? (
        workflows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No workflows found
            </h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search terms or create a new workflow.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setSearchTerm("")}
              className="mr-2"
            >
              Clear Search
            </Button>
            <Button onClick={() => navigate("/playground")}>
              <Plus className="w-4 h-4 mr-2" />
              New Workflow
            </Button>
          </div>
        )
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-600">
            Found {filteredWorkflows.length} workflow{filteredWorkflows.length !== 1 ? 's' : ''}
            {workflows.length !== filteredWorkflows.length && ` of ${workflows.length} total`}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkflows.map((workflow) => (
              <Card key={workflow.id} className="hover:shadow-lg transition-shadow cursor-pointer group relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg line-clamp-1">
                      {workflow.workflow_name || 'Untitled Workflow'}
                    </CardTitle>
                    <Badge variant="secondary" className="ml-2">
                      Active
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    Created on {new Date(workflow.created_at).toLocaleDateString()}
                    {workflow.github_repo_name && (
                      <span className="block text-xs text-blue-600 mt-1">
                        Synced to GitHub
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <Calendar className="w-4 h-4 mr-1" />
                    Last updated: {new Date(workflow.last_updated || workflow.created_at).toLocaleDateString()}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/playground?workflowId=${workflow.workflow_id}`)}
                      className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    >
                      Open
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                    
                    {workflow.github_repo_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(workflow.github_repo_url, '_blank');
                        }}
                        title="View on GitHub"
                      >
                        <Github className="w-4 h-4 mr-1" />
                        GitHub
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Workflows;
