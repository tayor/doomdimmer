import { describe, expect, it } from "vitest";
import { PRESET_THRESHOLDS } from "../src/shared/defaults";
import { classifyDoomscroll, effectProgress } from "../src/shared/detector";

describe("doomscroll detector", () => {
  it("classifies rapid passive scrolling as reflection", () => {
    const result = classifyDoomscroll({
      continuousScrollMs: 190_000,
      timeSinceEngagementMs: 160_000,
      scrollEventsInWindow: 30,
      directionConsistency: 0.96,
      typing: false,
      hidden: false
    }, PRESET_THRESHOLDS.balanced);
    expect(result.stage).toBe("reflection");
    expect(result.score).toBeGreaterThanOrEqual(85);
  });

  it("does not trigger while reading slowly or typing", () => {
    expect(classifyDoomscroll({
      continuousScrollMs: 80_000,
      timeSinceEngagementMs: 80_000,
      scrollEventsInWindow: 2,
      directionConsistency: 0.55,
      typing: false,
      hidden: false
    }, PRESET_THRESHOLDS.balanced).stage).toBe("normal");

    expect(classifyDoomscroll({
      continuousScrollMs: 200_000,
      timeSinceEngagementMs: 200_000,
      scrollEventsInWindow: 40,
      directionConsistency: 1,
      typing: true,
      hidden: false
    }, PRESET_THRESHOLDS.balanced).stage).toBe("normal");
  });

  it("progresses visual effect intensity between thresholds", () => {
    const progress = effectProgress("blur", 150_000, PRESET_THRESHOLDS.balanced);
    expect(progress.grayscale).toBe(1);
    expect(progress.blur).toBeGreaterThan(0);
  });
});
