// Loads the bundled OSS font (docs/SPEC.md §"Brand config": "One bundled
// OSS font as default (commit it; license file alongside)") for the
// composition. JetBrains Mono is already committed at
// public/fonts/jetbrains-mono/ (OFL.txt sits right next to the .woff2
// files). Runs once per Remotion bundle evaluation — registers all three
// weights the composition uses and blocks rendering until they're ready via
// delayRender/continueRender, which is how Remotion knows to wait for
// webfonts before it starts capturing frames.

import { continueRender, delayRender, staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";

export const FONT_FAMILY = "JetBrains Mono";

interface WeightSpec {
  weight: "400" | "500" | "700";
  file: string;
}

const WEIGHTS: WeightSpec[] = [
  { weight: "400", file: "JetBrainsMono-Regular.woff2" },
  { weight: "500", file: "JetBrainsMono-Medium.woff2" },
  { weight: "700", file: "JetBrainsMono-Bold.woff2" },
];

for (const { weight, file } of WEIGHTS) {
  const handle = delayRender(`loading ${FONT_FAMILY} ${weight}`);
  loadFont({
    family: FONT_FAMILY,
    url: staticFile(`fonts/jetbrains-mono/${file}`),
    weight,
    style: "normal",
    display: "swap",
  })
    .then(() => continueRender(handle))
    .catch((err: unknown) => {
      // Fail loudly rather than hanging the render forever on a broken font
      // path — matches the project's "fail loudly" posture elsewhere
      // (brandConfig's contrast check, facts.json's strict validation).
      console.error(`galley: failed to load ${FONT_FAMILY} ${weight}:`, err);
      continueRender(handle);
    });
}
