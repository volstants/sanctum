export type Role = 'narrator' | 'player';

export type ChannelType = 'chat' | 'vtt' | 'voice' | 'ai';

export type HighlightType = 'combat' | 'plot' | 'death_risk' | 'loot';

export type CoMasterSuggestionType = 'ability' | 'rule' | 'plot' | 'encounter' | 'npc';

export interface Realm {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  invite_code: string;
  icon_url: string | null;
  rpg_system: string | null;
  created_at: string;
}

export interface Rulebook {
  id: string;
  realm_id: string;
  name: string;
  storage_path: string;
  extracted_text: string | null;
  page_count: number | null;
  file_size: number | null;
  status: 'processing' | 'ready' | 'error';
  error_message: string | null;
  created_at: string;
}

export interface RealmMember {
  realm_id: string;
  user_id: string;
  role: Role;
  display_name: string;
  avatar_url: string | null;
  joined_at: string;
}

export interface Channel {
  id: string;
  realm_id: string;
  name: string;
  type: ChannelType;
  position: number;
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  is_narrator: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  profiles?: Profile;
}

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  email: string;
}

export interface Character {
  id: string;
  realm_id: string;
  user_id: string;
  name: string;
  class: string;
  level: number;
  hp: number;
  max_hp: number;
  stats: Record<string, number>;
  avatar_url: string | null;
  notes: string | null;
  inventory: string | null;
  created_at: string;
}

export interface NPC {
  id: string;
  realm_id: string;
  name: string;
  description: string;
  is_secret: boolean;
  hp: number;
  max_hp: number;
  stats: Record<string, number>;
  attack: string;
  defense: string;
  damage: string;
  voice: string | null;
  created_at: string;
}

export interface GameMap {
  id: string;
  realm_id: string;
  name: string;
  image_url: string;
  width: number;
  height: number;
  grid_size: number;
  grid_visible: boolean;
  created_at: string;
}

export interface Token {
  id: string;
  map_id: string;
  character_id: string | null;
  npc_id: string | null;
  label: string;
  x: number;
  y: number;
  rotation: number;
  size: number;
  visible: boolean;
  image_url: string | null;
}

export interface Session {
  id: string;
  realm_id: string;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
}

export interface Highlight {
  id: string;
  session_id: string;
  message_id: string;
  type: HighlightType;
  description: string;
  created_at: string;
}

export interface CampaignContext {
  id: string;
  realm_id: string;
  content: string;
  summary: string | null;
  updated_at: string;
}

export interface CoMasterSuggestion {
  id: string;
  title: string;
  description: string;
  mechanic: string | null;
  type: CoMasterSuggestionType;
  timestamp: Date;
}

export interface Combatant {
  id: string;
  name: string;
  initiative: number;
  hp: number;
  max_hp: number;
  is_npc: boolean;
}
