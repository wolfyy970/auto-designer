import { useNavigate } from 'react-router-dom';
import { RefreshCw, ArrowRight } from 'lucide-react';
import { SPEC_SECTIONS } from '../../lib/constants';
import { useSpecStore } from '../../stores/spec-store';
import { useCompilerStore, selectDimensionMap } from '../../stores/compiler-store';
import { compileSpec } from '../../services/compiler';
import SectionEditor from './SectionEditor';
import ReferenceImageUpload from './ReferenceImageUpload';
import ModelSelector from '../shared/ModelSelector';
import ProviderSelector from '../generation/ProviderSelector';

/** Key used for dimension maps created from non-canvas views */
const DEFAULT_NODE_KEY = 'default';

export default function SpecEditor() {
  const navigate = useNavigate();
  const spec = useSpecStore((s) => s.spec);
  const dimensionMap = useCompilerStore(selectDimensionMap);
  const isCompiling = useCompilerStore((s) => s.isCompiling);
  const error = useCompilerStore((s) => s.error);
  const setDimensionMapForNode = useCompilerStore((s) => s.setDimensionMapForNode);
  const setCompiling = useCompilerStore((s) => s.setCompiling);
  const setError = useCompilerStore((s) => s.setError);
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
      // Navigate to exploration space after successful compile
      navigate('/compiler');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compilation failed');
    } finally {
      setCompiling(false);
    }
  };

  return (
    <div className="space-y-8">
      {SPEC_SECTIONS.map((meta) => (
        <div key={meta.id}>
          <SectionEditor meta={meta} />
          {meta.id === 'existing-design' && (
            <ReferenceImageUpload sectionId="existing-design" />
          )}
        </div>
      ))}

      {/* Compile Section */}
      <div className="border-t border-gray-200 pt-8">
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-6">
          <h3 className="mb-2 text-base font-semibold text-gray-900">
            Ready to explore variants?
          </h3>
          <p className="mb-6 text-sm text-gray-600">
            Compile your spec to generate an exploration space with variant strategies.
          </p>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center gap-4">
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
              className="flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCompiling ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Compiling...
                </>
              ) : (
                <>
                  Compile Spec
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {dimensionMap && !isCompiling && (
              <button
                onClick={() => navigate('/compiler')}
                className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-white"
              >
                View Exploration Space
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
