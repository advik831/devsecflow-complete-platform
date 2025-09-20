interface Stage {
  id: string;
  name: string;
  type: string;
  icon: string;
  description: string;
}

interface StageLibraryProps {
  onStageAdd: (stage: Stage) => void;
}

export default function StageLibrary({ onStageAdd }: StageLibraryProps) {
  const availableStages: Omit<Stage, 'id'>[] = [
    {
      name: 'Source Control',
      type: 'source',
      icon: 'fas fa-code-branch',
      description: 'Git checkout'
    },
    {
      name: 'Build',
      type: 'build',
      icon: 'fas fa-hammer',
      description: 'Compile code'
    },
    {
      name: 'Test',
      type: 'test',
      icon: 'fas fa-vial',
      description: 'Run tests'
    },
    {
      name: 'Security Scan',
      type: 'security',
      icon: 'fas fa-shield-alt',
      description: 'SAST/DAST'
    },
    {
      name: 'Deploy',
      type: 'deploy',
      icon: 'fas fa-rocket',
      description: 'Deploy app'
    },
    {
      name: 'Notification',
      type: 'notification',
      icon: 'fas fa-bell',
      description: 'Send alerts'
    },
  ];

  const handleStageClick = (stage: Omit<Stage, 'id'>) => {
    const newStage: Stage = {
      ...stage,
      id: Date.now().toString()
    };
    onStageAdd(newStage);
  };

  return (
    <div data-testid="stage-library">
      <h3 className="text-sm font-medium mb-3 text-muted-foreground">Available Stages</h3>
      <div className="space-y-2">
        {availableStages.map((stage, index) => (
          <div
            key={index}
            className="bg-muted rounded-lg p-3 cursor-pointer hover:bg-accent transition-colors"
            draggable
            onClick={() => handleStageClick(stage)}
            data-testid={`available-stage-${stage.type}`}
          >
            <div className="flex items-center space-x-2">
              <i className={`${stage.icon} text-xs text-primary`}></i>
              <span className="text-sm" data-testid={`stage-name-${stage.type}`}>
                {stage.name}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1" data-testid={`stage-desc-${stage.type}`}>
              {stage.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
