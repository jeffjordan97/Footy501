<script setup lang="ts">
import { ref, computed } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';

export interface ShareTurn {
  readonly playerIndex: 0 | 1;
  readonly scoreAfter: number;
  readonly result: string;
  readonly statValue: number | null;
  readonly footballerName: string | null;
}

export interface ShareLeg {
  readonly turns: readonly ShareTurn[];
}

interface Props {
  categoryName: string;
  targetScore: number;
  finalScore: number;
  turnsTaken: number;
  isWinner: boolean;
  /** Turns from the current/only leg (for 1P arrow chain) */
  turns?: readonly ShareTurn[];
  /** All legs (for 2P match summary) */
  legs?: readonly ShareLeg[];
  player1Name?: string;
  player2Name?: string;
  legWins?: readonly [number, number];
  matchFormat?: number;
  opponentName?: string;
  opponentScore?: number;
  footballersNamed: string[];
  isDaily?: boolean;
  date?: string;
}

const props = withDefaults(defineProps<Props>(), {
  isDaily: false,
  targetScore: 501,
});

const shareFeedback = ref<string | null>(null);
const downloading = ref(false);
const sharing = ref(false);

const SOLO_PLAYER2_NAMES = new Set(['Target', 'Practice Mode']);
const isSoloMode = computed(() =>
  SOLO_PLAYER2_NAMES.has(props.player2Name ?? '') || SOLO_PLAYER2_NAMES.has(props.opponentName ?? ''),
);

// --- Arrow chain for 1P / solo ---

const arrowChain = computed(() => {
  if (!props.turns || props.turns.length === 0) return null;

  // Filter to player 1 turns only in solo mode, all turns otherwise
  const relevantTurns = isSoloMode.value
    ? props.turns.filter((t) => t.playerIndex === 0)
    : props.turns;

  const segments: string[] = [String(props.targetScore)];

  for (const turn of relevantTurns) {
    if (turn.result.startsWith('BUST_') || turn.result === 'DUPLICATE_PLAYER') {
      segments.push('\uD83D\uDCA5');
    } else if (turn.result === 'TIMEOUT') {
      segments.push('\u23F0');
    } else if (turn.result === 'CHECKOUT') {
      segments.push('\u2705');
    } else {
      segments.push(String(turn.scoreAfter));
    }
  }

  return segments.join('\u2192');
});

const bustCount = computed(() => {
  if (!props.turns) return 0;
  const relevantTurns = isSoloMode.value
    ? props.turns.filter((t) => t.playerIndex === 0)
    : props.turns;
  return relevantTurns.filter((t) => t.result.startsWith('BUST_') || t.result === 'DUPLICATE_PLAYER').length;
});

const timeoutCount = computed(() => {
  if (!props.turns) return 0;
  const relevantTurns = isSoloMode.value
    ? props.turns.filter((t) => t.playerIndex === 0)
    : props.turns;
  return relevantTurns.filter((t) => t.result === 'TIMEOUT').length;
});

const player1TurnCount = computed(() => {
  if (!props.turns) return props.turnsTaken;
  return props.turns.filter((t) => t.playerIndex === 0).length;
});

// --- 2P match leg summary ---

const legSummaries = computed(() => {
  if (!props.legs || props.legs.length === 0) return null;

  return props.legs.map((leg, i) => {
    const p1Turns = leg.turns.filter((t) => t.playerIndex === 0);
    const p2Turns = leg.turns.filter((t) => t.playerIndex === 1);
    const p1Busts = p1Turns.filter((t) => t.result.startsWith('BUST_')).length;
    const p2Busts = p2Turns.filter((t) => t.result.startsWith('BUST_')).length;
    const checkoutTurn = leg.turns.find((t) => t.result === 'CHECKOUT');
    const winnerIndex = checkoutTurn?.playerIndex ?? null;
    const winnerName = winnerIndex === 0 ? (props.player1Name ?? 'Player 1')
      : winnerIndex === 1 ? (props.player2Name ?? 'Player 2')
      : null;

    const turnCount = winnerIndex === 0 ? p1Turns.length : p2Turns.length;
    const bustCountForWinner = winnerIndex === 0 ? p1Busts : p2Busts;

    return {
      legNumber: i + 1,
      winnerName,
      turnCount,
      bustCount: bustCountForWinner,
    };
  });
});

// --- Share text ---

const shareText = computed(() => {
  const lines: string[] = [];

  // Header
  if (props.isDaily) {
    lines.push(`Footy 501 \uD83C\uDFAF Daily${props.date ? ` - ${props.date}` : ''}`);
  } else if (!isSoloMode.value && props.matchFormat && props.matchFormat > 1) {
    lines.push(`Footy 501 \uD83C\uDFAF Best of ${props.matchFormat}`);
  } else {
    lines.push('Footy 501 \uD83C\uDFAF');
  }

  lines.push(props.categoryName);
  lines.push('');

  // 1P: arrow chain
  if (isSoloMode.value && arrowChain.value) {
    lines.push(arrowChain.value);
    lines.push('');
    const stats: string[] = [`${player1TurnCount.value} turns`];
    if (bustCount.value > 0) stats.push(`${bustCount.value} bust${bustCount.value > 1 ? 's' : ''}`);
    if (timeoutCount.value > 0) stats.push(`${timeoutCount.value} timeout${timeoutCount.value > 1 ? 's' : ''}`);
    lines.push(stats.join(' | '));
  }
  // 2P: leg summaries
  else if (!isSoloMode.value && legSummaries.value && legSummaries.value.length > 0) {
    for (const leg of legSummaries.value) {
      const bustStr = leg.bustCount > 0 ? `, ${leg.bustCount} bust${leg.bustCount > 1 ? 's' : ''}` : '';
      lines.push(`Leg ${leg.legNumber}: ${leg.winnerName ?? '?'} \u2705 (${leg.turnCount} turns${bustStr})`);
    }

    if (props.legWins && props.player1Name && props.player2Name) {
      const winnerName = (props.legWins[0] > props.legWins[1]) ? props.player1Name : props.player2Name;
      lines.push('');
      lines.push(`${winnerName} wins ${props.legWins[0]}-${props.legWins[1]}! \uD83C\uDFC6`);
    }
  }
  // Fallback: simple score
  else {
    lines.push(`Score: ${props.finalScore} in ${props.turnsTaken} turns`);
  }

  lines.push('');
  lines.push('footy501.vercel.app');
  return lines.join('\n');
});

// --- Visual scorecard rows ---

interface ScorecardRow {
  readonly footballerName: string;
  readonly statValue: number;
  readonly scoreAfter: number;
  readonly result: string;
  readonly isBust: boolean;
  readonly isCheckout: boolean;
  readonly isTimeout: boolean;
}

const scorecardRows = computed<readonly ScorecardRow[]>(() => {
  if (!props.turns || props.turns.length === 0) return [];

  const relevantTurns = isSoloMode.value
    ? props.turns.filter((t) => t.playerIndex === 0)
    : props.turns;

  return relevantTurns.map((t) => ({
    footballerName: t.footballerName ?? 'Unknown',
    statValue: t.statValue ?? 0,
    scoreAfter: t.scoreAfter,
    result: t.result,
    isBust: t.result.startsWith('BUST_') || t.result === 'DUPLICATE_PLAYER',
    isCheckout: t.result === 'CHECKOUT',
    isTimeout: t.result === 'TIMEOUT',
  }));
});

// --- Canvas rendering (iPhone 14 Pro dimensions @ 3x resolution) ---

function renderCardToCanvas(): HTMLCanvasElement {
  // iPhone 14 Pro: 1170 x 2532 pixels (390 x 844 logical @ 3x)
  const W = 1170;
  const H = 2532;
  const S = 3; // scale factor — all sizes are in logical pixels multiplied by S

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const rows = scorecardRows.value;

  // --- Background ---
  ctx.fillStyle = '#0A0F0D';
  ctx.fillRect(0, 0, W, H);

  // Subtle green gradient at top
  const grad = ctx.createLinearGradient(0, 0, 0, 400 * S);
  grad.addColorStop(0, 'rgba(21, 128, 61, 0.12)');
  grad.addColorStop(1, 'rgba(21, 128, 61, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 400 * S);

  // Pitch centre circle — positioned in the lower half so it's hidden behind header
  const circleY = H * 0.6;
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2 * S;
  ctx.beginPath();
  ctx.arc(W / 2, circleY, 160 * S, 0, Math.PI * 2);
  ctx.stroke();
  // Centre dot
  ctx.beginPath();
  ctx.arc(W / 2, circleY, 4 * S, 0, Math.PI * 2);
  ctx.fillStyle = '#E2E8F0';
  ctx.fill();
  // Halfway line
  ctx.setLineDash([8 * S, 6 * S]);
  ctx.lineWidth = 1.5 * S;
  ctx.beginPath();
  ctx.moveTo(0, circleY);
  ctx.lineTo(W, circleY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Ensure full opacity for everything drawn from here on
  ctx.globalAlpha = 1;

  // --- Header ---
  ctx.textAlign = 'center';

  // Title — large, top of canvas
  ctx.fillStyle = '#E2E8F0';
  ctx.font = `bold 120px sans-serif`;
  ctx.fillText('Footy 501', W / 2, 180);

  // Daily badge
  let subtitleY = 270;
  if (props.isDaily) {
    ctx.fillStyle = '#D97706';
    ctx.font = `bold 42px sans-serif`;
    ctx.fillText(`DAILY CHALLENGE${props.date ? `  \u00B7  ${props.date}` : ''}`, W / 2, subtitleY);
    subtitleY += 70;
  }

  // Category name
  ctx.fillStyle = '#94A3B8';
  ctx.font = `48px sans-serif`;
  ctx.fillText(props.categoryName, W / 2, subtitleY);

  // Divider
  const divY = subtitleY + 50;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(180, divY);
  ctx.lineTo(W - 180, divY);
  ctx.stroke();

  // --- Vertical arrow flow ---
  const SCORECARD_TOP = divY + 60;

  if (rows.length > 0) {
    const CARD_W = 900;
    const CARD_H = 150;
    const CARD_X = (W - CARD_W) / 2;
    const ARROW_GAP = 50;

    // Starting score card (target)
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    roundRect(ctx, CARD_X, SCORECARD_TOP, CARD_W, CARD_H, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 3;
    roundRect(ctx, CARD_X, SCORECARD_TOP, CARD_W, CARD_H, 20);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = `36px sans-serif`;
    ctx.fillText('START', W / 2, SCORECARD_TOP + 55);
    ctx.fillStyle = '#E2E8F0';
    ctx.font = `bold 72px monospace`;
    ctx.fillText(String(props.targetScore), W / 2, SCORECARD_TOP + 120);

    let y = SCORECARD_TOP + CARD_H;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;

      // --- Arrow between cards ---
      const arrowX = W / 2;
      const arrowTop = y + 5;
      const arrowHeadY = y + ARROW_GAP - 5;

      const arrowColor = row.isBust ? '#DC2626' : row.isCheckout ? '#22C55E' : '#94A3B8';

      ctx.strokeStyle = arrowColor;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowTop);
      ctx.lineTo(arrowX, arrowHeadY - 12);
      ctx.stroke();

      // Arrowhead triangle
      ctx.fillStyle = arrowColor;
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowHeadY);
      ctx.lineTo(arrowX - 14, arrowHeadY - 18);
      ctx.lineTo(arrowX + 14, arrowHeadY - 18);
      ctx.closePath();
      ctx.fill();

      y += ARROW_GAP;

      // --- Card ---
      if (row.isBust) {
        ctx.fillStyle = 'rgba(220, 38, 38, 0.15)';
        ctx.strokeStyle = '#DC2626';
      } else if (row.isCheckout) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.18)';
        ctx.strokeStyle = '#22C55E';
      } else if (row.isTimeout) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
        ctx.strokeStyle = '#F59E0B';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      }
      ctx.lineWidth = 3;
      roundRect(ctx, CARD_X, y, CARD_W, CARD_H, 20);
      ctx.fill();
      roundRect(ctx, CARD_X, y, CARD_W, CARD_H, 20);
      ctx.stroke();

      // Turn number (left)
      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748B';
      ctx.font = `bold 32px monospace`;
      ctx.fillText(String(i + 1).padStart(2, '0'), CARD_X + 40, y + 90);

      // Footballer name
      const name = row.isTimeout ? 'Timed out' : row.footballerName;
      const maxNameChars = 22;
      const displayName = name.length > maxNameChars ? name.slice(0, maxNameChars - 1) + '\u2026' : name;

      ctx.fillStyle = row.isBust ? '#DC2626' : row.isCheckout ? '#22C55E' : row.isTimeout ? '#94A3B8' : '#E2E8F0';
      ctx.font = row.isCheckout ? `bold 44px sans-serif` : row.isTimeout ? `italic 40px sans-serif` : `500 44px sans-serif`;
      ctx.fillText(displayName, CARD_X + 130, y + 60);

      // Stat deduction (under name)
      if (!row.isTimeout) {
        ctx.fillStyle = row.isBust ? 'rgba(220, 38, 38, 0.8)' : '#94A3B8';
        ctx.font = `32px monospace`;
        ctx.fillText(`-${row.statValue}`, CARD_X + 130, y + 110);
      }

      // Remaining score (right, large)
      ctx.textAlign = 'right';
      ctx.font = `bold 72px monospace`;
      if (row.isBust) {
        ctx.fillStyle = '#DC2626';
      } else if (row.isCheckout) {
        ctx.fillStyle = '#22C55E';
      } else {
        ctx.fillStyle = '#E2E8F0';
      }
      const scoreLabel = row.isCheckout ? '0' : String(row.scoreAfter);
      ctx.fillText(scoreLabel, CARD_X + CARD_W - 40, y + 100);

      y += CARD_H;
    }

    // --- Final result block ---
    y += 80;

    ctx.textAlign = 'center';
    const hasCheckout = rows.some((r) => r.isCheckout);
    if (hasCheckout) {
      ctx.fillStyle = '#22C55E';
      ctx.font = `bold 96px sans-serif`;
      ctx.fillText('CHECKOUT', W / 2, y);
      y += 30;
    } else {
      ctx.fillStyle = '#94A3B8';
      ctx.font = `40px sans-serif`;
      ctx.fillText('FINAL SCORE', W / 2, y);
      ctx.fillStyle = '#E2E8F0';
      ctx.font = `bold 110px monospace`;
      ctx.fillText(String(props.finalScore), W / 2, y + 100);
      y += 110;
    }

    // Turn count
    y += 60;
    ctx.fillStyle = '#E2E8F0';
    ctx.font = `bold 48px sans-serif`;
    const turnsLabel = player1TurnCount.value === 1 ? '1 try' : `${player1TurnCount.value} tries`;
    ctx.fillText(turnsLabel, W / 2, y);

    // Extra stats
    const extra: string[] = [];
    if (bustCount.value > 0) extra.push(`${bustCount.value} bust${bustCount.value > 1 ? 's' : ''}`);
    if (timeoutCount.value > 0) extra.push(`${timeoutCount.value} timeout${timeoutCount.value > 1 ? 's' : ''}`);
    if (extra.length > 0) {
      y += 50;
      ctx.fillStyle = '#94A3B8';
      ctx.font = `36px sans-serif`;
      ctx.fillText(extra.join('  \u00B7  '), W / 2, y);
    }
  } else {
    // Fallback: big score
    const scoreColor = props.isWinner ? '#22C55E' : '#DC2626';
    ctx.fillStyle = scoreColor;
    ctx.font = `bold 180px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(String(props.finalScore), W / 2, SCORECARD_TOP + 180);

    ctx.fillStyle = '#94A3B8';
    ctx.font = `48px sans-serif`;
    ctx.fillText(`in ${props.turnsTaken} turns`, W / 2, SCORECARD_TOP + 260);
  }

  // --- Footer ---
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94A3B8';
  ctx.font = `36px sans-serif`;
  ctx.fillText('footy501.vercel.app', W / 2, H - 80);

  return canvas;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create image blob'));
      },
      'image/png',
    );
  });
}

function downloadImage(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function handleDownload(): Promise<void> {
  downloading.value = true;
  try {
    const canvas = renderCardToCanvas();
    const blob = await canvasToBlob(canvas);
    const datePart = props.date ?? new Date().toISOString().split('T')[0];
    downloadImage(blob, `footy501-${datePart}.png`);
  } catch {
    shareFeedback.value = 'Failed to download image.';
    setTimeout(() => { shareFeedback.value = null; }, 3000);
  } finally {
    downloading.value = false;
  }
}

async function handleShare(): Promise<void> {
  sharing.value = true;
  try {
    const canvas = renderCardToCanvas();
    const blob = await canvasToBlob(canvas);
    const file = new File([blob], 'footy501.png', { type: 'image/png' });

    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      await navigator.share({ text: shareText.value, files: [file] });
    } else if (typeof navigator.share === 'function') {
      await navigator.share({ text: shareText.value });
    } else {
      await navigator.clipboard.writeText(shareText.value);
      shareFeedback.value = 'Copied to clipboard!';
      setTimeout(() => { shareFeedback.value = null; }, 2000);
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return;
    try {
      await navigator.clipboard.writeText(shareText.value);
      shareFeedback.value = 'Copied to clipboard!';
      setTimeout(() => { shareFeedback.value = null; }, 2000);
    } catch {
      shareFeedback.value = 'Could not share. Try copying manually.';
      setTimeout(() => { shareFeedback.value = null; }, 3000);
    }
  } finally {
    sharing.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col items-center gap-4 w-full">
    <!-- Visual scorecard -->
    <div v-if="scorecardRows.length > 0" class="w-full max-w-sm">
      <!-- Starting score -->
      <div class="flex items-center justify-center gap-2 mb-2">
        <span class="font-mono text-2xl font-bold text-text tabular-nums">{{ targetScore }}</span>
      </div>

      <!-- Turn rows -->
      <div class="flex flex-col gap-1">
        <div
          v-for="(row, i) in scorecardRows"
          :key="i"
          class="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm"
          :class="{
            'bg-danger/10 border border-danger/20': row.isBust,
            'bg-success/10 border border-success/20': row.isCheckout,
            'bg-bg-elevated/50 border border-transparent': !row.isBust && !row.isCheckout && !row.isTimeout,
            'bg-warning/10 border border-warning/20': row.isTimeout,
          }"
        >
          <!-- Arrow indicator -->
          <span class="text-text-muted text-xs w-4 shrink-0 text-center">
            <template v-if="row.isBust">&#x1F4A5;</template>
            <template v-else-if="row.isCheckout">&#x2705;</template>
            <template v-else-if="row.isTimeout">&#x23F0;</template>
            <template v-else>&#x2192;</template>
          </span>

          <!-- Footballer name -->
          <span
            class="flex-1 truncate text-xs"
            :class="{
              'text-danger line-through': row.isBust,
              'text-primary-light font-semibold': row.isCheckout,
              'text-text-muted italic': row.isTimeout,
              'text-text': !row.isBust && !row.isCheckout && !row.isTimeout,
            }"
          >
            {{ row.isTimeout ? 'Timeout' : row.footballerName }}
          </span>

          <!-- Stat value -->
          <span
            v-if="!row.isTimeout"
            class="font-mono text-xs tabular-nums shrink-0"
            :class="row.isBust ? 'text-danger/70' : 'text-text-muted'"
          >
            -{{ row.statValue }}
          </span>

          <!-- Remaining score -->
          <span
            class="font-mono text-xs font-semibold tabular-nums w-8 text-right shrink-0"
            :class="{
              'text-danger': row.isBust,
              'text-primary-light': row.isCheckout,
              'text-text': !row.isBust && !row.isCheckout,
            }"
          >
            {{ row.scoreAfter }}
          </span>
        </div>
      </div>

      <!-- Summary stats -->
      <div class="flex items-center justify-center gap-3 mt-3 text-xs text-text-muted">
        <span class="font-mono tabular-nums">{{ player1TurnCount }} turns</span>
        <span v-if="bustCount > 0" class="text-danger font-mono tabular-nums">{{ bustCount }} bust{{ bustCount > 1 ? 's' : '' }}</span>
        <span v-if="timeoutCount > 0" class="text-warning font-mono tabular-nums">{{ timeoutCount }} timeout{{ timeoutCount > 1 ? 's' : '' }}</span>
      </div>
    </div>

    <!-- 2P leg summaries (when no turn-level data for scorecard) -->
    <div v-else-if="legSummaries && legSummaries.length > 0" class="w-full max-w-sm bg-bg-elevated/50 border border-border rounded-lg p-4">
      <div class="flex flex-col gap-2">
        <div v-for="leg in legSummaries" :key="leg.legNumber" class="flex items-center justify-between text-sm">
          <span class="text-text-muted">Leg {{ leg.legNumber }}</span>
          <span class="text-text font-medium">
            {{ leg.winnerName ?? '?' }} &#x2705;
            <span class="text-text-muted text-xs">({{ leg.turnCount }} turns<template v-if="leg.bustCount > 0">, {{ leg.bustCount }} bust{{ leg.bustCount > 1 ? 's' : '' }}</template>)</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Fallback: just the share text -->
    <div v-else class="w-full max-w-sm bg-bg-elevated/50 border border-border rounded-lg p-4">
      <p class="text-sm text-text text-center">
        Score: <span class="font-mono font-bold tabular-nums">{{ finalScore }}</span> in {{ turnsTaken }} turns
      </p>
    </div>

    <!-- Actions -->
    <div class="flex gap-3">
      <AppButton
        variant="primary"
        size="sm"
        :loading="sharing"
        :disabled="sharing || downloading"
        @click="handleShare"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
        Share
      </AppButton>
      <AppButton
        variant="secondary"
        size="sm"
        :loading="downloading"
        :disabled="sharing || downloading"
        @click="handleDownload"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        Download
      </AppButton>
    </div>

    <!-- Feedback toast -->
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <span v-if="shareFeedback" class="text-xs text-text-muted" role="status">
        {{ shareFeedback }}
      </span>
    </Transition>
  </div>
</template>
