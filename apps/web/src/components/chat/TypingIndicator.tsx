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
    <div className="px-4 py-1 flex items-center gap-2">
      <div className="flex gap-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-xs text-muted-foreground">
        {names} {typingUsers.length === 1 ? 'is' : 'are'} typing...
      </span>
    </div>
  );
}
