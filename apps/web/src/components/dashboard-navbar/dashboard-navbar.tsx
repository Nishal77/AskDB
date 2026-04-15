'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@askdb/ui';
import { Settings, LogOut, User, Database, LayoutDashboard, MessageSquare } from 'lucide-react';
import type { User as UserType } from '@askdb/types';

interface DashboardNavbarProps {
  user: UserType | null;
  onLogout: () => void;
}

export function DashboardNavbar({ user, onLogout }: DashboardNavbarProps) {
  const pathname = usePathname();

  const getInitials = (name: string | undefined, email: string | undefined) => {
    if (name) {
      return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (!email) return 'U';
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  const isActive = (path: string) =>
    path === '/dashboard'
      ? pathname === '/dashboard' || pathname.startsWith('/dashboard/connections')
      : pathname === path || pathname.startsWith(path);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-[60px] items-center justify-between">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 mr-8 flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#4338ca] shadow-[0_2px_8px_rgba(67,56,202,0.4)]">
            <Database className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-[15.5px] tracking-tight text-foreground hidden sm:block">
            AskYourDatabase
          </span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-1 flex-1">
          <Link
            href="/dashboard"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-sm font-medium transition-all duration-150 ${
              isActive('/dashboard')
                ? 'bg-[#4338ca]/10 text-[#4338ca]'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <Link
            href="/query"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-sm font-medium transition-all duration-150 ${
              isActive('/query')
                ? 'bg-[#4338ca]/10 text-[#4338ca]'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Query</span>
          </Link>
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 w-9 rounded-full p-0 focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-2"
            >
              <Avatar className="h-9 w-9 ring-2 ring-border">
                <AvatarFallback className="bg-[#4338ca] text-white text-sm font-semibold">
                  {getInitials(user?.name, user?.email)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60 rounded-[12px] shadow-xl border border-border/60 p-1.5" align="end" forceMount>
            <DropdownMenuLabel className="font-normal px-3 py-2.5">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold leading-none text-foreground">{user?.name || 'User'}</p>
                <p className="text-xs leading-none text-muted-foreground mt-1">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem asChild className="rounded-[8px] cursor-pointer px-3 py-2 text-sm font-medium gap-2.5">
              <Link href="/dashboard/settings">
                <Settings className="h-4 w-4 text-muted-foreground" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-[8px] cursor-pointer px-3 py-2 text-sm font-medium gap-2.5">
              <Link href="/dashboard">
                <User className="h-4 w-4 text-muted-foreground" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="rounded-[8px] cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/8 px-3 py-2 text-sm font-medium gap-2.5"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
