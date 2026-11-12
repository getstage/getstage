export function formatCreditsUsedLabel(usedTotal: number, granted: number) {
  if (granted <= 0 || usedTotal <= 0) {
    return "0% used";
  }

  const exactPercent = (usedTotal / granted) * 100;
  if (exactPercent < 1) {
    return "<1% used";
  }

  return `${Math.round(exactPercent)}% used`;
}

export function creditsUsedBarWidth(usedTotal: number, granted: number) {
  if (granted <= 0 || usedTotal <= 0) {
    return 0;
  }

  const exactPercent = (usedTotal / granted) * 100;
  return Math.min(100, exactPercent < 1 ? 2 : exactPercent);
}

export function formatCreditsAmount(credits: number) {
  return `${credits.toLocaleString()} credit${credits === 1 ? "" : "s"}`;
}
