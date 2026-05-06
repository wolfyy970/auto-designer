/**
 * Structural glue templates — pure XML wrappers around {{VARIABLE}} placeholders.
 *
 * These templates contain ZERO behavioral guidance. All behavioral nuance
 * (how to interpret inputs, what to prioritize, quality expectations) lives
 * in the corresponding skill or system prompt:
 *
 * - Incubator nuance → packages/auto-designer-pi/prompts/gen-hypotheses.md
 * - Hypothesis nuance → packages/auto-designer-pi/skills/design-generation/SKILL.md
 *   + packages/auto-designer-pi/prompts/_designer-system.md
 *
 * If you need to add guidance about how inputs are interpreted, put it in the
 * skill, not here.
 */

export const INCUBATOR_USER_INPUTS_TEMPLATE = `Analyze the following design specification and produce global exploration axes with hypothesis strategies.

<specification>
{{INTERNAL_CONTEXT}}
</specification>

Produce the exploration-axis map as JSON.{{REFERENCE_DESIGNS_BLOCK}}{{EXISTING_HYPOTHESES_BLOCK}}{{INCUBATOR_HYPOTHESIS_COUNT_LINE}}`;

export const DESIGNER_HYPOTHESIS_INPUTS_TEMPLATE = `Generate a design implementing the following hypothesis, grounded in the specification context below.

<hypothesis>
<name>{{STRATEGY_NAME}}</name>
<bet>{{HYPOTHESIS}}</bet>
<rationale>{{RATIONALE}}</rationale>
<measurements>{{MEASUREMENTS}}</measurements>
<exploration_axes>
{{EXPLORATION_AXES}}
</exploration_axes>
<dimension_values>
{{DIMENSION_VALUES}}
</dimension_values>
</hypothesis>

<specification>

<design_brief>
{{DESIGN_BRIEF}}
</design_brief>

<research_context>
{{RESEARCH_CONTEXT}}
</research_context>

{{IMAGE_BLOCK}}

<objectives_metrics>
{{OBJECTIVES_METRICS}}
</objectives_metrics>

<design_constraints>
{{DESIGN_CONSTRAINTS}}
</design_constraints>

<design_system>
{{DESIGN_SYSTEM}}
</design_system>

</specification>`;
