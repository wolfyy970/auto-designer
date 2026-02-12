import SectionNode from './SectionNode';
import CompilerNode from './CompilerNode';
import HypothesisNode from './HypothesisNode';
import GeneratorNode from './GeneratorNode';
import VariantNode from './VariantNode';
import CritiqueNode from './CritiqueNode';

export const nodeTypes = {
  designBrief: SectionNode,
  existingDesign: SectionNode,
  researchContext: SectionNode,
  objectivesMetrics: SectionNode,
  designConstraints: SectionNode,
  compiler: CompilerNode,
  hypothesis: HypothesisNode,
  generator: GeneratorNode,
  variant: VariantNode,
  critique: CritiqueNode,
};
