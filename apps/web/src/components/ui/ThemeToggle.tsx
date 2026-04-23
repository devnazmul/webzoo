import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/store/theme.store';
import { Button } from '@/components/ui/button';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      className="h-8 w-8"
    >
      {theme === 'light' ? (
        <Moon size={16} className="text-muted-foreground" />
      ) : (
        <Sun size={16} className="text-muted-foreground" />
      )}
    </Button>
  );
}
