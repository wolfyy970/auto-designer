# User Guide

## Setup

```bash
pnpm install
cp .env.example .env.local
```

Add your API key to `.env.local`:
```
VITE_OPENROUTER_API_KEY=sk-or-...
```

One key powers everything -- compiler and generation. Get one at [openrouter.ai](https://openrouter.ai). Alternatively, enter the key via the Settings panel (gear icon in the header). Keys entered there are stored in localStorage.

```bash
pnpm dev
```

## Writing a Spec

Navigate to `/editor`. The 8-section editor is the primary workspace.

**Start with Need & Insight.** This is the most important input -- it determines whether you're exploring the right space. Everything else supports this.

**Write in prose, not bullets.** The act of writing forces precision. "WCAG AA" as a checkbox is meaningless. "All form inputs need visible labels not just placeholders, error states must use both color and text" is a specification.

**Existing Design is optional** -- skip it for greenfield work. When present, upload screenshots and describe what's working and what's failing.

**Exploration Space defines the search dimensions.** For each dimension, define a range:
> "Copy length: 10-40 words. Must not use urgency framing. Can vary in tone from clinical to conversational."

Tighter ranges = more focused exploration. Looser ranges = more divergent.

### Reference Images

Drag-and-drop screenshots onto the Existing Design section. Add a description explaining what the image shows and what role it plays (current state, competitor reference, etc.). Images are passed to vision-capable providers during generation.

## Compiling

At the bottom of the Spec Editor:
1. Select a **provider** (OpenRouter or LM Studio)
2. Select a **model** from the available tiers for that provider
3. Click **Compile Spec**

This automatically navigates to the Exploration Space (`/compiler`) where you'll see:

- **Dimensions** -- the variables identified from your Exploration Space section
- **Variant strategies** -- 4-6 coherent plans, each making a different bet about what matters most

Review each strategy. The exploration space is editable:
- Rename strategies to something meaningful
- Edit rationales if the LLM misinterpreted your spec
- Remove strategies that aren't worth exploring
- Add a manual strategy if you have a specific idea
- Reorder to prioritize

Click **Approve & Continue** when satisfied. This compiles strategies into full generation prompts and enables the Variants page.

## Generating Variants

After approving the exploration space, navigate to Variants (`/generation`).

1. Choose a **provider** (OpenRouter or LM Studio)
2. Choose a **model** from the available tiers for that provider
3. Choose **output format** (HTML or React)
4. Click **Generate Variants**

Variants generate in parallel. Each renders in a full-width tab once complete.

**Tab navigation** appears at the top - click a strategy name to view its generated variant. Toggle between Preview and Source views using the buttons above the preview.

**Responsive previews:** Each variant uses the full viewport width, so you can see how designs adapt to the screen size.

## Managing Specs

Click **Specs** in the header to open the Spec Manager:

- **Save Current** -- snapshot the active spec to localStorage
- **New Spec** -- saves the current spec, creates a blank one
- **Duplicate** -- creates a copy for iteration
- **Export JSON** -- downloads the spec as a `.json` file
- **Import JSON** -- loads a previously exported spec
- **Load** -- switch to a saved spec
- **Delete** -- remove a saved spec from localStorage
