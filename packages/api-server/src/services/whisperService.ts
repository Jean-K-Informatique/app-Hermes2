import { env } from '../config/env.js';
import type { TranscriptionResult } from '../types/index.js';
import { logger } from '../logger.js';

/**
 * Transcribe audio using OpenAI Whisper API or local Whisper.
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string
): Promise<TranscriptionResult> {
  if (env.WHISPER_MODE === 'disabled') {
    throw new Error('Whisper transcription is disabled');
  }

  if (env.WHISPER_MODE === 'api') {
    return transcribeWithApi(audioBuffer, filename);
  }

  return transcribeLocal(audioBuffer, filename);
}

async function transcribeWithApi(
  audioBuffer: Buffer,
  filename: string
): Promise<TranscriptionResult> {
  if (!env.WHISPER_API_KEY) {
    throw new Error('WHISPER_API_KEY is required for API mode');
  }

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/m4a' });
  formData.append('file', blob, filename);
  formData.append('model', env.WHISPER_MODEL);
  formData.append('response_format', 'verbose_json');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.WHISPER_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error({ status: response.status, error }, 'Whisper API error');
    throw new Error(`Whisper API returned ${response.status}`);
  }

  const result = await response.json() as { text: string; duration: number };

  return {
    text: result.text,
    durationMs: Math.round(result.duration * 1000),
  };
}

async function transcribeLocal(
  audioBuffer: Buffer,
  filename: string
): Promise<TranscriptionResult> {
  const { writeFile, unlink } = await import('node:fs/promises');
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');

  const execFileAsync = promisify(execFile);
  const tmpPath = join(tmpdir(), `whisper-${Date.now()}-${filename}`);

  try {
    await writeFile(tmpPath, audioBuffer);

    // Use whisper CLI (whisper.cpp or faster-whisper)
    const { stdout } = await execFileAsync('whisper', [
      tmpPath,
      '--model', env.WHISPER_LOCAL_MODEL,
      '--output_format', 'json',
      '--output_dir', tmpdir(),
    ], { timeout: 60000 });

    // Parse output (simplified — actual format depends on whisper implementation)
    const outputPath = tmpPath.replace(/\.[^.]+$/, '.json');
    const { readFile } = await import('node:fs/promises');
    const outputJson = JSON.parse(await readFile(outputPath, 'utf-8')) as {
      text: string;
      segments: Array<{ end: number }>;
    };

    const lastSegment = outputJson.segments[outputJson.segments.length - 1];
    const durationMs = lastSegment ? Math.round(lastSegment.end * 1000) : 0;

    // Clean up output file
    await unlink(outputPath).catch(() => {});

    return {
      text: outputJson.text.trim(),
      durationMs,
    };
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}
