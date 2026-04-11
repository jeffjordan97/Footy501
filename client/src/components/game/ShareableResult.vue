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

// --- Display helpers ---

const displayedFootballers = computed(() => {
  const MAX_SHOWN = 6;
  const named = props.footballersNamed;
  if (named.length <= MAX_SHOWN) return { shown: named, remaining: 0 };
  return {
    shown: named.slice(0, MAX_SHOWN),
    remaining: named.length - MAX_SHOWN,
  };
});

// --- Canvas rendering ---

function renderCardToCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0A0F0D';
  ctx.fillRect(0, 0, 800, 1000);

  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(21, 128, 61, 0.15)');
  gradient.addColorStop(1, 'rgba(21, 128, 61, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 200);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#E2E8F0';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('FOOTY 501 \uD83C\uDFAF', 400, 80);

  if (props.isDaily) {
    ctx.fillStyle = '#D97706';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`DAILY CHALLENGE${props.date ? ` - ${props.date}` : ''}`, 400, 130);
  }

  ctx.fillStyle = '#A78BFA';
  ctx.font = 'bold 28px sans-serif';
  const categoryY = props.isDaily ? 180 : 150;
  ctx.fillText(props.categoryName, 400, categoryY);

  // Arrow chain or score
  const chainY = categoryY + 60;
  if (isSoloMode.value && arrowChain.value) {
    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 22px monospace';
    const chainLines = wrapText(ctx, arrowChain.value, 700);
    let y = chainY;
    for (const line of chainLines) {
      ctx.fillText(line, 400, y);
      y += 32;
    }

    ctx.fillStyle = '#94A3B8';
    ctx.font = '22px sans-serif';
    const stats: string[] = [`${player1TurnCount.value} turns`];
    if (bustCount.value > 0) stats.push(`${bustCount.value} bust${bustCount.value > 1 ? 's' : ''}`);
    ctx.fillText(stats.join(' | '), 400, y + 20);
  } else {
    const scoreColor = props.isWinner ? '#22C55E' : '#DC2626';
    ctx.fillStyle = scoreColor;
    ctx.font = 'bold 72px monospace';
    ctx.fillText(String(props.finalScore), 400, chainY + 30);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '22px sans-serif';
    ctx.fillText(`in ${props.turnsTaken} turns`, 400, chainY + 70);
  }

  // Footballers
  const footballersY = 700;
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('FOOTBALLERS NAMED', 400, footballersY);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '18px sans-serif';
  const { shown, remaining } = displayedFootballers.value;
  const namesText = shown.join(', ') + (remaining > 0 ? `, +${remaining} more` : '');
  const nameLines = wrapText(ctx, namesText, 680);
  let nameY = footballersY + 28;
  for (const line of nameLines) {
    ctx.fillText(line, 400, nameY);
    nameY += 26;
  }

  ctx.fillStyle = '#94A3B8';
  ctx.font = '18px sans-serif';
  ctx.fillText('footy501.vercel.app', 400, 960);

  return canvas;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): readonly string[] {
  // For arrow chains, split on arrows to find natural break points
  const segments = text.split('\u2192');
  if (segments.length <= 1) return [text];

  const lines: string[] = [];
  let currentLine = segments[0]!;

  for (let i = 1; i < segments.length; i++) {
    const testLine = `${currentLine}\u2192${segments[i]}`;
    if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = segments[i]!;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine.length > 0) lines.push(currentLine);
  return lines;
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
    <!-- Share text preview -->
    <div class="w-full max-w-sm bg-bg-elevated/50 border border-border rounded-lg p-4">
      <pre class="text-xs text-text-muted font-mono whitespace-pre-wrap leading-relaxed text-center">{{ shareText }}</pre>
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
