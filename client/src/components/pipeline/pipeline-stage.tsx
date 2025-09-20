import { Button } from "@/components/ui/button";

interface Stage {
  id: string;
  name: string;
  type: string;
  icon: string;
  description: string;
}

interface PipelineStageProps {
  stage: Stage;
  onRemove?: () => void;
  draggable?: boolean;
}

export default function PipelineStage({ stage, onRemove, draggable = false }: PipelineStageProps) {
  return (
    <div 
      className="bg-accent border border-border rounded-lg p-4 min-w-[140px] relative group hover:shadow-lg transition-shadow"
      draggable={draggable}
      data-testid={`pipeline-stage-${stage.type}`}
    >
      {onRemove && (
        <Button
          size="sm"
          variant="ghost"
          className="absolute -top-2 -right-2 w-6 h-6 p-0 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
          data-testid={`remove-stage-${stage.id}`}
        >
          <i className="fas fa-times text-xs"></i>
        </Button>
      )}
      <div className="text-center">
        <i className={`${stage.icon} text-primary mb-2 text-lg`}></i>
        <h4 className="text-sm font-medium" data-testid={`stage-name-${stage.id}`}>
          {stage.name}
        </h4>
        <p className="text-xs text-muted-foreground" data-testid={`stage-description-${stage.id}`}>
          {stage.description}
        </p>
      </div>
    </div>
  );
}
