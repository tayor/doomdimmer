import type { DetectionThresholds, InterventionStage } from "./types";

export interface DetectorInput {
  continuousScrollMs: number;
  timeSinceEngagementMs: number;
  scrollEventsInWindow: number;
  directionConsistency: number;
  typing: boolean;
  hidden: boolean;
}

export interface DetectorResult {
  score: number;
  stage: InterventionStage;
}

export function classifyDoomscroll(input: DetectorInput, thresholds: DetectionThresholds): DetectorResult {
  if (input.hidden || input.typing) return { score: 0, stage: "normal" };
  const continuous = ratio(input.continuousScrollMs, thresholds.minContinuousScrollMs) * 35;
  const noEngagement = ratio(input.timeSinceEngagementMs, thresholds.noEngagementMs) * 30;
  const density = ratio(input.scrollEventsInWindow, thresholds.scrollEventsPerWindow) * 20;
  const consistency = Math.max(0, Math.min(1, input.directionConsistency)) * 15;
  const score = Math.round(Math.min(100, continuous + noEngagement + density + consistency));
  const denseEnough = input.scrollEventsInWindow >= Math.ceil(thresholds.scrollEventsPerWindow * 0.55);

  if (denseEnough && input.continuousScrollMs >= thresholds.reflectionStartMs && score >= 85) return { score, stage: "reflection" };
  if (denseEnough && input.continuousScrollMs >= thresholds.blurStartMs && score >= 72) return { score, stage: "blur" };
  if (denseEnough && input.continuousScrollMs >= thresholds.grayscaleStartMs && score >= 58) return { score, stage: "grayscale" };
  if (denseEnough && input.continuousScrollMs >= thresholds.minContinuousScrollMs && score >= 40) return { score, stage: "watching" };
  return { score, stage: "normal" };
}

export function effectProgress(stage: InterventionStage, continuousScrollMs: number, thresholds: DetectionThresholds): { grayscale: number; blur: number } {
  if (stage === "normal" || stage === "watching" || stage === "disabled" || stage === "paused" || stage === "cooldown") {
    return { grayscale: 0, blur: 0 };
  }
  const grayscale = clamp((continuousScrollMs - thresholds.grayscaleStartMs) / Math.max(1, thresholds.blurStartMs - thresholds.grayscaleStartMs));
  const blur = stage === "grayscale" ? 0 : clamp((continuousScrollMs - thresholds.blurStartMs) / Math.max(1, thresholds.reflectionStartMs - thresholds.blurStartMs));
  return { grayscale, blur };
}

function ratio(value: number, target: number): number {
  return Math.max(0, Math.min(1, value / Math.max(1, target)));
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
