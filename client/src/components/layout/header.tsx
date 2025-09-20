import { Button } from "@/components/ui/button";
import { Menu, Bell, Plus } from "lucide-react";

interface HeaderProps {
  title: string;
  onToggleSidebar?: () => void;
}

export default function Header({ title, onToggleSidebar }: HeaderProps) {

  return (
    <header className="bg-card border-b border-border p-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onToggleSidebar} 
            className="p-2 rounded-md hover:bg-accent transition-colors"
            data-testid="button-toggle-sidebar"
          >
            <Menu className="w-4 h-4 text-muted-foreground" />
          </Button>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">{title}</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm"
            className="p-2 rounded-md hover:bg-accent transition-colors relative"
            data-testid="button-notifications"
          >
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full text-xs"></span>
          </Button>
          <Button className="bg-primary text-primary-foreground hover:opacity-90 transition-opacity" data-testid="button-new-pipeline">
            <Plus className="w-4 h-4 mr-2" />New Pipeline
          </Button>
        </div>
      </div>
    </header>
  );
}
