import { safeFetch, safeFetchLlm } from '../../utils/ssrfGuard';
import type { ResolvedLlmConfig } from '../llm-parse/llm-config';
import type { AiChatClient } from './ai-chat-client.interface';
import { AI_BASE_URLS } from './ai-connections.constants';
import type { ResolvedAiConnection } from './ai-connections.types';
import { ChatgptAuthService } from './chatgpt-auth.service';
import { AnthropicMessagesClient } from './providers/anthropic-messages.client';
import { OpenAiChatClient } from './providers/openai-chat.client';
import { OpenAiResponsesClient } from './providers/openai-responses.client';
import type { AiFetch } from './providers/provider-http';
import { Injectable } from '@nestjs/common';

/**
 * A cloud provider at its fixed address, through the SSRF guard. The body is
 * not capped here: the stream is read line by line under its own byte, line
 * and idle limits (providers/sse-lines.ts), and the deadline for the headers
 * is the adapter's.
 */
const cloudFetch: AiFetch = (url, init) => safeFetch(url, { ...init, signal: init.signal }, { maxBytes: null });

/**
 * An admin's own server, which may sit on loopback or in the LAN: the guard
 * that allows those and still refuses link-local and cloud metadata.
 */
const adminServerFetch: AiFetch = (url, init) => safeFetchLlm(url, { ...init, signal: init.signal }, 5, null);

/**
 * Whether an OpenAI model behind an API key goes through the Responses API:
 * the reasoning models (the o-series, GPT-5 and later) refuse function tools
 * on Chat Completions with a 400 (#2792). Their `-chat` variants do not reason
 * and stay on Chat Completions, like the older GPT-4 line.
 */
export function openAiWantsResponses(model: string): boolean {
  return /^(o\d|gpt-([5-9]|\d{2,}))/.test(model) && !/-chat/.test(model);
}

/** An explicitly configured OpenAI URL still uses the first-party adapter only when it names api.openai.com. */
export function isFirstPartyOpenAiBaseUrl(baseUrl?: string): boolean {
  if (!baseUrl) return true;
  try {
    const url = new URL(baseUrl);
    return url.protocol === 'https:' && url.hostname === 'api.openai.com' && /^\/v1\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

/**
 * The chat client for a resolved connection: Anthropic's Messages API, the
 * Responses API for a ChatGPT plan and OpenAI's reasoning models, and Chat
 * Completions for everything else OpenAI-compatible (older OpenAI models,
 * Gemini, OpenRouter, an admin's own server).
 */
@Injectable()
export class AiChatClientService {
  constructor(private readonly chatgpt: ChatgptAuthService) {}

  /** Adapts the legacy Aventuristur LLM setting to TREK's guarded provider clients. */
  createForLlmConfig(config: ResolvedLlmConfig): AiChatClient {
    if (config.provider === 'anthropic') {
      return new AnthropicMessagesClient(config.model, config.apiKey ?? '', cloudFetch);
    }
    if (config.provider === 'openai' && isFirstPartyOpenAiBaseUrl(config.baseUrl)) {
      return this.create({
        id: 0,
        scope: 'instance',
        kind: 'openai',
        model: config.model,
        baseUrl: null,
        host: new URL(AI_BASE_URLS.openai).host,
        paidBy: 'instance',
        status: 'ok',
        credential: { type: 'api_key', apiKey: config.apiKey ?? null },
      });
    }
    const baseUrl = (config.baseUrl ?? 'http://localhost:11434/v1').replace(/\/+$/, '');
    return this.create({
      id: 0,
      scope: 'instance',
      kind: 'custom',
      model: config.model,
      baseUrl,
      host: new URL(baseUrl).host,
      paidBy: 'instance',
      status: 'ok',
      credential: { type: 'api_key', apiKey: config.apiKey ?? null },
    });
  }

  create(connection: ResolvedAiConnection): AiChatClient {
    const { credential, kind, model } = connection;
    if (credential.type === 'chatgpt') {
      let current = credential.accessToken;
      return new OpenAiResponsesClient(
        model,
        async (rejected) => {
          if (rejected) current = await this.chatgpt.refresh(connection.id, rejected);
          return current;
        },
        cloudFetch,
      );
    }
    if (kind === 'openai' && openAiWantsResponses(model)) {
      const apiKey = credential.apiKey ?? '';
      return new OpenAiResponsesClient(model, () => Promise.resolve(apiKey), cloudFetch, 'openai');
    }
    switch (kind) {
      case 'anthropic':
        return new AnthropicMessagesClient(model, credential.apiKey ?? '', cloudFetch);
      case 'custom':
        return new OpenAiChatClient(
          kind,
          model,
          (connection.baseUrl ?? '').replace(/(?<!\/)\/+$/, ''),
          credential.apiKey,
          adminServerFetch,
        );
      default:
        return new OpenAiChatClient(kind, model, AI_BASE_URLS[kind], credential.apiKey, cloudFetch);
    }
  }
}
