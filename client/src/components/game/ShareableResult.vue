<script setup lang="ts">
import { ref, computed } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';

interface Props {
  categoryName: string;
  finalScore: number;
  turnsTaken: number;
  isWinner: boolean;
  opponentName?: string;
  opponentScore?: number;
  footballersNamed: string[];
  isDaily?: boolean;
  date?: string;
}

const props = withDefaults(defineProps<Props>(), {
  isDaily: false,
});

const shareFeedback = ref<string | null>(null);
const downloading = ref(false);
const sharing = ref(false);

const OPTIMAL_TURNS = 12;

const performanceRatio = computed(() =>
  Math.min(props.turnsTaken / OPTIMAL_TURNS, 1),
);

const performanceLabel = computed(() => {
  const ratio = performanceRatio.value;
  if (ratio <= 0.5) return 'Exceptional';
  if (ratio <= 0.7) return 'Great';
  if (ratio <= 0.85) return 'Good';
  return 'Solid';
});

const displayedFootballers = computed(() => {
  const MAX_SHOWN = 6;
  const named = props.footballersNamed;
  if (named.length <= MAX_SHOWN) return { shown: named, remaining: 0 };
  return {
    shown: named.slice(0, MAX_SHOWN),
    remaining: named.length - MAX_SHOWN,
  };
});

const shareText = computed(() => {
  const lines: string[] = [];
  if (props.isDaily) {
    lines.push(`Footy 501 Daily Challenge${props.date ? ` - ${props.date}` : ''}`);
  } else {
    lines.push('Footy 501');
  }
  lines.push(props.categoryName);
  lines.push('');
  lines.push(`Score: ${props.finalScore} in ${props.turnsTaken} turns`);
  if (props.opponentName != null && props.opponentScore != null) {
    lines.push(`vs ${props.opponentName}: ${props.opponentScore}`);
  }
  lines.push('');
  lines.push('footy501.vercel.app');
  return lines.join('\n');
});

function renderCardToCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#0A0F0D';
  ctx.fillRect(0, 0, 800, 1000);

  // Subtle gradient overlay at top
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(21, 128, 61, 0.15)');
  gradient.addColorStop(1, 'rgba(21, 128, 61, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 200);

  // Title
  ctx.textAlign = 'center';
  ctx.fillStyle = '#E2E8F0';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('FOOTY 501', 400, 80);

  // Football icon (simple circle)
  ctx.beginPath();
  ctx.arc(400, 130, 18, 0, Math.PI * 2);
  ctx.fillStyle = '#22C55E';
  ctx.fill();
  ctx.fillStyle = '#0A0F0D';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('\u26BD', 400, 138);

  // Daily badge
  if (props.isDaily) {
    ctx.fillStyle = '#D97706';
    ctx.font = 'bold 18px sans-serif';
    const badgeText = `DAILY CHALLENGE${props.date ? ` - ${props.date}` : ''}`;
    ctx.fillText(badgeText, 400, 180);
  }

  // Category name
  ctx.fillStyle = '#A78BFA';
  ctx.font = 'bold 28px sans-serif';
  const categoryY = props.isDaily ? 230 : 200;
  ctx.fillText(props.categoryName, 400, categoryY);

  // Divider line
  const divY = categoryY + 30;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(200, divY);
  ctx.lineTo(600, divY);
  ctx.stroke();

  // Score box
  const scoreY = divY + 80;
  const scoreColor = props.isWinner ? '#22C55E' : '#DC2626';

  // Score box background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  const boxW = 160;
  const boxH = 120;
  const boxX = 400 - boxW / 2;
  const boxY = scoreY - 70;
  roundRect(ctx, boxX, boxY, boxW, boxH, 16);
  ctx.fill();

  // Score border
  ctx.strokeStyle = scoreColor + '40';
  ctx.lineWidth = 2;
  roundRect(ctx, boxX, boxY, boxW, boxH, 16);
  ctx.stroke();

  // Score number
  ctx.fillStyle = scoreColor;
  ctx.font = 'bold 72px monospace';
  ctx.fillText(String(props.finalScore), 400, scoreY + 10);

  // Turns label
  ctx.fillStyle = '#94A3B8';
  ctx.font = '22px sans-serif';
  ctx.fillText(`in ${props.turnsTaken} turns`, 400, scoreY + 70);

  // Opponent score (if multiplayer)
  if (props.opponentName != null && props.opponentScore != null) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '20px sans-serif';
    ctx.fillText(`vs ${props.opponentName}: ${props.opponentScore}`, 400, scoreY + 105);
  }

  // Performance bar
  const barBaseY = props.opponentName != null ? scoreY + 140 : scoreY + 120;
  const barWidth = 360;
  const barHeight = 16;
  const barX = 400 - barWidth / 2;

  // Bar background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  roundRect(ctx, barX, barBaseY, barWidth, barHeight, 8);
  ctx.fill();

  // Bar fill
  const fillWidth = Math.max(barWidth * performanceRatio.value, barHeight);
  ctx.fillStyle = scoreColor;
  roundRect(ctx, barX, barBaseY, fillWidth, barHeight, 8);
  ctx.fill();

  // Performance label
  ctx.fillStyle = '#94A3B8';
  ctx.font = '16px sans-serif';
  ctx.fillText(
    `${props.turnsTaken}/${OPTIMAL_TURNS} optimal - ${performanceLabel.value}`,
    400,
    barBaseY + 38,
  );

  // Footballers section
  const footballersY = barBaseY + 75;
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('FOOTBALLERS NAMED', 400, footballersY);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '18px sans-serif';
  const { shown, remaining } = displayedFootballers.value;
  const namesText = shown.join(', ') + (remaining > 0 ? `, +${remaining} more` : '');

  // Word-wrap footballer names
  const maxLineWidth = 680;
  const nameLines = wrapText(ctx, namesText, maxLineWidth);
  let nameY = footballersY + 28;
  for (const line of nameLines) {
    ctx.fillText(line, 400, nameY);
    nameY += 26;
  }

  // Footer divider
  const footerDivY = 920;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(200, footerDivY);
  ctx.lineTo(600, footerDivY);
  ctx.stroke();

  // Footer URL
  ctx.fillStyle = '#94A3B8';
  ctx.font = '18px sans-serif';
  ctx.fillText('footy501.vercel.app', 400, 960);

  return canvas;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): readonly string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine.length > 0 ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
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
      await navigator.share({
        text: shareText.value,
        files: [file],
      });
    } else if (typeof navigator.share === 'function') {
      await navigator.share({ text: shareText.value });
    } else {
      await navigator.clipboard.writeText(shareText.value);
      shareFeedback.value = 'Copied to clipboard!';
      setTimeout(() => { shareFeedback.value = null; }, 2000);
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      // User cancelled the share dialog -- not an error
      return;
    }
    // Fallback: try clipboard
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
  <div class="flex flex-col items-center gap-4">
    <!-- Visual preview card (HTML/CSS) -->
    <div
      class="card-preview w-[400px] h-[500px] rounded-2xl overflow-hidden flex flex-col items-center relative select-none"
      aria-label="Results card preview"
    >
      <!-- Gradient overlay at top -->
      <div class="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/15 to-transparent" aria-hidden="true" />

      <!-- Content -->
      <div class="relative z-10 flex flex-col items-center w-full px-6 py-6 gap-3">
        <!-- Title -->
        <h3 class="font-display text-xl font-bold text-text tracking-wide">
          FOOTY 501
        </h3>

        <!-- Daily badge -->
        <span
          v-if="isDaily"
          class="text-xs font-bold text-accent uppercase tracking-wider"
        >
          Daily Challenge{{ date ? ` - ${date}` : '' }}
        </span>

        <!-- Category -->
        <span class="text-sm font-bold text-purple-400 text-center leading-tight">
          {{ categoryName }}
        </span>

        <!-- Divider -->
        <div class="w-32 h-px bg-border" aria-hidden="true" />

        <!-- Score box -->
        <div
          class="flex flex-col items-center gap-1 px-6 py-4 rounded-xl"
          :class="isWinner ? 'bg-success/5 border border-success/20' : 'bg-danger/5 border border-danger/20'"
        >
          <span
            class="font-mono text-5xl font-bold tabular-nums leading-none"
            :class="isWinner ? 'text-primary-light' : 'text-danger'"
          >
            {{ finalScore }}
          </span>
        </div>

        <!-- Turns -->
        <span class="text-sm text-text-muted">
          in <span class="font-mono font-semibold text-text tabular-nums">{{ turnsTaken }}</span> turns
        </span>

        <!-- Opponent score -->
        <span
          v-if="opponentName != null && opponentScore != null"
          class="text-xs text-text-muted"
        >
          vs {{ opponentName }}: {{ opponentScore }}
        </span>

        <!-- Performance bar -->
        <div class="w-full max-w-[280px] flex flex-col gap-1.5 mt-1">
          <div class="h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="isWinner ? 'bg-primary-light' : 'bg-danger'"
              :style="{ width: `${performanceRatio * 100}%` }"
            />
          </div>
          <span class="text-[10px] text-text-muted text-center">
            {{ turnsTaken }}/{{ OPTIMAL_TURNS }} optimal &middot; {{ performanceLabel }}
          </span>
        </div>

        <!-- Footballers -->
        <div class="flex flex-col items-center gap-1 mt-2">
          <span class="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            Footballers Named
          </span>
          <p class="text-xs text-text text-center leading-relaxed max-w-[320px]">
            {{ displayedFootballers.shown.join(', ') }}<template v-if="displayedFootballers.remaining > 0">, +{{ displayedFootballers.remaining }} more</template>
          </p>
        </div>

        <!-- Footer -->
        <div class="mt-auto pt-2">
          <span class="text-[10px] text-text-muted">footy501.vercel.app</span>
        </div>
      </div>
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
      <span
        v-if="shareFeedback"
        class="text-xs text-text-muted"
        role="status"
      >
        {{ shareFeedback }}
      </span>
    </Transition>
  </div>
</template>

<style scoped>
.card-preview {
  background-color: var(--color-bg-deep);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-elevated);
}
</style>
