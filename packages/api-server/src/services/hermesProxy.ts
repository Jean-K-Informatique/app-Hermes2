import { createDecipheriv, createCipheriv, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../database/connection.js';
import { tenants } from '../database/schema.js';
import { env } from '../config/env.js';
import type { HermesMessage } from '../types/index.js';
import { logger } from '../logger.js';

/**
 * Decrypt the Hermes API key stored in the database.
 * Format: iv:authTag:ciphertext (all hex-encoded)
 */
export function decryptApiKey(encrypted: string): string {
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    // If not encrypted (e.g., in dev with MOCK_HERMES), return as-is
    return encrypted;
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function encryptApiKey(plaintext: string): string {
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export async function getTenantConfig(tenantId: string) {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant || !tenant.isActive) {
    throw new Error('Tenant not found or inactive');
  }

  return tenant;
}

/**
 * Stream a chat completion from Hermes API (OpenAI-compatible).
 * Returns an async generator that yields tokens.
 */
export async function* streamChatCompletion(
  tenantId: string,
  chatMessages: HermesMessage[]
): AsyncGenerator<string, void, unknown> {
  // Mock mode for development without a real Hermes instance
  if (env.MOCK_HERMES) {
    yield* mockStreamResponse();
    return;
  }

  const tenant = await getTenantConfig(tenantId);
  const apiKey = decryptApiKey(tenant.hermesApiKey);

  const response = await fetch(`${tenant.hermesApiUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'hermes-agent',
      stream: true,
      messages: chatMessages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, error: errorText }, 'Hermes API error');
    throw new Error(`Hermes API returned ${response.status}`);
  }

  if (!response.body) {
    throw new Error('No response body from Hermes API');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process SSE lines
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;

        if (trimmed === 'data: [DONE]') {
          return;
        }

        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Mock streaming response for development.
 * Simulates an Hermes agent with artificial delay.
 */
async function* mockStreamResponse(): AsyncGenerator<string, void, unknown> {
  const mockResponses = [
    "Bonjour ! Je suis votre assistant Hermes. Comment puis-je vous aider aujourd'hui ?",
    "C'est une excellente question. Laissez-moi y réfléchir...\n\nVoici ce que je peux vous dire :\n\n1. **Première chose** : tout fonctionne correctement\n2. **Deuxième chose** : le streaming est en temps réel\n3. **Troisième chose** : le markdown est supporté\n\nN'hésitez pas à me poser d'autres questions !",
    "Je comprends votre demande. Voici un exemple de code :\n\n```typescript\nconst greeting = 'Hello, World!';\nconsole.log(greeting);\n```\n\nEst-ce que cela vous aide ?",
  ];

  const response = mockResponses[Math.floor(Math.random() * mockResponses.length)];
  const words = response.split(' ');

  for (const word of words) {
    yield word + ' ';
    // Simulate network delay (30-80ms between tokens)
    await new Promise((resolve) => setTimeout(resolve, 30 + Math.random() * 50));
  }
}
