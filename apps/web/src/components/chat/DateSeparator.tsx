interface Props {
  date: Date;
}

function formatDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDate.getTime() === today.getTime()) return "Today";
  if (msgDate.getTime() === yesterday.getTime()) return "Yesterday";

  return date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: msgDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

export default function DateSeparator({ date }: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 my-1  z-10 bg-background">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs font-medium text-muted-foreground px-2 whitespace-nowrap">
        {formatDate(date)}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
