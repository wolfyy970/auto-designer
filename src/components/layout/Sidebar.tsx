import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FileEdit, Compass, Sparkles } from 'lucide-react';
import { SPEC_SECTIONS } from '../../lib/constants';
import { useWorkspaceStore } from '../../stores/workspace-store';

const NAV_ITEMS = [
  { to: '/editor', label: 'Spec', icon: FileEdit },
  { to: '/compiler', label: 'Exploration Space', icon: Compass },
  { to: '/generation', label: 'Variants', icon: Sparkles },
];

export default function Sidebar() {
  const activeSectionId = useWorkspaceStore((s) => s.activeSectionId);
  const setActiveSectionId = useWorkspaceStore((s) => s.setActiveSectionId);
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(`section-${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSectionId(sectionId as typeof activeSectionId);
    }
  };

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-gray-200 bg-gray-50">
      <div className="border-b border-gray-200 px-4 py-3">
        <h1 className="text-sm font-semibold text-gray-900">Auto Designer</h1>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="space-y-0.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setCurrentPath(to)}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-gray-200 font-medium text-gray-900'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </div>

        {currentPath === '/editor' && (
          <div className="mt-6">
            <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wider text-gray-400">
              Sections
            </p>
            <div className="space-y-0.5">
              {SPEC_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full rounded-md px-3 py-1.5 text-left text-xs transition-colors ${
                    activeSectionId === section.id
                      ? 'bg-gray-200 font-medium text-gray-900'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
