import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PipelineStage from "@/components/pipeline/pipeline-stage";
import StageLibrary from "../pipeline/stage-library";

interface Stage {
  id: string;
  name: string;
  type: string;
  icon: string;
  description: string;
}

export default function PipelineBuilder() {
  const [activeTab, setActiveTab] = useState<'visual' | 'yaml'>('visual');
  const [pipelineStages, setPipelineStages] = useState<Stage[]>([
    {
      id: '1',
      name: 'Source',
      type: 'source',
      icon: 'fas fa-code-branch',
      description: 'GitHub'
    },
    {
      id: '2',
      name: 'Build',
      type: 'build',
      icon: 'fas fa-hammer',
      description: 'Docker'
    },
    {
      id: '3',
      name: 'Test',
      type: 'test',
      icon: 'fas fa-vial',
      description: 'Jest'
    },
    {
      id: '4',
      name: 'Security',
      type: 'security',
      icon: 'fas fa-shield-alt',
      description: 'SAST/DAST'
    },
    {
      id: '5',
      name: 'Deploy',
      type: 'deploy',
      icon: 'fas fa-rocket',
      description: 'Kubernetes'
    }
  ]);

  const handleStageAdd = (stage: Stage) => {
    const newStage = {
      ...stage,
      id: Date.now().toString()
    };
    setPipelineStages([...pipelineStages, newStage]);
  };

  const handleStageRemove = (stageId: string) => {
    setPipelineStages(pipelineStages.filter(stage => stage.id !== stageId));
  };

  return (
    <Card className="mt-8 shadow-sm" data-testid="pipeline-builder">
      <CardHeader className="border-b bg-gradient-to-r from-background to-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold flex items-center">
              <i className="fas fa-project-diagram mr-2 text-primary"></i>
              Pipeline Builder
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Design your CI/CD pipeline visually or with YAML
            </p>
          </div>
          <div className="flex items-center space-x-1 bg-muted/30 p-1 rounded-lg">
            <Button
              variant={activeTab === 'visual' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('visual')}
              data-testid="tab-visual"
              className="h-8"
            >
              <i className="fas fa-eye mr-1 text-xs"></i>
              Visual
            </Button>
            <Button
              variant={activeTab === 'yaml' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('yaml')}
              data-testid="tab-yaml"
              className="h-8"
            >
              <i className="fas fa-code mr-1 text-xs"></i>
              YAML
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {activeTab === 'visual' ? (
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-8">
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-muted/10 to-muted/30 border-2 border-dashed border-primary/30 rounded-xl p-8 min-h-[240px] transition-all duration-300 hover:border-primary/50">
                  {pipelineStages.length > 0 ? (
                    <div className="flex items-center justify-center space-x-6 flex-wrap">
                      {pipelineStages.map((stage, index) => (
                        <div key={stage.id} className="flex items-center">
                          <PipelineStage
                            stage={stage}
                            onRemove={() => handleStageRemove(stage.id)}
                          />
                          {index < pipelineStages.length - 1 && (
                            <div className="flex items-center mx-4">
                              <div className="w-8 h-0.5 bg-primary/40"></div>
                              <div className="w-0 h-0 border-l-8 border-l-primary/60 border-y-4 border-y-transparent"></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <i className="fas fa-plus text-primary text-xl"></i>
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        Build Your Pipeline
                      </h3>
                      <p className="text-muted-foreground max-w-sm">
                        Drag and drop stages from the library to create your custom CI/CD pipeline
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {pipelineStages.length} stage{pipelineStages.length !== 1 ? 's' : ''} configured
                  </div>
                  <div className="flex space-x-3">
                    <Button variant="outline" size="sm" data-testid="button-save-template" className="h-9">
                      <i className="fas fa-save mr-2 text-xs"></i>
                      Save Template
                    </Button>
                    <Button size="sm" data-testid="button-run-pipeline" className="h-9">
                      <i className="fas fa-play mr-2 text-xs"></i>
                      Run Pipeline
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-span-4">
              <div className="sticky top-6">
                <StageLibrary onStageAdd={handleStageAdd} />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">pipeline.yml</span>
              </div>
              <div className="p-6 font-mono text-sm text-slate-100 dark:text-slate-200 overflow-x-auto">
                <pre className="whitespace-pre">{`name: Custom Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
${pipelineStages.map(stage => `  ${stage.type}:
    runs-on: ubuntu-latest
    steps:
      - name: ${stage.name}
        uses: actions/${stage.type}@v1`).join('\n')}
`}</pre>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Generated configuration for {pipelineStages.length} stage{pipelineStages.length !== 1 ? 's' : ''}
              </div>
              <div className="flex space-x-3">
                <Button variant="outline" size="sm" data-testid="button-download-yaml" className="h-9">
                  <i className="fas fa-download mr-2 text-xs"></i>
                  Download YAML
                </Button>
                <Button size="sm" data-testid="button-save-yaml" className="h-9">
                  <i className="fas fa-save mr-2 text-xs"></i>
                  Save Configuration
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
