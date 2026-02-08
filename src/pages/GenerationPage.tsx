import GenerationPanel from '../components/generation/GenerationPanel';

export default function GenerationPage() {
  return (
    <div className="-mx-8 -my-6">
      <div className="mx-auto mb-6 max-w-6xl px-8 pt-6">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Variants</h1>
        <p className="text-sm text-gray-500">
          Generate and compare design variants based on your exploration strategies.
        </p>
      </div>
      <GenerationPanel />
    </div>
  );
}
