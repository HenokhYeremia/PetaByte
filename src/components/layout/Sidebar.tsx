import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ScanLine,
  Copy,
  Trash2,
  Move,
  HeartPulse,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const links = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/scanner", icon: ScanLine, label: "Scanner" },
  { to: "/duplicates", icon: Copy, label: "Duplicates" },
  { to: "/cleaner", icon: Trash2, label: "Cache Cleaner" },
  { to: "/move", icon: Move, label: "Smart Move" },
  { to: "/health", icon: HeartPulse, label: "Health Score" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar({ collapsed: controlledCollapsed, onToggle }: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isControlled = controlledCollapsed !== undefined;

  const collapsed = isControlled ? controlledCollapsed : internalCollapsed;

  const toggle = () => {
    if (isControlled && onToggle) {
      onToggle();
    } else {
      setInternalCollapsed((c) => !c);
    }
  };

  return (
    <>
      <button
        className="fixed left-4 top-3 z-50 flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 md:hidden"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={clsx(
          "flex flex-col border-r border-zinc-800 bg-zinc-900 pt-12 transition-all duration-200 md:pt-4",
          collapsed ? "w-16" : "w-56",
          mobileOpen
            ? "fixed left-0 top-0 z-40 h-full"
            : "hidden md:relative md:flex",
        )}
      >
        <div
          className={clsx(
            "mb-8 flex items-center gap-2 px-2",
            collapsed ? "justify-center" : "px-3",
          )}
        >
          <div className="h-6 w-6 flex-shrink-0 rounded bg-emerald-500" />
          {!collapsed && <span className="text-lg font-bold">PetaByte</span>}
        </div>

        <nav className="flex flex-col gap-1 px-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
                )
              }
              title={collapsed ? link.label : undefined}
            >
              <link.icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto px-2 pb-4">
          <button
            onClick={toggle}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
