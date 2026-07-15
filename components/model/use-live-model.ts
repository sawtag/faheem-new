"use client";

import * as React from "react";
import { BASE_ASSUMPTIONS, buildModel } from "@/lib/model/compute";
import { validateEdit } from "@/lib/model/edit-parser";
import type { Assumptions, ModelKey, ModelOutputs } from "@/lib/model/types";

/** Immutably set a dotted assumption path, "g" (scalar) or "ordersGrowth.0"
 * (array index). The key scheme mirrors provenance `assumptionKey`, so a
 * Methodology chip / a WS-C conversational edit and a grid stepper all drive
 * the same entry point. */
function withAssumption(
  a: Assumptions,
  key: string,
  value: number,
): Assumptions {
  const dot = key.indexOf(".");
  if (dot === -1) return { ...a, [key]: value };
  const field = key.slice(0, dot) as keyof Assumptions;
  const idx = Number(key.slice(dot + 1));
  const arr = [...(a[field] as number[])];
  arr[idx] = value;
  return { ...a, [field]: arr };
}

const EPS = 1e-9;

/** ModelKeys whose value moved between two node graphs (float-noise tolerant). */
function changedNodeKeys(
  prev: ModelOutputs["nodes"],
  next: ModelOutputs["nodes"],
): ModelKey[] {
  const out: ModelKey[] = [];
  for (const key in next) {
    const p = prev[key];
    const n = next[key];
    if (!p || !n) continue;
    if (Math.abs(p.value - n.value) > EPS) out.push(key);
  }
  return out;
}

export interface LiveModelDiff {
  keys: ModelKey[];
  count: number;
  /** bumps on every recompute that moved ≥1 value, drives the toast + cell wash */
  nonce: number;
}

export interface LiveModel {
  assumptions: Assumptions;
  outputs: ModelOutputs;
  /** set one assumption in Assumptions-native units (decimals for rates) and recompute */
  setAssumption: (key: string, value: number) => void;
  reset: () => void;
  lastDiff: LiveModelDiff;
  /** the changed set of the most recent recompute (Set(lastDiff.keys)) */
  changedKeys: Set<ModelKey>;
  isBase: boolean;
}

/**
 * The Live Model state hook (WS-B). Holds `Assumptions`; every edit rebuilds
 * the pure model via `buildModel` (instant, offline) and diffs the flat node
 * values against the previous graph so changed cells can count-up and the
 * "N values updated" chip can surface. The API, `{ assumptions, outputs,
 * setAssumption, reset, lastDiff }`, is the contract WS-C's conversational
 * edits reuse to drive the same recompute path.
 */
export function useLiveModel(): LiveModel {
  const [assumptions, setAssumptions] =
    React.useState<Assumptions>(BASE_ASSUMPTIONS);
  const outputs = React.useMemo(() => buildModel(assumptions), [assumptions]);

  const prevNodesRef = React.useRef(outputs.nodes);
  const [lastDiff, setLastDiff] = React.useState<LiveModelDiff>({
    keys: [],
    count: 0,
    nonce: 0,
  });

  React.useEffect(() => {
    const prev = prevNodesRef.current;
    if (prev === outputs.nodes) return; // first render / no change
    const keys = changedNodeKeys(prev, outputs.nodes);
    prevNodesRef.current = outputs.nodes;
    if (keys.length > 0) {
      setLastDiff((d) => ({ keys, count: keys.length, nonce: d.nonce + 1 }));
    }
  }, [outputs]);

  const setAssumption = React.useCallback((key: string, value: number) => {
    // same hard gate as /api/model-edit: whitelist + sane-bounds clamp, so a
    // grid stepper can't drive an assumption somewhere the engine can't
    // survive (e.g. terminal growth past WACC → Gordon TV blows up)
    const valid = validateEdit(key, value);
    if (!valid) return;
    setAssumptions((prev) => withAssumption(prev, key, valid.value));
  }, []);

  const reset = React.useCallback(() => setAssumptions(BASE_ASSUMPTIONS), []);

  const changedKeys = React.useMemo(() => new Set(lastDiff.keys), [lastDiff]);

  return {
    assumptions,
    outputs,
    setAssumption,
    reset,
    lastDiff,
    changedKeys,
    isBase: assumptions === BASE_ASSUMPTIONS,
  };
}
