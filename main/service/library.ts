import * as os from "node:os";
import { platform } from "~/lib/utils.ts";
import type { LibraryRule } from "~/types/minecraft.ts";

export function librariesRule(rules?: LibraryRule[]): boolean {
  if (!rules?.length) return true;

  let allowed = false;

  for (const rule of rules) {
    const { os: ruleOs } = rule;

    if (ruleOs) {
      if (ruleOs.name && ruleOs.name !== platform()) continue;
      if (ruleOs.arch && ruleOs.arch !== os.arch()) continue;
      if (ruleOs.version && !new RegExp(ruleOs.version).test(os.release())) {
        continue;
      }
    }

    if (rule.features && Object.keys(rule.features).length > 0) {
      continue;
    }

    allowed = rule.action === "allow";
  }

  return allowed;
}
