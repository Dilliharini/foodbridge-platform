import { Link, useLocation } from 'wouter';
import { ArrowRight, Boxes, ClipboardList, Compass, HeartHandshake, Home, LogOut, MapPin, Menu, Plus, ShieldCheck, Truck, UserRound, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { User } from '@workspace/api-client-react';
import { clearSession, initials } from '@/lib/session';

const navFor = (role?: string) => [
  { href: '/dashboard', label: 'Overview', icon: Home },
  ...(role === 'DONOR' ? [{ href: '/donations', label: 'My donations', icon: Boxes }, { href: '/donations/new', label: 'Share food', icon: Plus }] : [{ href: '/donations', label: 'Find food', icon: Compass }]),
  { href: '/requests', label: role === 'NGO' ? 'My requests' : 'Requests', icon: ClipboardList },
  ...(role === 'VOLUNTEER' ? [{ href: '/pickups', label: 'Pickups', icon: Truck }] : []),
  ...(role === 'ADMIN' ? [{ href: '/admin', label: 'Admin overview', icon: ShieldCheck }] : []),
];

export function Brand({ light = false }: { light?: boolean }) {
  return <Link href="/" className={`flex items-center gap-2.5 ${light ? 'text-background' : 'text-foreground'}`} data-testid="link-brand">
    <span className={`grid h-9 w-9 place-items-center rounded-xl ${light ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'}`}><HeartHandshake size={18} strokeWidth={2.5} /></span>
    <span className="display text-xl font-semibold tracking-tight">FoodBridge</span>
  </Link>;
}

export function PublicNav() {
  const [open, setOpen] = useState(false);
  return <header className="absolute inset-x-0 top-0 z-20">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8"><Brand light />
      <nav className="hidden items-center gap-8 text-sm text-background/75 md:flex">
        <Link href="/about" className="transition-colors hover:text-background" data-testid="link-about">How it works</Link>
        <a href="#story" className="transition-colors hover:text-background" data-testid="link-story">Our approach</a>
        <Link href="/login" className="btn btn-outline border-background/25 bg-background/10 text-background hover:bg-background/15" data-testid="link-login-nav">Sign in <ArrowRight size={15} /></Link>
      </nav>
      <button className="text-background md:hidden" onClick={() => setOpen((value) => !value)} data-testid="button-open-mobile-nav">{open ? <X /> : <Menu />}</button>
    </div>
    {open && <div className="mx-4 rounded-2xl border border-background/15 bg-foreground/95 p-4 text-background md:hidden">
      <Link href="/about" className="block rounded-lg px-3 py-3" onClick={() => setOpen(false)} data-testid="link-mobile-about">How it works</Link>
      <Link href="/login" className="block rounded-lg px-3 py-3" onClick={() => setOpen(false)} data-testid="link-mobile-login">Sign in</Link>
    </div>}
  </header>;
}

export function AppShell({ user, children }: { user: User; children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = navFor(user.role);
  const signOut = () => { clearSession(); setLocation('/login'); };
  return <div className="min-h-[100dvh] bg-background md:flex">
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar px-5 py-6 text-sidebar-foreground transition-transform md:static md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between"><Brand light /><button className="md:hidden" onClick={() => setMobileOpen(false)} data-testid="button-close-sidebar"><X size={18} /></button></div>
      <div className="mt-11 rounded-2xl border border-sidebar-border bg-sidebar-accent/40 p-4">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-sidebar-primary text-sm font-bold text-sidebar"><span>{initials(user.name)}</span></span><div className="min-w-0"><p className="truncate text-sm font-bold">{user.name}</p><p className="mono mt-0.5 text-[10px] uppercase tracking-widest text-sidebar-foreground/55">{user.role.toLowerCase()}</p></div></div>
        {user.organization_name && <p className="mt-3 truncate text-xs text-sidebar-foreground/60">{user.organization_name}</p>}
      </div>
      <nav className="mt-8 flex-1 space-y-1">
        <p className="mb-3 px-3 eyebrow text-sidebar-primary">Workspace</p>
        {nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${location === href ? 'bg-sidebar-primary text-sidebar' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={17} /><span>{label}</span>{href === '/requests' && user.role === 'DONOR' && <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">!</span>}</Link>)}
      </nav>
      <div className="border-t border-sidebar-border pt-4">
        <Link href="/about" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-sidebar-foreground/65 hover:bg-sidebar-accent" data-testid="link-nav-about"><HeartHandshake size={17} />About FoodBridge</Link>
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground" onClick={signOut} data-testid="button-sign-out"><LogOut size={17} />Sign out</button>
      </div>
    </aside>
    {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-foreground/35 md:hidden" onClick={() => setMobileOpen(false)} data-testid="button-dismiss-sidebar" />}
    <main className="min-w-0 flex-1">
      <div className="flex h-16 items-center justify-between border-b border-border bg-card/70 px-5 backdrop-blur md:hidden"><button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 hover:bg-muted" data-testid="button-open-sidebar"><Menu size={20} /></button><Brand /></div>
      <div className="mx-auto max-w-[1440px] p-5 md:p-8 lg:p-10">{children}</div>
    </main>
  </div>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div>{eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}<h1 className="display text-4xl leading-none tracking-tight text-foreground md:text-5xl">{title}</h1>{description && <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}</div>{action}</div>;
}

export function StatusPill({ status }: { status?: string }) {
  const value = status ?? 'UNKNOWN';
  const good = ['AVAILABLE', 'ACCEPTED', 'DELIVERED', 'COMPLETED', 'PICKED_UP'].includes(value);
  const warm = ['REQUESTED', 'PENDING', 'ASSIGNED', 'PICKUP_ASSIGNED'].includes(value);
  return <span className={`status-pill ${good ? 'bg-primary/10 text-primary' : warm ? 'bg-accent/20 text-accent-foreground' : 'bg-muted text-muted-foreground'}`} data-testid={`status-${value.toLowerCase()}`}>{value.replaceAll('_', ' ')}</span>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/55 p-10 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground"><MapPin size={20} /></div><h3 className="display mt-4 text-2xl">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export function LoadingBlock({ rows = 4 }: { rows?: number }) {
  return <div className="space-y-3" aria-label="Loading"><div className="h-5 w-32 animate-pulse rounded bg-muted" />{Array.from({ length: rows }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-muted/70" />)}</div>;
}

export function ErrorBlock({ onRetry, message = 'We could not load this workspace right now.' }: { onRetry?: () => void; message?: string }) {
  return <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-7 text-center"><p className="text-sm font-bold text-destructive">{message}</p>{onRetry && <button className="btn btn-danger mt-4" onClick={onRetry} data-testid="button-retry">Try again</button>}</div>;
}
