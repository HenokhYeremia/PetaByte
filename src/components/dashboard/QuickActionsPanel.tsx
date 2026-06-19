import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScanLine, Copy, Trash2, HeartPulse } from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  description: string;
}

interface QuickActionsPanelProps {
  actions?: QuickAction[];
  onAction?: (actionId: string) => void;
}

const defaultActions: QuickAction[] = [
  {
    id: "start-scan",
    label: "Start Scan",
    icon: <ScanLine className="h-4 w-4" />,
    variant: "primary",
    description: "Scan a directory for files",
  },
  {
    id: "find-duplicates",
    label: "Find Duplicates",
    icon: <Copy className="h-4 w-4" />,
    variant: "secondary",
    disabled: true,
    description: "Detect duplicate files",
  },
  {
    id: "clean-cache",
    label: "Clean Cache",
    icon: <Trash2 className="h-4 w-4" />,
    variant: "secondary",
    disabled: true,
    description: "Remove developer cache files",
  },
  {
    id: "view-health",
    label: "View Health Report",
    icon: <HeartPulse className="h-4 w-4" />,
    variant: "ghost",
    disabled: true,
    description: "View storage health report",
  },
];

export function QuickActionsPanel({
  actions = defaultActions,
  onAction,
}: QuickActionsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant}
              size="sm"
              disabled={action.disabled}
              onClick={() => onAction?.(action.id)}
              className="w-full justify-start"
              title={action.description}
            >
              {action.icon}
              <span className="truncate">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
