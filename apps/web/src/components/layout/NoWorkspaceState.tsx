import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NoWorkspaceStateProps {
  onCreate: () => void;
}

export default function NoWorkspaceState({ onCreate }: NoWorkspaceStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center relative min-h-0 overflow-hidden bg-space-black z-10 w-full h-full p-6 text-center">
      {/* Decorative Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[30%] w-[40%] h-[40%] bg-whatsapp-teal/10 blur-[120px] rounded-full animate-aurora" />
        <div className="absolute bottom-[20%] right-[30%] w-[30%] h-[30%] bg-indigo-500/10 blur-[100px] rounded-full animate-aurora" style={{ animationDelay: '-5s' }} />
      </div>

      <div className="relative z-10 max-w-md w-full animate-in slide-in-from-bottom-8 fade-in duration-700">
        <div className="w-24 h-24 mx-auto mb-8 relative">
          <div className="absolute inset-0 bg-whatsapp-teal/20 rounded-full animate-pulse" />
          <div className="absolute inset-2 bg-gradient-to-tr from-whatsapp-teal to-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-whatsapp-teal/30">
            <HashIcon className="text-white w-10 h-10" />
          </div>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
          Welcome to WebZoo
        </h1>
        
        <p className="text-lg text-muted-foreground mb-10 leading-relaxed max-w-sm mx-auto">
          You don't have any channels yet. Create your first channel to start collaborating with your team.
        </p>
        
        <Button 
          onClick={onCreate}
          size="lg"
          className="bg-whatsapp-teal hover:bg-whatsapp-teal/90 text-white rounded-full px-8 h-14 text-lg font-bold shadow-[0_0_40px_rgba(0,168,132,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(0,168,132,0.6)]"
        >
          <Plus className="mr-2 h-6 w-6" />
          Create your first Channel
        </Button>
      </div>
    </div>
  );
}

function HashIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="4" x2="20" y1="9" y2="9" />
      <line x1="4" x2="20" y1="15" y2="15" />
      <line x1="10" x2="8" y1="3" y2="21" />
      <line x1="16" x2="14" y1="3" y2="21" />
    </svg>
  );
}
