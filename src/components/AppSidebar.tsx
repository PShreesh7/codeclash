import { Link, useLocation } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import {
  LayoutDashboard, BookOpen, Swords, TrendingUp,
  History, Bot, Coins, LogOut, Trophy
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/learning', label: 'Learning', icon: BookOpen },
  { path: '/battle', label: 'Battle', icon: Swords },
  { path: '/progress', label: 'Progress', icon: TrendingUp },
  { path: '/history', label: 'History', icon: History },
  { path: '/ai-coach', label: 'AI Coach', icon: Bot },
  { path: '/token-shop', label: 'Token Shop', icon: Coins },
];

const AppSidebar = () => {
  const location = useLocation();
  const { user, logout } = useUser();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-50">
      <div className="p-6 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Swords className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground tracking-wider">CodeClash</h1>
            <p className="text-xs text-muted-foreground">Skill Evolution</p>
          </div>
        </Link>
      </div>

      {user && (
        <div className="p-4 mx-3 mt-4 glass-card rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">{user.username[0].toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{user.username}</p>
              <div className="flex items-center gap-1">
                <Trophy className="w-3 h-3 text-secondary" />
                <span className="text-xs text-secondary font-mono font-bold">{user.elo} ELO</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 p-3 mt-2 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
