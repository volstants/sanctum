import { create } from 'zustand';
import type { Realm, Channel, RealmMember, Profile, CoMasterSuggestion } from '@/types';

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
  setCoMasterThinking: (v: boolean) => void;

  // Session recording
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;

  // UI
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
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
      coMasterSuggestions: [s, ...state.coMasterSuggestions].slice(0, 20),
    })),
  setCoMasterThinking: (isCoMasterThinking) => set({ isCoMasterThinking }),

  activeSessionId: null,
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),

  isMobileMenuOpen: false,
  toggleMobileMenu: () => set((s) => ({ isMobileMenuOpen: !s.isMobileMenuOpen })),
}));
