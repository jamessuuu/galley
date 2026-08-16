// The Remotion bundle entry point (docs/SPEC.md §"CLI surface": "Local
// rendering via @remotion/bundler + @remotion/renderer. No cloud, no
// keys."). @remotion/bundler's bundle() points at this file; it is never
// run directly by Node — the CLI (src/cli/index.ts) never imports it,
// bundleCompositionEntry (src/render/renderPipeline.ts) does.

import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root.js";

registerRoot(RemotionRoot);
