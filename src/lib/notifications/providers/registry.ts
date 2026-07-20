/** Registry: pick a concrete provider for a channel based on app_settings. */
import type { MessageChannel, MessageProvider } from "./types";
import { ProviderNotConfiguredError } from "./types";

type Factory = () => MessageProvider;

const registry: Record<MessageChannel, Map<string, Factory>> = {
  email: new Map(),
  whatsapp: new Map(),
  sms: new Map(),
};

export function registerProvider(channel: MessageChannel, id: string, factory: Factory): void {
  registry[channel].set(id, factory);
}

export function listProviders(channel: MessageChannel): string[] {
  return Array.from(registry[channel].keys());
}

export function resolveProvider(
  channel: MessageChannel,
  providerId: string | null | undefined,
): MessageProvider {
  const id = providerId ?? "";
  const factory = registry[channel].get(id);
  if (!factory) throw new ProviderNotConfiguredError(id || `<default ${channel}>`);
  return factory();
}
