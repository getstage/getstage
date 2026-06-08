import {
  stageChatPanelSizeSchema,
  stageChatStoreSchema,
  type StageChat,
  type StageChatMessage,
  type StageChatPanelSize,
  type StageChatStore,
} from "@/models/companion/chat";

const CHAT_STORAGE_KEY = "stage.companion.chats.v1";
const CHAT_SIZE_STORAGE_KEY = "stage.companion.chatPanelSize.v1";
const CHAT_CHANGE_EVENT = "stage:companion-chats-changed";
const DEFAULT_CHAT_STORE: StageChatStore = { chats: [] };
const DEFAULT_PANEL_SIZE: StageChatPanelSize = { width: 432, height: 504 };

function createId(prefix: string) {
  const uuid = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${uuid}`;
}

export function createEmptyStageChat(now = Date.now()): StageChat {
  return {
    id: createId("chat"),
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function createStageChatMessage(
  input: Omit<StageChatMessage, "createdAt" | "id"> & { id?: string; createdAt?: number },
): StageChatMessage {
  return {
    ...input,
    id: input.id ?? createId(input.role),
    createdAt: input.createdAt ?? Date.now(),
  };
}

export function readStageChatStore(): StageChatStore {
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return DEFAULT_CHAT_STORE;

    const parsed = stageChatStoreSchema.safeParse(JSON.parse(raw) as unknown);
    if (!parsed.success) return DEFAULT_CHAT_STORE;

    return parsed.data;
  } catch {
    return DEFAULT_CHAT_STORE;
  }
}

export function writeStageChatStore(store: StageChatStore) {
  const parsed = stageChatStoreSchema.parse({
    activeChatId: store.activeChatId,
    chats: [...store.chats]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 50),
  });

  window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(parsed));
  window.dispatchEvent(new Event(CHAT_CHANGE_EVENT));
}

export function subscribeToStageChats(listener: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === CHAT_STORAGE_KEY) {
      listener();
    }
  }

  window.addEventListener(CHAT_CHANGE_EVENT, listener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CHAT_CHANGE_EVENT, listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function upsertStageChat(nextChat: StageChat) {
  const store = readStageChatStore();
  const existingIndex = store.chats.findIndex((chat) => chat.id === nextChat.id);
  const chats = existingIndex >= 0
    ? store.chats.map((chat) => (chat.id === nextChat.id ? nextChat : chat))
    : [nextChat, ...store.chats];

  writeStageChatStore({
    activeChatId: nextChat.id,
    chats,
  });
}

export function deleteStageChat(chatId: string): StageChatStore {
  const store = readStageChatStore();
  const chats = store.chats.filter((chat) => chat.id !== chatId);
  const activeChatId =
    store.activeChatId === chatId ? chats[0]?.id : store.activeChatId;

  const nextStore = stageChatStoreSchema.parse({
    activeChatId,
    chats,
  });

  writeStageChatStore(nextStore);
  return nextStore;
}

export function createTitleFromPrompt(prompt: string) {
  const title = prompt
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64);

  return title || "New chat";
}

export function readStageChatPanelSize(): StageChatPanelSize {
  try {
    const raw = window.localStorage.getItem(CHAT_SIZE_STORAGE_KEY);
    if (!raw) return DEFAULT_PANEL_SIZE;

    const parsed = stageChatPanelSizeSchema.safeParse(JSON.parse(raw) as unknown);
    return parsed.success ? parsed.data : DEFAULT_PANEL_SIZE;
  } catch {
    return DEFAULT_PANEL_SIZE;
  }
}

export function writeStageChatPanelSize(size: StageChatPanelSize) {
  const parsed = stageChatPanelSizeSchema.parse(size);
  window.localStorage.setItem(CHAT_SIZE_STORAGE_KEY, JSON.stringify(parsed));
}
