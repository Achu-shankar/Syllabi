'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Loader2, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { type Skill } from '@/app/dashboard/libs/skills_db_queries';
import { Switch } from '@/components/ui/switch';

interface TestActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: Skill;
  chatbotId: string;
  onLiveExecutionComplete?: () => void;
}

interface TestResult {
  skill_id: string;
  skill_name: string;
  parameters: Record<string, any>;
  result: {
    success: boolean;
    data?: any;
    error?: string;
  };
  execution_time_ms: number;
  test_mode: boolean;
  live_mode: boolean;
}

export function TestActionModal({ 
  open, 
  onOpenChange, 
  action, 
  chatbotId,
  onLiveExecutionComplete
}: TestActionModalProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [parameters, setParameters] = useState<string>('{}');
  const [parametersError, setParametersError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveMode, setLiveMode] = useState(false);

  // Generate example parameters when action changes
  useEffect(() => {
    if (open && action) {
      const exampleParams = generateExampleParameters(action);
      setParameters(JSON.stringify(exampleParams, null, 2));
      setTestResult(null);
      setError(null);
      setParametersError(null);
    }
  }, [open, action]);

  const generateExampleParameters = (skill: Skill): Record<string, any> => {
    const examples: Record<string, any> = {};
    
    if (skill.function_schema?.parameters?.properties) {
      Object.entries(skill.function_schema.parameters.properties).forEach(([key, schema]: [string, any]) => {
        switch (schema.type) {
          case 'string':
            examples[key] = `example_${key}`;
            break;
          case 'number':
            examples[key] = 42;
            break;
          case 'boolean':
            examples[key] = true;
            break;
          case 'array':
            examples[key] = ['item1', 'item2'];
            break;
          case 'object':
            examples[key] = { property: 'value' };
            break;
          default:
            examples[key] = `example_${key}`;
        }
      });
    }
    
    return examples;
  };

  const validateParameters = (): boolean => {
    try {
      JSON.parse(parameters);
      setParametersError(null);
      return true;
    } catch (error) {
      setParametersError('Invalid JSON format');
      return false;
    }
  };

  const executeTest = async () => {
    if (!validateParameters()) {
      toast.error('Please fix the parameter format');
      return;
    }

    try {
      setIsExecuting(true);
      setError(null);
      setTestResult(null);

      const response = await fetch(
        `/api/dashboard/chatbots/${chatbotId}/skills/${action.id}/test`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            parameters: JSON.parse(parameters),
            live_mode: liveMode,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Test execution failed');
      }

      setTestResult(data);
      if (liveMode) {
        toast.success('Action executed successfully and logged to execution history');
        onLiveExecutionComplete?.();
      } else {
        toast.success('Action test completed successfully');
      }
      
    } catch (error: any) {
      console.error('Failed to execute test:', error);
      setError(error.message || 'Failed to execute test');
      toast.error('Test execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Test Action: {action.display_name}
          </DialogTitle>
          <DialogDescription>
            Test your action with custom parameters and review the execution results
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Action Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Action Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Function:</Label>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">{action.name}</code>
              </div>
              <div>
                <Label className="text-sm font-medium">Description:</Label>
                <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Status:</Label>
                <Badge variant={action.is_active ? 'default' : 'secondary'}>
                  {action.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Test Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Parameters</CardTitle>
              <CardDescription>
                Modify the parameters JSON to test different scenarios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="parameters">Parameters (JSON)</Label>
                <Textarea
                  id="parameters"
                  value={parameters}
                  onChange={(e) => {
                    setParameters(e.target.value);
                    setParametersError(null);
                  }}
                  placeholder="Enter parameters as JSON..."
                  className={`font-mono text-sm ${parametersError ? 'border-red-500' : ''}`}
                  rows={8}
                />
                {parametersError && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {parametersError}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={executeTest}
                  disabled={isExecuting || !!parametersError}
                  className="gap-2"
                >
                  {isExecuting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {isExecuting ? 'Executing...' : (liveMode ? 'Run Live' : 'Test Run')}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    const exampleParams = generateExampleParameters(action);
                    setParameters(JSON.stringify(exampleParams, null, 2));
                  }}
                >
                  Reset to Example
                </Button>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  checked={liveMode}
                  onCheckedChange={setLiveMode}
                />
                <Label className="text-sm">
                  Live mode (logs to execution history & updates count)
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">Execution Result</CardTitle>
                  <CardDescription>
                    The output from your action execution
                  </CardDescription>
                </div>
                {testResult && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(testResult, null, 2))}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Result
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <Card className="border-red-200 bg-red-50 mb-4">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-medium">Execution Error</span>
                    </div>
                    <p className="text-red-600 mt-2">{error}</p>
                  </CardContent>
                </Card>
              )}

              {testResult ? (
                <div className="space-y-4">
                  {/* Execution Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      {testResult.result.success ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">Success</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium">Failed</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">
                        {formatExecutionTime(testResult.execution_time_ms)}
                      </span>
                    </div>
                    <div>
                      <Badge variant={testResult.live_mode ? 'default' : 'secondary'}>
                        {testResult.live_mode ? 'Live Execution' : 'Test Mode'}
                      </Badge>
                    </div>
                  </div>

                  {/* Result Data */}
                  <div>
                    <Label className="text-sm font-medium">
                      {testResult.result.success ? 'Result Data' : 'Error Details'}
                    </Label>
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg border">
                      <pre className="text-sm overflow-auto max-h-64">
                        {testResult.result.success 
                          ? JSON.stringify(testResult.result.data || {}, null, 2)
                          : testResult.result.error || 'Unknown error'
                        }
                      </pre>
                    </div>
                  </div>

                  {/* Parameters Used */}
                  <div>
                    <Label className="text-sm font-medium">Parameters Used</Label>
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg border">
                      <pre className="text-sm overflow-auto max-h-32">
                        {JSON.stringify(testResult.parameters, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Ready to test</h3>
                  <p>Execute a test to see results here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 