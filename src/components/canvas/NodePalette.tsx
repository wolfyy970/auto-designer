import {
  FileText,
  Image,
  BookOpen,
  Target,
  ShieldCheck,
  Cpu,
  Lightbulb,
  Sparkles,
  MessageSquareDiff,
} from 'lucide-react';
import {
  useCanvasStore,
  SECTION_NODE_TYPES,
  type CanvasNodeType,
} from '../../stores/canvas-store';

interface NodeEntry {
  type: CanvasNodeType;
  label: string;
  icon: React.ReactNode;
  group: 'input' | 'processing' | 'output';
}

const NODE_ENTRIES: NodeEntry[] = [
  { type: 'designBrief', label: 'Design Brief', icon: <FileText size={14} />, group: 'input' },
  { type: 'existingDesign', label: 'Existing Design', icon: <Image size={14} />, group: 'input' },
  { type: 'researchContext', label: 'Research & Context', icon: <BookOpen size={14} />, group: 'input' },
  { type: 'objectivesMetrics', label: 'Objectives & Metrics', icon: <Target size={14} />, group: 'input' },
  { type: 'designConstraints', label: 'Design Constraints', icon: <ShieldCheck size={14} />, group: 'input' },
  { type: 'compiler', label: 'Incubator', icon: <Cpu size={14} />, group: 'processing' },
  { type: 'hypothesis', label: 'Hypothesis', icon: <Lightbulb size={14} />, group: 'output' },
  { type: 'generator', label: 'Designer', icon: <Sparkles size={14} />, group: 'processing' },
  { type: 'critique', label: 'Critique', icon: <MessageSquareDiff size={14} />, group: 'processing' },
];

const GROUP_LABELS: Record<string, string> = {
  input: 'Input',
  processing: 'Processing',
  output: 'Output',
};

interface NodePaletteProps {
  onAdd?: (type: CanvasNodeType, position?: { x: number; y: number }) => void;
  position?: { x: number; y: number };
}

export default function NodePalette({ onAdd, position }: NodePaletteProps) {
  const nodes = useCanvasStore((s) => s.nodes);
  const addNode = useCanvasStore((s) => s.addNode);

  function isSingleton(type: CanvasNodeType): boolean {
    // Sections are still singletons; compilers and generators can be multiple
    if (SECTION_NODE_TYPES.has(type)) return true;
    return false;
  }

  function isOnCanvas(type: CanvasNodeType): boolean {
    return nodes.some((n) => n.type === type);
  }

  function handleClick(type: CanvasNodeType) {
    if (onAdd) {
      onAdd(type, position);
    } else {
      addNode(type, position);
    }
  }

  const groups = ['input', 'processing', 'output'] as const;

  return (
    <div className="w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
      {groups.map((group) => {
        const entries = NODE_ENTRIES.filter((e) => e.group === group);
        if (entries.length === 0) return null;
        return (
          <div key={group}>
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {GROUP_LABELS[group]}
            </div>
            {entries.map((entry) => {
              const disabled = isSingleton(entry.type) && isOnCanvas(entry.type);
              return (
                <button
                  key={entry.type}
                  onClick={() => handleClick(entry.type)}
                  disabled={disabled}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="text-gray-400">{entry.icon}</span>
                  {entry.label}
                  {disabled && (
                    <span className="ml-auto text-[10px] text-gray-300">added</span>
                  )}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
