import { Plus, RefreshCw, Check } from 'lucide-react';
import { normalizeError } from '../../lib/error-utils';
import { useCompilerStore, selectDimensionMap } from '../../stores/compiler-store';
import { useSpecStore } from '../../stores/spec-store';
import { compileSpec, compileVariantPrompts } from '../../services/compiler';
import ModelSelector from '../shared/ModelSelector';
import ProviderSelector from '../generation/ProviderSelector';
import VariantStrategyCard from './VariantStrategyCard';

/** Key used for dimension maps created from non-canvas views */
const DEFAULT_NODE_KEY = 'default';

export default function DimensionMapView() {
  const spec = useSpecStore((s) => s.spec);
  const dimensionMap = useCompilerStore(selectDimensionMap);
  const compiledPrompts = useCompilerStore((s) => s.compiledPrompts);
  const isCompiling = useCompilerStore((s) => s.isCompiling);
  const error = useCompilerStore((s) => s.error);
  const setDimensionMapForNode = useCompilerStore((s) => s.setDimensionMapForNode);
  const setCompiledPrompts = useCompilerStore((s) => s.setCompiledPrompts);
  const setCompiling = useCompilerStore((s) => s.setCompiling);
  const setError = useCompilerStore((s) => s.setError);
  const addVariantToNode = useCompilerStore((s) => s.addVariantToNode);
  const approveMapForNode = useCompilerStore((s) => s.approveMapForNode);
  const selectedProvider = useCompilerStore((s) => s.selectedProvider);
  const setSelectedProvider = useCompilerStore((s) => s.setSelectedProvider);
  const selectedModel = useCompilerStore((s) => s.selectedModel);
  const setSelectedModel = useCompilerStore((s) => s.setSelectedModel);

  const handleProviderChange = (newProviderId: string) => {
    setSelectedProvider(newProviderId);
    setSelectedModel('');
  };

  const handleCompile = async () => {
    setCompiling(true);
    setError(null);
    try {
      const map = await compileSpec(spec, selectedModel, selectedProvider);
      setDimensionMapForNode(DEFAULT_NODE_KEY, map);
    } catch (err) {
      setError(normalizeError(err, 'Compilation failed'));
    } finally {
      setCompiling(false);
    }
  };

  const handleApprove = () => {
    if (!dimensionMap) return;
    approveMapForNode(DEFAULT_NODE_KEY);
    const prompts = compileVariantPrompts(spec, dimensionMap);
    setCompiledPrompts(prompts);
  };

  if (!dimensionMap) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="text-center">
          <div className="mb-3 text-4xl">🧭</div>
          <h3 className="mb-2 text-lg font-medium text-fg">No Exploration Space Yet</h3>
          <p className="mb-6 max-w-md text-sm text-fg-secondary">
            Go to the Spec page and compile your specification to create the exploration space.
          </p>
          <a
            href="/editor"
            className="inline-flex items-center gap-2 rounded-lg bg-fg px-6 py-2.5 text-sm font-semibold text-bg transition-colors hover:bg-fg/90"
          >
            Go to Spec
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dimensions overview */}
      {dimensionMap.dimensions.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-fg-secondary">
            Identified Dimensions
          </h3>
          <div className="flex flex-wrap gap-2">
            {dimensionMap.dimensions.map((dim) => (
              <span
                key={dim.name}
                className={`rounded-full px-3 py-1 text-xs ${
                  dim.isConstant
                    ? 'bg-surface-raised text-fg-secondary'
                    : 'bg-info-subtle text-info'
                }`}
              >
                {dim.name}
                {dim.isConstant && ' (constant)'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Variant strategy cards */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-fg-secondary">
            Variant Strategies ({dimensionMap.variants.length})
          </h3>
          <button
            onClick={() => addVariantToNode(DEFAULT_NODE_KEY)}
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-fg-secondary hover:bg-surface-raised"
          >
            <Plus size={14} />
            Add Variant
          </button>
        </div>
        <div className="space-y-4">
          {dimensionMap.variants.map((strategy) => (
            <VariantStrategyCard
              key={strategy.id}
              strategy={strategy}
            />
          ))}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <p className="rounded-md bg-error-subtle px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="space-y-4 border-t border-border pt-6">
        {error && (
          <p className="rounded-md bg-error-subtle px-4 py-3 text-sm text-error">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ProviderSelector
              selectedId={selectedProvider}
              onChange={handleProviderChange}
            />
            <ModelSelector
              label="Model"
              providerId={selectedProvider}
              selectedModelId={selectedModel}
              onChange={setSelectedModel}
            />
            <button
              onClick={handleCompile}
              disabled={isCompiling}
              className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-fg-secondary transition-colors hover:bg-surface disabled:opacity-50"
            >
              <RefreshCw size={16} className={isCompiling ? 'animate-spin' : ''} />
              Re-compile
            </button>
          </div>

          <button
            onClick={handleApprove}
            disabled={dimensionMap.variants.length === 0}
            className="flex items-center gap-2 rounded-lg bg-fg px-6 py-2.5 text-sm font-semibold text-bg transition-colors hover:bg-fg/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check size={18} />
            {compiledPrompts.length > 0 ? 'Update & Continue' : 'Approve & Continue'}
          </button>
        </div>

        {compiledPrompts.length > 0 && (
          <p className="text-sm text-success">
            ✓ {compiledPrompts.length} {compiledPrompts.length === 1 ? 'variant' : 'variants'} ready for generation
          </p>
        )}
      </div>
    </div>
  );
}
