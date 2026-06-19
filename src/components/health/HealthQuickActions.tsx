import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { ScanLine, Copy, Trash2, FileText } from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  description: string;
}

interface HealthQuickActionsProps {
  actions?: QuickAction[];
  onAction?: (actionId: string) => void;
  loading?: boolean;
}

const defaultActions: QuickAction[] = [
  {
    id: "start-scan",
    label: "Start Scan",
    icon: <ScanLine className="h-4 w-4" />,
    variant: "primary",
    description: "Scan a directory for file analysis",
  },
  {
    id: "find-duplicates",
    label: "Find Duplicates",
    icon: <Copy className="h-4 w-4" />,
    variant: "secondary",
    description: "Detect duplicate files across storage",
  },
  {
    id: "clean-cache",
    label: "Clean Cache",
    icon: <Trash2 className="h-4 w-4" />,
    variant: "secondary",
    description: "Remove developer and system cache files",
  },
  {
    id: "view-report",
    label: "View Report",
    icon: <FileText className="h-4 w-4" />,
    variant: "ghost",
    description: "View detailed health analysis report",
  },
];

export function HealthQuickActions({
  actions = defaultActions,
  onAction,
  loading,
}: HealthQuickActionsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

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
