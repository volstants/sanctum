import { create } from 'zustand';
import type { Realm, Channel, RealmMember, Profile, CoMasterSuggestion, Message } from '@/types';
import { type OpenRouterModelId, DEFAULT_MODEL } from '@/lib/ai-models';

const MODEL_STORAGE_KEY = 'sanctum:comaster-model';

interface AppState {
  // Auth
  profile: Profile | null;
  setProfile: (p: Profile | null) => void;

  // Navigation
  activeRealmId: string | null;
  activeChannelId: string | null;
  setActiveRealm: (id: string | null) => void;
  setActiveChannel: (id: string | null) => void;

  // Realm data
  realms: Realm[];
  channels: Channel[];
  members: RealmMember[];
  setRealms: (r: Realm[]) => void;
  setChannels: (c: Channel[]) => void;
  setMembers: (m: RealmMember[]) => void;

  // AI Co-Master
  coMasterSuggestions: CoMasterSuggestion[];
  isCoMasterThinking: boolean;
  addSuggestion: (s: CoMasterSuggestion) => void;
  clearSuggestions: () => void;
  setCoMasterThinking: (v: boolean) => void;

  // Co-Master model selection
  selectedModel: OpenRouterModelId;
  setSelectedModel: (m: OpenRouterModelId) => void;

  // Live chat messages (shared between ChatView and CoMasterPanel)
  channelMessages: Message[];
  setChannelMessages: (msgs: Message[]) => void;

  // Session recording
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;

  // UI
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
}

function loadStoredModel(): OpenRouterModelId {
  if (typeof window === 'undefined') return DEFAULT_MODEL;
  try {
    const stored = localStorage.getItem(MODEL_STORAGE_KEY);
    return (stored as OpenRouterModelId) ?? DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
}

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),

  activeRealmId: null,
  activeChannelId: null,
  setActiveRealm: (activeRealmId) => set({ activeRealmId }),
  setActiveChannel: (activeChannelId) => set({ activeChannelId }),

  realms: [],
  channels: [],
  members: [],
  setRealms: (realms) => set({ realms }),
  setChannels: (channels) => set({ channels }),
  setMembers: (members) => set({ members }),

  coMasterSuggestions: [],
  isCoMasterThinking: false,
  addSuggestion: (s) =>
    set((state) => ({
      coMasterSuggestions: [s, ...state.coMasterSuggestions].slice(0, 30),
    })),
  clearSuggestions: () => set({ coMasterSuggestions: [] }),
  setCoMasterThinking: (isCoMasterThinking) => set({ isCoMasterThinking }),

  selectedModel: DEFAULT_MODEL,
  setSelectedModel: (selectedModel) => {
    try { localStorage.setItem(MODEL_STORAGE_KEY, selectedModel); } catch { /* SSR */ }
    set({ selectedModel });
  },

  channelMessages: [],
  setChannelMessages: (channelMessages) => set({ channelMessages }),

  activeSessionId: null,
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),

  isMobileMenuOpen: false,
  toggleMobileMenu: () => set((s) => ({ isMobileMenuOpen: !s.isMobileMenuOpen })),
}));

// Hydrate model from localStorage on client
if (typeof window !== 'undefined') {
  const stored = loadStoredModel();
  if (stored !== DEFAULT_MODEL) {
    useAppStore.setState({ selectedModel: stored });
  }
}