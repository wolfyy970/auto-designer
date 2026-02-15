import DimensionMapView from '../components/dimension-map/DimensionMapView';

export default function CompilerPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-xl font-semibold text-fg">
        Exploration Space
      </h1>
      <p className="mb-6 text-sm text-fg-secondary">
        Define the variant strategies to explore. Review and edit before generating designs.
      </p>
      <DimensionMapView />
    </div>
  );
}
