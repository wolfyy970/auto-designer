import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { useCanvasStore } from '../../../stores/canvas-store';
import type { ModelNodeData } from '../../../types/canvas-data';
import { DEFAULT_COMPILER_PROVIDER } from '../../../lib/constants';
import { useNodeProviderModel } from '../../../hooks/useNodeProviderModel';
import ProviderSelector from '../../shared/ProviderSelector';
import ModelSelector from '../../shared/ModelSelector';
import NodeShell from './NodeShell';
import NodeHeader from './NodeHeader';

type ModelNodeType = Node<ModelNodeData, 'model'>;

function ModelNode({ id, selected }: NodeProps<ModelNodeType>) {
  const removeNode = useCanvasStore((s) => s.removeNode);

  const {
    providerId,
    modelId,
    handleProviderChange,
    handleModelChange,
  } = useNodeProviderModel(DEFAULT_COMPILER_PROVIDER, id, { disconnectOnChange: false });

  const configured = !!modelId;

  const status = configured ? 'filled' as const : 'empty' as const;

  return (
    <NodeShell
      nodeId={id}
      nodeType="model"
      selected={!!selected}
      width="w-node"
      status={status}
      hasTarget={false}
      handleColor={configured ? 'green' : 'amber'}
    >
      <NodeHeader
        onRemove={() => removeNode(id)}
        description={configured ? `${providerId} / ${modelId.split('/').pop()}` : 'No model selected'}
      >
        <h3 className="text-xs font-semibold text-fg">Model</h3>
      </NodeHeader>

      <div className="nodrag nowheel space-y-2 px-3 py-2.5">
        <ProviderSelector
          label="Provider"
          selectedId={providerId}
          onChange={handleProviderChange}
        />
        <ModelSelector
          label="Model"
          providerId={providerId}
          selectedModelId={modelId}
          onChange={handleModelChange}
        />
      </div>
    </NodeShell>
  );
}

export default memo(ModelNode);
