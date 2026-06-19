import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ScanLine,
  Copy,
  Broom,
  Move,
  Settings,
} from "lucide-react";

const links = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/scanner", icon: ScanLine, label: "Scanner" },
  { to: "/duplicates", icon: Copy, label: "Duplicates" },
  { to: "/cleaner", icon: Broom, label: "Cache Cleaner" },
  { to: "/move", icon: Move, label: "Smart Move" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  return (
    <aside className="flex w-56 flex-col border-r border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="h-6 w-6 rounded bg-emerald-500" />
        <span className="text-lg font-bold">PetaByte</span>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`
            }
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
