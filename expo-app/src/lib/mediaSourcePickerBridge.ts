export type MediaSourceOption = { key: string; label: string };

type PendingRequest = {
  title: string;
  hint?: string;
  options: MediaSourceOption[];
  resolve: (key: string | null) => void;
};

let pending: PendingRequest | null = null;
const listeners = new Set<() => void>();

export function requestMediaSourceChoice(params: {
  title: string;
  hint?: string;
  options: MediaSourceOption[];
}): Promise<string | null> {
  return new Promise((resolve) => {
    pending = { ...params, resolve };
    listeners.forEach((l) => l());
  });
}

export function subscribeMediaSourcePicker(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getMediaSourcePickerPending(): PendingRequest | null {
  return pending;
}

export function resolveMediaSourceChoice(key: string | null): void {
  const req = pending;
  pending = null;
  req?.resolve(key);
  listeners.forEach((l) => l());
}
