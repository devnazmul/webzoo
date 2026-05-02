interface Props {
  typingUsers: string[];
  memberNames: Record<string, string>;
}

export default function TypingIndicator({ typingUsers, memberNames }: Props) {
  if (typingUsers.length === 0) return null;

  const names = typingUsers
    .map((id) => memberNames[id] ?? 'Someone')
    .join(', ');

  return (
    <div className="px-6 py-2 flex items-center gap-3">
      <div className="flex gap-1">
        <span className="w-1 h-1 rounded-full bg-spectral-white/50 animate-pulse" style={{ animationDelay: '0ms' }} />
        <span className="w-1 h-1 rounded-full bg-spectral-white/50 animate-pulse" style={{ animationDelay: '200ms' }} />
        <span className="w-1 h-1 rounded-full bg-spectral-white/50 animate-pulse" style={{ animationDelay: '400ms' }} />
      </div>
      <span className="text-[9px] font-bold uppercase tracking-[2px] text-spectral-white/40">
        {names} {typingUsers.length === 1 ? 'is' : 'are'} transmitting...
      </span>
    </div>

  );
}
