/**
 * Structural glue templates — pure XML wrappers around {{VARIABLE}} placeholders.
 *
 * Behavioral nuance is **not** authored in this file except by wiring substitution keys.
 * Source of truth for text:
 *
 * - Incubator nuance → packages/auto-designer-pi/prompts/gen-hypotheses.md
 * - Hypothesis-stage design instructions → packages/auto-designer-pi/prompts/design-agent-instructions.md
 *   (inlined via `{{DESIGN_AGENT_INSTRUCTIONS}}`)
 * - Design craft (hypothesis-aware quality lens) → packages/auto-designer-pi/skills/design-quality/SKILL.md
 * - Sandbox + artifact-output constraints → packages/auto-designer-pi/prompts/_designer-system.md
 *
 * To change how inputs are interpreted, edit the bundled prompt or skill, not the XML
 * layout here.
 */

export const INCUBATOR_USER_INPUTS_TEMPLATE = `Analyze the following design specification and produce global exploration axes with hypothesis strategies.

<specification>
{{INTERNAL_CONTEXT}}
</specification>

Produce the exploration-axis map as JSON.{{REFERENCE_DESIGNS_BLOCK}}{{EXISTING_HYPOTHESES_BLOCK}}{{INCUBATOR_HYPOTHESIS_COUNT_LINE}}`;

export const DESIGNER_HYPOTHESIS_INPUTS_TEMPLATE = `The sections below supply one hypothesis, product execution instructions, and the full specification—in that order.

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

<design_agent_instructions>
{{DESIGN_AGENT_INSTRUCTIONS}}
</design_agent_instructions>

<specification>

<design_brief>
{{DESIGN_BRIEF}}
</design_brief>

<research_context>
{{RESEARCH_CONTEXT}}
</research_context>

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
