import { Plus, RefreshCw, Check } from 'lucide-react';
import { useCompilerStore } from '../../stores/compiler-store';
import { useSpecStore } from '../../stores/spec-store';
import { compileSpec, compileVariantPrompts } from '../../services/compiler';
import { MODEL_TIERS } from '../../lib/constants';
import ModelSelector from '../shared/ModelSelector';
import VariantStrategyCard from './VariantStrategyCard';

export default function DimensionMapView() {
  const spec = useSpecStore((s) => s.spec);
  const dimensionMap = useCompilerStore((s) => s.dimensionMap);
  const compiledPrompts = useCompilerStore((s) => s.compiledPrompts);
  const isCompiling = useCompilerStore((s) => s.isCompiling);
  const error = useCompilerStore((s) => s.error);
  const setDimensionMap = useCompilerStore((s) => s.setDimensionMap);
  const setCompiledPrompts = useCompilerStore((s) => s.setCompiledPrompts);
  const setCompiling = useCompilerStore((s) => s.setCompiling);
  const setError = useCompilerStore((s) => s.setError);
  const addVariant = useCompilerStore((s) => s.addVariant);
  const approveMap = useCompilerStore((s) => s.approveMap);
  const selectedModel = useCompilerStore((s) => s.selectedModel);
  const setSelectedModel = useCompilerStore((s) => s.setSelectedModel);

  const handleCompile = async () => {
    setCompiling(true);
    setError(null);
    try {
      const map = await compileSpec(spec, selectedModel);
      setDimensionMap(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compilation failed');
    } finally {
      setCompiling(false);
    }
  };

  const handleApprove = () => {
    if (!dimensionMap) return;
    approveMap();
    const prompts = compileVariantPrompts(spec, dimensionMap);
    setCompiledPrompts(prompts);
  };

  if (!dimensionMap) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="text-center">
          <div className="mb-3 text-4xl">🧭</div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">No Exploration Space Yet</h3>
          <p className="mb-6 max-w-md text-sm text-gray-500">
            Go to the Spec page and compile your specification to create the exploration space.
          </p>
          <a
            href="/editor"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
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
          <h3 className="mb-2 text-sm font-medium text-gray-700">
            Identified Dimensions
          </h3>
          <div className="flex flex-wrap gap-2">
            {dimensionMap.dimensions.map((dim) => (
              <span
                key={dim.name}
                className={`rounded-full px-3 py-1 text-xs ${
                  dim.isConstant
                    ? 'bg-gray-100 text-gray-500'
                    : 'bg-blue-50 text-blue-700'
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
          <h3 className="text-sm font-medium text-gray-700">
            Variant Strategies ({dimensionMap.variants.length})
          </h3>
          <button
            onClick={addVariant}
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
          >
            <Plus size={14} />
            Add Variant
          </button>
        </div>
        <div className="space-y-4">
          {dimensionMap.variants.map((strategy, i) => (
            <VariantStrategyCard
              key={strategy.id}
              strategy={strategy}
              index={i}
              total={dimensionMap.variants.length}
            />
          ))}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="space-y-4 border-t border-gray-200 pt-6">
        {error && (
          <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ModelSelector
              label="Model"
              models={MODEL_TIERS}
              selectedId={selectedModel}
              onChange={setSelectedModel}
            />
            <button
              onClick={handleCompile}
              disabled={isCompiling}
              className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={16} className={isCompiling ? 'animate-spin' : ''} />
              Re-compile
            </button>
          </div>

          <button
            onClick={handleApprove}
            disabled={dimensionMap.variants.length === 0}
            className="flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check size={18} />
            {compiledPrompts.length > 0 ? 'Update & Continue' : 'Approve & Continue'}
          </button>
        </div>

        {compiledPrompts.length > 0 && (
          <p className="text-sm text-green-700">
            ✓ {compiledPrompts.length} {compiledPrompts.length === 1 ? 'variant' : 'variants'} ready for generation
          </p>
        )}
      </div>
    </div>
  );
}
