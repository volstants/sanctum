'use client';

import type { Realm } from '@/types';
import { motion } from 'framer-motion';
import { Plus, Sword } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  realms: Realm[];
  activeRealmId: string | null;
}

export function RealmList({ realms, activeRealmId }: Props) {
  const router = useRouter();

  return (
    <nav className="w-[72px] flex-shrink-0 bg-[var(--bg-sidebar)] flex flex-col items-center py-3 gap-2 overflow-y-auto">
      {/* Sanctum home icon */}
      <RealmIcon
        label="Home"
        isActive={!activeRealmId}
        onClick={() => router.push('/app')}
      >
        <Sword className="w-5 h-5" />
      </RealmIcon>

      {/* Divider */}
      <div className="w-8 h-px bg-[var(--border-strong)] my-1" />

      {/* Realm icons */}
      {realms.map((realm) => (
        <RealmIcon
          key={realm.id}
          label={realm.name}
          isActive={realm.id === activeRealmId}
          onClick={() => router.push(`/app/realm/${realm.id}`)}
        >
          {realm.icon_url ? (
            <img src={realm.icon_url} alt={realm.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold">
              {realm.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </RealmIcon>
      ))}

      {/* Divider */}
      <div className="w-8 h-px bg-[var(--border-strong)] my-1" />

      {/* Create realm */}
      <RealmIcon label="Create Realm" isActive={false} onClick={() => router.push('/app/new')}>
        <Plus className="w-5 h-5" />
      </RealmIcon>
    </nav>
  );
}

interface RealmIconProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function RealmIcon({ label, isActive, onClick, children }: RealmIconProps) {
  return (
    <div className="relative group flex items-center" title={label}>
      {/* Active indicator pill */}
      <motion.div
        className="absolute -left-3 w-1 bg-[var(--text-primary)] rounded-r-full"
        animate={{ height: isActive ? 36 : 0, opacity: isActive ? 1 : 0 }}
        transition={{ duration: 0.15 }}
      />

      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          w-12 h-12 rounded-[50%] flex items-center justify-center
          overflow-hidden cursor-pointer transition-all duration-200
          ${isActive
            ? 'rounded-[30%] bg-[var(--brand)] text-white'
            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:rounded-[30%] hover:bg-[var(--brand)] hover:text-white'
          }
        `}
      >
        {children}
      </motion.button>

      {/* Tooltip */}
      <div className="absolute left-16 z-50 hidden group-hover:block bg-[var(--bg-floating)] text-[var(--text-primary)] text-sm font-semibold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap pointer-events-none border border-[var(--border)]">
        {label}
      </div>
    </div>
  );
}
