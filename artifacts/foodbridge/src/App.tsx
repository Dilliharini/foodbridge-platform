import { FormEvent, ReactNode, useEffect, useMemo, useState, type ButtonHTMLAttributes } from 'react';
import {
  getGetDashboardSummaryQueryKey,
  getGetDonationQueryKey,
  getGetMeQueryKey,
  getHealthCheckQueryKey,
  getListDonationRequestsQueryKey,
  getListDonationsQueryKey,
  getListPickupsQueryKey,
  setAuthTokenGetter,
  useCancelDonation,
  useCreateDonation,
  useCreateDonationRequest,
  useDecideDonationRequest,
  useGetDashboardSummary,
  useGetDonation,
  useGetMe,
  useHealthCheck,
  useListDonationRequests,
  useListDonations,
  useListPickups,
  useLogin,
  useRegister,
  useUpdateDonation,
  useUpdatePickupStatus,
  type Donation,
  type DonationInput,
  type DonationRequest,
  type Pickup,
  type User,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  CircleHelp,
  Clock3,
  HandHeart,
  Leaf,
  LogOut,
  MapPin,
  Menu,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { Toaster as SonnerToaster, toast } from 'sonner';
import { useLocation } from 'wouter';

const tokenKey = 'foodbridge_token';
const userKey = 'foodbridge_user';

setAuthTokenGetter(() => localStorage.getItem(tokenKey));
const queryClient = new QueryClient();

const categories = ['Cooked Meals', 'Rice', 'Bread', 'Fruits', 'Vegetables', 'Packaged Food', 'Bakery', 'Other'];

const statusLabels: Record<string, string> = {
  AVAILABLE: 'Available',
  REQUESTED: 'Requested',
  ACCEPTED: 'Accepted',
  PICKUP_ASSIGNED: 'Pickup assigned',
  PICKED_UP: 'Picked up',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
  PENDING: 'Pending',
  REJECTED: 'Declined',
  ASSIGNED: 'Assigned',
};

function getStoredUser(): User | null {
  try {
    const stored = localStorage.getItem(userKey);
    return stored ? (JSON.parse(stored) as User) : null;
  } catch {
    return null;
  }
}

function saveSession(auth: { access_token: string; user: User }) {
  localStorage.setItem(tokenKey, auth.access_token);
  localStorage.setItem(userKey, JSON.stringify(auth.user));
}

function clearSession() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(
    new Date(value),
  );
}

function formatTime(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (error instanceof Error && error.message) {
    const detail = error.message.split(': ').slice(1).join(': ');
    return detail || error.message;
  }
  return fallback;
}

function roleName(role?: string) {
  return role === 'NGO' ? 'NGO partner' : role ? role.charAt(0) + role.slice(1).toLowerCase() : 'Member';
}

function initials(name?: string) {
  return (name || 'FB')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const variants = {
    primary: 'bg-[#163f35] text-white shadow-[0_8px_18px_rgba(22,63,53,.16)] hover:bg-[#0e3028]',
    secondary: 'border border-[#cdd9ce] bg-white text-[#163f35] hover:bg-[#f2f7f1]',
    ghost: 'text-[#557066] hover:bg-[#edf4ec] hover:text-[#163f35]',
    danger: 'border border-[#efc8c8] bg-[#fff7f7] text-[#a13e3e] hover:bg-[#fff0f0]',
  };
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'AVAILABLE' || status === 'COMPLETED' || status === 'DELIVERED' || status === 'ACCEPTED'
      ? 'bg-[#e4f3e6] text-[#287448]'
      : status === 'CANCELLED' || status === 'REJECTED'
        ? 'bg-[#fae8e8] text-[#a13e3e]'
        : 'bg-[#fff1d7] text-[#956526]';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{statusLabels[status] || status}</span>;
}

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <button className="flex items-center gap-2.5 text-left" onClick={onClick}>
      <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#d8ead4] text-[#163f35]">
        <Leaf className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <span>
        <span className="block font-display text-lg font-extrabold tracking-[-.03em] text-[#163f35]">FoodBridge</span>
        <span className="block text-[10px] font-semibold uppercase tracking-[.17em] text-[#6a8478]">share more · waste less</span>
      </span>
    </button>
  );
}

function PublicHeader({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
      <Logo onClick={() => onNavigate('/')} />
      <nav className="hidden items-center gap-8 text-sm font-semibold text-[#557066] md:flex">
        <button onClick={() => onNavigate('/about')} className="transition hover:text-[#163f35]">How it works</button>
        <a href="#impact" className="transition hover:text-[#163f35]">Our impact</a>
        <a href="#partners" className="transition hover:text-[#163f35]">For partners</a>
      </nav>
      <div className="flex items-center gap-2">
        <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => onNavigate('/login')}>Log in</Button>
        <Button onClick={() => onNavigate('/register')}>Join FoodBridge <ArrowRight className="h-4 w-4" /></Button>
      </div>
    </header>
  );
}

function PageFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <main className={`mx-auto w-full max-w-7xl px-5 pb-16 pt-5 lg:px-8 ${className}`}>{children}</main>;
}

function Landing({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f9f3] text-[#163f35]">
      <PublicHeader onNavigate={navigate} />
      <PageFrame className="pt-10 lg:pt-16">
        <section className="relative grid items-center gap-12 pb-20 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:pb-28">
          <div className="relative z-10 max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#cfe3ca] bg-[#eaf4e7] px-3.5 py-2 text-xs font-bold text-[#397356]">
              <Sparkles className="h-3.5 w-3.5" /> A better route for surplus food
            </div>
            <h1 className="font-display text-[clamp(3.5rem,7vw,6.7rem)] font-extrabold leading-[.92] tracking-[-.075em]">
              Good food<br /><span className="text-[#df7a45]">should go</span><br />somewhere good.
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-[#5b7469]">
              FoodBridge connects the people with surplus to the people who can move it forward — safely, quickly, and with dignity.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button className="min-h-12 px-5" onClick={() => navigate('/register')}>Start making an impact <ArrowRight className="h-4 w-4" /></Button>
              <Button variant="secondary" className="min-h-12 px-5" onClick={() => navigate('/about')}>See how it works</Button>
            </div>
            <div className="mt-12 flex items-center gap-4 border-t border-[#dbe5d9] pt-5 text-sm text-[#678075]">
              <div className="flex -space-x-2">
                {['SK', 'AM', 'RP', 'JT'].map((item, index) => <span key={item} className={`grid h-8 w-8 place-items-center rounded-full border-2 border-[#f7f9f3] text-[10px] font-bold text-white ${['bg-[#d77d54]', 'bg-[#6a9a76]', 'bg-[#a8865d]', 'bg-[#6e8994]'][index]}`}>{item}</span>)}
              </div>
              <span><strong className="text-[#163f35]">Built for people who care.</strong><br />Join donors, NGOs and volunteers in your city.</span>
            </div>
          </div>
          <div className="relative min-h-[470px] lg:min-h-[580px]">
            <div className="absolute right-0 top-0 h-[390px] w-[390px] rounded-[42%_58%_50%_50%] bg-[#dcebd8] sm:h-[500px] sm:w-[500px]" />
            <div className="absolute right-[7%] top-[8%] h-[340px] w-[340px] rounded-[45%_55%_55%_45%] border-[18px] border-[#edf6e9] sm:h-[440px] sm:w-[440px]" />
            <div className="absolute right-[9%] top-[19%] w-[285px] rotate-[-5deg] rounded-[26px] bg-white p-4 shadow-[0_24px_60px_rgba(42,73,57,.16)] sm:w-[350px]">
              <div className="h-44 rounded-[18px] bg-gradient-to-br from-[#e6bd74] via-[#e9824e] to-[#b94d38] p-4">
                <div className="flex h-full items-end justify-between text-white"><span className="text-sm font-bold">Warm meals<br />for the evening</span><span className="rounded-full bg-white/25 px-2 py-1 text-[10px] font-bold">AVAILABLE</span></div>
              </div>
              <div className="px-1 pb-1 pt-4"><p className="text-sm font-bold text-[#163f35]">Community kitchen surplus</p><p className="mt-1 text-xs text-[#779083]">12 kg · Andheri East · pickup today</p><div className="mt-4 flex items-center justify-between"><span className="flex items-center gap-1 text-xs font-semibold text-[#779083]"><MapPin className="h-3.5 w-3.5" /> 2.4 km away</span><span className="rounded-lg bg-[#eaf4e7] px-2.5 py-1.5 text-xs font-bold text-[#397356]">View details</span></div></div>
            </div>
            <div className="absolute bottom-5 left-0 rounded-2xl border border-[#e2eee0] bg-white px-4 py-3 shadow-[0_16px_36px_rgba(42,73,57,.12)] sm:left-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff0df] text-[#d87543]"><Truck className="h-5 w-5" /></span><span><span className="block text-xs text-[#779083]">Today, FoodBridge moved</span><strong className="block text-base text-[#163f35]">1,248 meals forward</strong></span></div></div>
          </div>
        </section>
        <section id="impact" className="grid gap-4 border-y border-[#dbe5d9] py-7 sm:grid-cols-3">
          {[['3,400+', 'meals rescued this month', HandHeart], ['68', 'active community partners', Users], ['97%', 'of pickups completed on time', Clock3]].map(([value, label, Icon]) => <div key={label as string} className="flex items-center gap-3 px-2"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e9f3e7] text-[#397356]"><Icon className="h-5 w-5" /></span><span><strong className="block font-display text-2xl tracking-[-.04em]">{value as string}</strong><span className="text-xs font-semibold text-[#779083]">{label as string}</span></span></div>)}
        </section>
        <section id="partners" className="grid gap-10 py-24 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#df7a45]">One shared table</p><h2 className="mt-3 max-w-md font-display text-4xl font-extrabold leading-tight tracking-[-.055em] sm:text-5xl">Every good hand makes the chain stronger.</h2></div>
          <div className="grid gap-3 sm:grid-cols-3">{[['01', 'Donors', 'Share safe surplus before it becomes waste.'], ['02', 'NGOs', 'Find what your community needs, when it matters.'], ['03', 'Volunteers', 'Turn a nearby pickup into a meaningful delivery.']].map(([number, title, copy]) => <div key={number} className="rounded-2xl border border-[#dce7db] bg-white/70 p-5"><span className="text-xs font-bold text-[#df7a45]">{number}</span><h3 className="mt-7 font-display text-xl font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#6c8579]">{copy}</p></div>)}</div>
        </section>
      </PageFrame>
      <footer className="border-t border-[#dbe5d9] px-5 py-7 text-center text-xs font-semibold text-[#779083] lg:px-8">FoodBridge · Safe surplus, shared with dignity.</footer>
    </div>
  );
}

function About({ navigate }: { navigate: (path: string) => void }) {
  return <div className="min-h-screen bg-[#f7f9f3] text-[#163f35]"><PublicHeader onNavigate={navigate} /><PageFrame className="pt-16"><button onClick={() => navigate('/')} className="mb-10 flex items-center gap-2 text-sm font-bold text-[#678075]"><ChevronLeft className="h-4 w-4" /> Back home</button><div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#df7a45]">The bridge matters</p><h1 className="mt-4 font-display text-6xl font-extrabold leading-[.95] tracking-[-.07em] sm:text-8xl">Less waste.<br /><span className="text-[#df7a45]">More together.</span></h1><p className="mt-8 max-w-2xl text-lg leading-8 text-[#5b7469]">FoodBridge is the coordination layer for a simple idea: food that is safe to eat should be easy to share. We connect donors, NGOs and volunteers in one clear loop.</p></div><div className="mt-20 grid gap-4 md:grid-cols-3">{[['01', 'List the surplus', 'A donor adds what is available, where it is, and when it can be collected.'], ['02', 'Match with purpose', 'An NGO can search the live list, request what fits, and keep the donor in the loop.'], ['03', 'Move it forward', 'A volunteer picks up, delivers, and closes the loop with a visible record.']].map(([number, title, copy]) => <article key={number} className="rounded-3xl bg-[#163f35] p-7 text-white"><span className="text-sm font-bold text-[#efb18d]">{number}</span><h2 className="mt-16 font-display text-2xl font-extrabold">{title}</h2><p className="mt-3 text-sm leading-7 text-[#c3d5ca]">{copy}</p></article>)}</div><div className="mt-16 rounded-3xl border border-[#dce7db] bg-white p-8 sm:p-12"><div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#eaf4e7] text-[#397356]"><ShieldCheck className="h-6 w-6" /></span><div><h2 className="font-display text-2xl font-extrabold">Built around trust</h2><p className="mt-2 max-w-2xl leading-7 text-[#6c8579]">Role-based access, server-side validation, and a traceable donation lifecycle keep the right information with the right people at every step.</p></div></div></div></PageFrame></div>;
}

function AuthPage({ mode, onSuccess, navigate }: { mode: 'login' | 'register'; onSuccess: (user: User, token: string) => void; navigate: (path: string) => void }) {
  const isLogin = mode === 'login';
  const login = useLogin({ mutation: { onSuccess: (result) => { onSuccess(result.user, result.access_token); toast.success('Welcome back to FoodBridge.'); }, onError: (error) => toast.error(getErrorMessage(error, 'Unable to log in.')) } });
  const register = useRegister({ mutation: { onSuccess: (result) => { onSuccess(result.user, result.access_token); toast.success('Your FoodBridge account is ready.'); }, onError: (error) => toast.error(getErrorMessage(error, 'Unable to create your account.')) } });
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'DONOR' as 'DONOR' | 'NGO' | 'VOLUNTEER', organization_name: '' });
  const busy = login.isPending || register.isPending;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isLogin) login.mutate({ data: { email: form.email, password: form.password } });
    else register.mutate({ data: { name: form.name, email: form.email, password: form.password, role: form.role, organization_name: form.organization_name || null } });
  };
  return <div className="grid min-h-screen bg-[#f7f9f3] text-[#163f35] lg:grid-cols-[.8fr_1.2fr]"><div className="hidden bg-[#163f35] p-10 text-white lg:flex lg:flex-col lg:justify-between"><Logo onClick={() => navigate('/')} /><div><span className="mb-5 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-[#cde5cf]">A shared table starts here</span><h1 className="max-w-lg font-display text-6xl font-extrabold leading-[.94] tracking-[-.07em]">The useful kind of optimism.</h1><p className="mt-6 max-w-md leading-7 text-[#c3d5ca]">FoodBridge turns good intentions into a clear next step — whether you have food to share, a community to support, or a route to drive.</p></div><p className="text-xs font-semibold text-[#8fac9e]">Safe surplus, shared with dignity.</p></div><div className="flex flex-col p-5 sm:p-10"><div className="flex items-center justify-between lg:justify-end"><button onClick={() => navigate('/')} className="lg:hidden"><Logo /></button><button onClick={() => navigate('/')} className="text-sm font-bold text-[#678075]">Back home</button></div><div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#df7a45]">{isLogin ? 'Welcome back' : 'Join the bridge'}</p><h1 className="mt-3 font-display text-4xl font-extrabold tracking-[-.055em]">{isLogin ? 'Log in to keep good food moving.' : 'Create your FoodBridge account.'}</h1><p className="mt-3 leading-7 text-[#6c8579]">{isLogin ? 'Your dashboard, requests and deliveries are waiting.' : 'Choose how you want to contribute. You can change your profile details later.'}</p><form onSubmit={submit} className="mt-8 space-y-4">{!isLogin && <Field label="Your name"><input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Asha Mehta" className="input" /></Field>}<Field label="Email address"><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" className="input" /></Field><Field label="Password"><input required minLength={8} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" className="input" /></Field>{!isLogin && <><Field label="I am joining as"><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })} className="input"><option value="DONOR">A donor with surplus food</option><option value="NGO">An NGO or community organization</option><option value="VOLUNTEER">A volunteer who can help move it</option></select></Field>{form.role === 'NGO' && <Field label="Organization name"><input required value={form.organization_name} onChange={(e) => setForm({ ...form, organization_name: e.target.value })} placeholder="Your organization" className="input" /></Field>}</>}<Button type="submit" disabled={busy} className="mt-3 w-full min-h-12">{busy ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}<ArrowRight className="h-4 w-4" /></Button></form><p className="mt-7 text-center text-sm text-[#6c8579]">{isLogin ? 'New to FoodBridge?' : 'Already have an account?'} <button className="font-bold text-[#397356] hover:underline" onClick={() => navigate(isLogin ? '/register' : '/login')}>{isLogin ? 'Create an account' : 'Log in'}</button></p></div></div></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-bold text-[#365a4b]"><span className="mb-2 block">{label}</span>{children}</label>;
}

function AppShell({ user, onLogout, navigate, children }: { user: User; onLogout: () => void; navigate: (path: string) => void; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = [{ path: '/dashboard', label: 'Overview', icon: Leaf }, { path: '/donations', label: user.role === 'NGO' ? 'Find donations' : 'My donations', icon: PackageCheck }, { path: '/requests', label: 'Requests', icon: HandHeart }, ...(user.role === 'VOLUNTEER' ? [{ path: '/pickups', label: 'My pickups', icon: Truck }] : [])];
  return <div className="min-h-screen bg-[#f7f9f3] text-[#163f35]"><aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-[#dce7db] bg-white p-5 transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}><div className="flex items-center justify-between"><Logo onClick={() => navigate('/dashboard')} /><button onClick={() => setMobileOpen(false)} className="lg:hidden"><X className="h-5 w-5" /></button></div><div className="mt-10 rounded-2xl bg-[#f0f6ed] p-4"><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#7b9588]">Your role</p><p className="mt-2 font-display text-xl font-extrabold">{roleName(user.role)}</p><p className="mt-1 text-xs text-[#6c8579]">{user.organization_name || 'Personal contributor'}</p></div><nav className="mt-8 space-y-1">{links.map(({ path, label, icon: Icon }) => <button key={path} onClick={() => { navigate(path); setMobileOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-[#638074] transition hover:bg-[#f0f6ed] hover:text-[#163f35]"><Icon className="h-4 w-4" />{label}</button>)}</nav><div className="absolute bottom-5 left-5 right-5"><div className="mb-4 rounded-2xl border border-[#e2ece0] p-4"><div className="flex items-center gap-2 text-sm font-bold"><CircleHelp className="h-4 w-4 text-[#df7a45]" /> Need a hand?</div><p className="mt-2 text-xs leading-5 text-[#779083]">Every pickup matters. Keep your availability up to date.</p></div><button onClick={onLogout} className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-[#71897e] hover:text-[#a13e3e]"><LogOut className="h-4 w-4" /> Log out</button></div></aside>{mobileOpen && <button aria-label="Close menu" className="fixed inset-0 z-30 bg-[#163f35]/25 lg:hidden" onClick={() => setMobileOpen(false)} />};<div className="lg:pl-72"><header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#e0e9de]/80 bg-[#f7f9f3]/90 px-5 backdrop-blur lg:px-8"><button className="lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button><div className="hidden items-center gap-2 text-sm text-[#6c8579] sm:flex"><span className="h-2 w-2 rounded-full bg-[#66a878]" /> Platform active <span className="text-[#c1d0c5]">/</span> {new Intl.DateTimeFormat('en-IN', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date())}</div><div className="flex items-center gap-3"><button className="relative grid h-9 w-9 place-items-center rounded-xl text-[#668074] hover:bg-white"><Bell className="h-4 w-4" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#df7a45]" /></button><div className="flex items-center gap-2 border-l border-[#dce7db] pl-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#d9ead6] text-xs font-extrabold text-[#397356]">{initials(user.name)}</span><span className="hidden text-sm font-bold sm:block">{user.name}</span><ChevronDown className="hidden h-4 w-4 text-[#779083] sm:block" /></div></div></header>{children}</div></div>;
}

function Dashboard({ user, navigate }: { user: User; navigate: (path: string) => void }) {
  const summary = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey(), enabled: true, staleTime: 30_000 } });
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), staleTime: 60_000 } });
  const data = summary.data;
  return <PageFrame><div className="flex flex-col justify-between gap-5 pt-6 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-[#779083]">Good morning, {user.name.split(' ')[0]}.</p><h1 className="mt-1 font-display text-4xl font-extrabold tracking-[-.06em] sm:text-5xl">Your impact, at a glance.</h1></div><div className="flex items-center gap-3"><span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${health.data ? 'border-[#cde3cf] bg-[#edf7ed] text-[#397356]' : 'border-[#e5e8df] bg-white text-[#779083]'}`}><span className={`h-1.5 w-1.5 rounded-full ${health.data ? 'bg-[#66a878]' : 'bg-[#c5d0c8]'}`} /> {health.data ? 'System healthy' : 'Connecting…'}</span>{user.role === 'DONOR' && <Button onClick={() => navigate('/donations/new')}><Plus className="h-4 w-4" /> Share food</Button>}</div></div>{summary.isLoading ? <LoadingBlock /> : summary.error ? <ErrorBlock message={getErrorMessage(summary.error, 'Your dashboard could not load.')} /> : <><div className="mt-10 grid gap-4 sm:grid-cols-3">{data && [[data.primary_metric, data.primary_label], [data.secondary_metric, data.secondary_label], [data.impact_metric, data.impact_label]].map(([value, label], index) => <div key={label as string} className={`rounded-2xl border p-5 ${index === 2 ? 'border-[#d7e8d4] bg-[#eaf4e7]' : 'border-[#e0e9de] bg-white'}`}><span className="text-3xl font-display font-extrabold tracking-[-.05em]">{value as number}</span><p className="mt-2 text-sm font-semibold text-[#6c8579]">{label as string}</p></div>)}</div><div className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><section className="rounded-2xl border border-[#e0e9de] bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#df7a45]">Recent activity</p><h2 className="mt-1 font-display text-2xl font-extrabold">Keep the chain moving</h2></div><BadgeCheck className="h-6 w-6 text-[#6a9a76]" /></div><div className="mt-5 divide-y divide-[#edf1eb]">{data?.recent_activity.map((item) => <div key={item.id} className="flex gap-3 py-4 first:pt-0 last:pb-0"><span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f0f6ed] text-[#397356]"><Check className="h-4 w-4" /></span><div><p className="text-sm font-bold">{item.title}</p><p className="mt-1 text-sm text-[#779083]">{item.detail}</p><p className="mt-1 text-xs font-semibold text-[#a1b2a8]">{formatDate(item.timestamp)}</p></div></div>)}</div></section><section className="rounded-2xl bg-[#163f35] p-6 text-white"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-[#bfe0c2]"><HandHeart className="h-5 w-5" /></span><h2 className="mt-8 max-w-xs font-display text-3xl font-extrabold leading-tight tracking-[-.05em]">Small actions add up.</h2><p className="mt-3 text-sm leading-6 text-[#c3d5ca]">The fastest way to make an impact today is to {user.role === 'DONOR' ? 'share safe surplus with a clear pickup window.' : user.role === 'NGO' ? 'find a donation that fits your community and request it.' : 'keep a pickup route moving from collection to delivery.'}</p><Button variant="secondary" className="mt-7 border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => navigate(user.role === 'DONOR' ? '/donations/new' : user.role === 'VOLUNTEER' ? '/pickups' : '/donations')}>Take the next step <ArrowRight className="h-4 w-4" /></Button></section></div></>}</PageFrame>;
}

function DonationsPage({ user, navigate }: { user: User; navigate: (path: string) => void }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const params = useMemo(() => ({ q: search || undefined, category: category || undefined, page: 1, page_size: 12 }), [search, category]);
  const donations = useListDonations(params, { query: { queryKey: getListDonationsQueryKey(params), enabled: true, staleTime: 20_000 } });
  const items = donations.data?.items || [];
  return <PageFrame><div className="flex flex-col justify-between gap-5 pt-6 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-[#779083]">{user.role === 'NGO' ? 'Find a good fit' : 'Your shared surplus'}</p><h1 className="mt-1 font-display text-4xl font-extrabold tracking-[-.06em]">{user.role === 'NGO' ? 'Browse donations' : 'My donations'}</h1></div>{user.role === 'DONOR' && <Button onClick={() => navigate('/donations/new')}><Plus className="h-4 w-4" /> Share food</Button>}</div><div className="mt-8 flex flex-col gap-3 rounded-2xl border border-[#e0e9de] bg-white p-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-[#9bb0a3]" /><input className="input pl-9" placeholder="Search by food, description or location" value={search} onChange={(e) => setSearch(e.target.value)} /></div><select className="input sm:w-52" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>{donations.isLoading ? <LoadingBlock /> : donations.error ? <ErrorBlock message={getErrorMessage(donations.error, 'Donations could not load.')} /> : items.length === 0 ? <EmptyBlock title={user.role === 'NGO' ? 'No donations match that search.' : 'Your first shared meal starts here.'} copy={user.role === 'NGO' ? 'Try another search or check back soon.' : 'Share safe surplus with a pickup window and let a community partner take it from there.'} action={user.role === 'DONOR' ? <Button onClick={() => navigate('/donations/new')}><Plus className="h-4 w-4" /> Create donation</Button> : undefined} /> : <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((donation) => <DonationCard key={donation.id} donation={donation} onClick={() => navigate(`/donations/${donation.id}`)} />)}</div>}</PageFrame>;
}

function DonationCard({ donation, onClick }: { donation: Donation; onClick: () => void }) {
  return <button onClick={onClick} className="group overflow-hidden rounded-2xl border border-[#e0e9de] bg-white text-left transition hover:-translate-y-0.5 hover:border-[#bdd5bb] hover:shadow-[0_14px_30px_rgba(42,73,57,.08)]"><div className="relative h-40 overflow-hidden bg-gradient-to-br from-[#f4dbac] via-[#e88d5b] to-[#b75a43]">{donation.image_url ? <img src={donation.image_url} alt="" className="h-full w-full object-cover" /> : <div className="absolute inset-0 p-4"><div className="flex h-full items-end"><span className="max-w-[75%] font-display text-2xl font-extrabold leading-none text-white">{donation.category}</span></div></div>}<span className="absolute right-3 top-3"><StatusPill status={donation.status} /></span></div><div className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-display text-xl font-extrabold tracking-[-.035em]">{donation.title}</p><p className="mt-1 text-sm text-[#779083]">{donation.quantity} {donation.quantity_unit} · {donation.dietary === 'vegetarian' ? 'Vegetarian' : 'Non-vegetarian'}</p></div><ArrowRight className="mt-1 h-4 w-4 text-[#9bb0a3] transition group-hover:translate-x-1 group-hover:text-[#397356]" /></div><div className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#779083]"><MapPin className="h-3.5 w-3.5 text-[#df7a45]" /> {donation.pickup_address}</div><div className="mt-2 flex items-center gap-2 text-xs font-semibold text-[#779083]"><Clock3 className="h-3.5 w-3.5 text-[#df7a45]" /> Pickup {formatTime(donation.pickup_start)}–{formatTime(donation.pickup_end)}</div></div></button>;
}

function DonationForm({ user, navigate }: { user: User; navigate: (path: string) => void }) {
  const queryClient = useQueryClient();
  const create = useCreateDonation({ mutation: { onSuccess: (donation) => { queryClient.invalidateQueries({ queryKey: getListDonationsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); toast.success('Donation shared with the FoodBridge network.'); navigate(`/donations/${donation.id}`); }, onError: (error) => toast.error(getErrorMessage(error, 'Donation could not be created.')) } });
  const [form, setForm] = useState({ title: '', description: '', category: categories[0], quantity: '', quantity_unit: 'kg', dietary: 'vegetarian' as 'vegetarian' | 'non-vegetarian', expiry_time: '', pickup_start: '', pickup_end: '', pickup_address: '', special_instructions: '' });
  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); const payload: DonationInput = { ...form, quantity: Number(form.quantity), image_url: null, special_instructions: form.special_instructions || null }; create.mutate({ data: payload }); };
  return <PageFrame><button onClick={() => navigate('/donations')} className="mt-4 flex items-center gap-2 text-sm font-bold text-[#678075]"><ChevronLeft className="h-4 w-4" /> Back to donations</button><div className="mt-8 max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#df7a45]">Donor workspace</p><h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-.06em]">Share safe surplus.</h1><p className="mt-3 text-[#6c8579]">Clear details help community partners plan a pickup that works.</p></div><form onSubmit={submit} className="mt-8 grid max-w-4xl gap-5 rounded-3xl border border-[#e0e9de] bg-white p-5 sm:p-8 md:grid-cols-2"><div className="md:col-span-2"><Field label="What are you sharing?"><input required className="input" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Fresh rice and dal meals" /></Field></div><div className="md:col-span-2"><Field label="Description"><textarea required minLength={5} className="input min-h-28 resize-y py-3" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Tell partners what is included and how it has been handled." /></Field></div><Field label="Food category"><select className="input" value={form.category} onChange={(e) => update('category', e.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Dietary"><select className="input" value={form.dietary} onChange={(e) => update('dietary', e.target.value)}><option value="vegetarian">Vegetarian</option><option value="non-vegetarian">Non-vegetarian</option></select></Field><Field label="Quantity"><div className="flex gap-2"><input required type="number" min="0.1" step="0.1" className="input" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} placeholder="12" /><select className="input w-28" value={form.quantity_unit} onChange={(e) => update('quantity_unit', e.target.value)}><option>kg</option><option>meals</option><option>boxes</option><option>litres</option></select></div></Field><Field label="Pickup address"><input required className="input" value={form.pickup_address} onChange={(e) => update('pickup_address', e.target.value)} placeholder="Building, street, area" /></Field><Field label="Expiry time"><input required type="datetime-local" className="input" value={form.expiry_time} onChange={(e) => update('expiry_time', e.target.value)} /></Field><Field label="Pickup starts"><input required type="datetime-local" className="input" value={form.pickup_start} onChange={(e) => update('pickup_start', e.target.value)} /></Field><Field label="Pickup ends"><input required type="datetime-local" className="input" value={form.pickup_end} onChange={(e) => update('pickup_end', e.target.value)} /></Field><div className="md:col-span-2"><Field label="Special handling instructions (optional)"><textarea className="input min-h-24 resize-y py-3" value={form.special_instructions} onChange={(e) => update('special_instructions', e.target.value)} placeholder="Keep chilled, bring a large container, contact security…" /></Field></div><div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#edf1eb] pt-5 md:col-span-2"><Button type="button" variant="ghost" onClick={() => navigate('/donations')}>Cancel</Button><Button type="submit" disabled={create.isPending}>{create.isPending ? 'Sharing…' : 'Share donation'} <ArrowRight className="h-4 w-4" /></Button></div></form></PageFrame>;
}

function DonationDetail({ donationId, user, navigate }: { donationId: string; user: User; navigate: (path: string) => void }) {
  const queryClient = useQueryClient();
  const donation = useGetDonation(donationId, { query: { enabled: Boolean(donationId), staleTime: 15_000, queryKey: getGetDonationQueryKey(donationId) } });
  const update = useUpdateDonation({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetDonationQueryKey(donationId) }); queryClient.invalidateQueries({ queryKey: getListDonationsQueryKey() }); toast.success('Donation details updated.'); }, onError: (error) => toast.error(getErrorMessage(error)) } });
  const cancel = useCancelDonation({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetDonationQueryKey(donationId) }); queryClient.invalidateQueries({ queryKey: getListDonationsQueryKey() }); toast.success('Donation cancelled.'); }, onError: (error) => toast.error(getErrorMessage(error)) } });
  const request = useCreateDonationRequest({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetDonationQueryKey(donationId) }); queryClient.invalidateQueries({ queryKey: getListDonationRequestsQueryKey() }); toast.success('Request sent to the donor.'); setMessage(''); }, onError: (error) => toast.error(getErrorMessage(error, 'Request could not be sent.')) } });
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const item = donation.data;
  useEffect(() => { if (item) { setEditTitle(item.title); setEditDescription(item.description); } }, [item]);
  if (donation.isLoading) return <PageFrame><LoadingBlock /></PageFrame>;
  if (donation.error || !item) return <PageFrame><ErrorBlock message={getErrorMessage(donation.error, 'Donation not found.')} /></PageFrame>;
  const canEdit = user.role === 'DONOR' && item.donor_id === user.id && ['AVAILABLE', 'REQUESTED'].includes(item.status);
  const canRequest = user.role === 'NGO' && ['AVAILABLE', 'REQUESTED'].includes(item.status);
  return <PageFrame><button onClick={() => navigate('/donations')} className="mt-4 flex items-center gap-2 text-sm font-bold text-[#678075]"><ChevronLeft className="h-4 w-4" /> Back to donations</button><div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_.9fr]"><section className="overflow-hidden rounded-3xl border border-[#e0e9de] bg-white"><div className="relative h-64 bg-gradient-to-br from-[#f4dbac] via-[#e88d5b] to-[#b75a43] p-7 sm:h-80"><span className="absolute right-5 top-5"><StatusPill status={item.status} /></span><div className="absolute bottom-7 left-7 right-7"><p className="text-sm font-bold uppercase tracking-[.14em] text-white/75">{item.category}</p><h1 className="mt-2 max-w-xl font-display text-4xl font-extrabold leading-tight tracking-[-.055em] text-white sm:text-5xl">{item.title}</h1></div></div><div className="p-6 sm:p-8"><div className="flex flex-wrap gap-6 border-b border-[#edf1eb] pb-6 text-sm"><span><strong className="block text-2xl font-display">{item.quantity}</strong><span className="text-[#779083]">{item.quantity_unit}</span></span><span><strong className="block text-2xl font-display">{item.dietary === 'vegetarian' ? 'Veg' : 'Non-veg'}</strong><span className="text-[#779083]">dietary</span></span><span><strong className="block text-2xl font-display">{item.request_count || 0}</strong><span className="text-[#779083]">requests</span></span></div>{editing ? <div className="mt-6 space-y-4"><Field label="Title"><input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></Field><Field label="Description"><textarea className="input min-h-28 py-3" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} /></Field><div className="flex gap-2"><Button onClick={() => { update.mutate({ donationId, data: { title: editTitle, description: editDescription } }); setEditing(false); }} disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save changes'}</Button><Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button></div></div> : <><h2 className="mt-6 font-display text-2xl font-extrabold">About this donation</h2><p className="mt-3 leading-7 text-[#6c8579]">{item.description}</p>{item.special_instructions && <div className="mt-5 rounded-2xl bg-[#fff8ed] p-4 text-sm leading-6 text-[#795d3c]"><strong className="block text-[#956526]">Special handling</strong>{item.special_instructions}</div>}</>}</div></section><aside className="space-y-4"><div className="rounded-3xl bg-[#163f35] p-6 text-white"><p className="text-xs font-bold uppercase tracking-[.15em] text-[#bfe0c2]">Pickup details</p><div className="mt-6 space-y-5"><div className="flex gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#efb18d]" /><div><p className="text-xs text-[#9bbbad]">Collection address</p><p className="mt-1 text-sm font-bold">{item.pickup_address}</p></div></div><div className="flex gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-[#efb18d]" /><div><p className="text-xs text-[#9bbbad]">Pickup window</p><p className="mt-1 text-sm font-bold">{formatDate(item.pickup_start)} – {formatTime(item.pickup_end)}</p></div></div><div className="flex gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-[#efb18d]" /><div><p className="text-xs text-[#9bbbad]">Best before</p><p className="mt-1 text-sm font-bold">{formatDate(item.expiry_time)}</p></div></div></div></div>{canRequest && <div className="rounded-3xl border border-[#e0e9de] bg-white p-6"><h2 className="font-display text-2xl font-extrabold">Request this donation</h2><p className="mt-2 text-sm leading-6 text-[#779083]">Tell the donor how this food will support your community.</p><textarea className="input mt-5 min-h-28 py-3" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="We can collect this today and distribute it to…" /><Button className="mt-3 w-full" disabled={request.isPending || message.length < 5} onClick={() => request.mutate({ data: { donation_id: donationId, message } })}>{request.isPending ? 'Sending…' : 'Send request'} <ArrowRight className="h-4 w-4" /></Button></div>}{canEdit && <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setEditing(true)}>Edit details</Button><Button variant="danger" disabled={cancel.isPending} onClick={() => { if (window.confirm('Cancel this donation?')) cancel.mutate({ donationId }); }}>Cancel donation</Button></div>}<div className="rounded-2xl border border-[#e0e9de] bg-white p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#9bb0a3]">Shared by</p><p className="mt-2 font-display text-xl font-extrabold">{item.donor_name}</p><p className="mt-1 text-sm text-[#779083]">FoodBridge donor</p></div></aside></div></PageFrame>;
}

function RequestsPage({ user, navigate }: { user: User; navigate: (path: string) => void }) {
  const queryClient = useQueryClient();
  const requests = useListDonationRequests({ query: { queryKey: getListDonationRequestsQueryKey(), enabled: true, staleTime: 15_000 } });
  const decide = useDecideDonationRequest({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListDonationRequestsQueryKey() }); queryClient.invalidateQueries({ queryKey: getListDonationsQueryKey() }); toast.success('Request updated.'); }, onError: (error) => toast.error(getErrorMessage(error)) } });
  const items = requests.data || [];
  return <PageFrame><div className="pt-6"><p className="text-sm font-semibold text-[#779083]">{user.role === 'DONOR' ? 'People are ready to help' : 'Your community pipeline'}</p><h1 className="mt-1 font-display text-4xl font-extrabold tracking-[-.06em]">{user.role === 'DONOR' ? 'Incoming requests' : 'My requests'}</h1><p className="mt-3 max-w-xl text-[#6c8579]">{user.role === 'DONOR' ? 'Review requests and choose the partner who can make the best use of your surplus.' : 'Keep track of every donation you have requested from the FoodBridge network.'}</p></div>{requests.isLoading ? <LoadingBlock /> : requests.error ? <ErrorBlock message={getErrorMessage(requests.error)} /> : items.length === 0 ? <EmptyBlock title="Nothing here yet." copy={user.role === 'DONOR' ? 'When an NGO requests one of your donations, it will show up here.' : 'Browse available donations to make your first request.'} action={user.role === 'NGO' ? <Button onClick={() => navigate('/donations')}>Browse donations <ArrowRight className="h-4 w-4" /></Button> : undefined} /> : <div className="mt-8 space-y-3">{items.map((request) => <RequestRow key={request.id} request={request} donor={user.role === 'DONOR'} busy={decide.isPending} onDecision={(decision) => decide.mutate({ requestId: request.id, data: { decision } })} onOpen={() => navigate(`/donations/${request.donation_id}`)} />)}</div>}</PageFrame>;
}

function RequestRow({ request, donor, busy, onDecision, onOpen }: { request: DonationRequest; donor: boolean; busy: boolean; onDecision: (decision: 'accept' | 'reject') => void; onOpen: () => void }) {
  return <div className="flex flex-col gap-4 rounded-2xl border border-[#e0e9de] bg-white p-5 sm:flex-row sm:items-center sm:justify-between"><button className="text-left" onClick={onOpen}><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff0df] text-[#df7a45]"><HandHeart className="h-5 w-5" /></span><div><p className="font-display text-xl font-extrabold tracking-[-.03em]">{request.donation_title}</p><p className="mt-1 text-sm text-[#779083]">{donor ? `Requested by ${request.ngo_name}` : request.message}</p></div></div><p className="mt-4 text-xs font-semibold text-[#9bb0a3]">{formatDate(request.created_at)}</p></button><div className="flex items-center gap-3 sm:shrink-0"><StatusPill status={request.status} />{donor && request.status === 'PENDING' && <><Button variant="secondary" className="min-h-9 px-3 text-xs" disabled={busy} onClick={() => onDecision('reject')}>Decline</Button><Button className="min-h-9 px-3 text-xs" disabled={busy} onClick={() => onDecision('accept')}>Accept</Button></>}</div></div>;
}

function PickupsPage({ navigate }: { navigate: (path: string) => void }) {
  const queryClient = useQueryClient();
  const pickups = useListPickups({ query: { queryKey: getListPickupsQueryKey(), enabled: true, staleTime: 15_000 } });
  const update = useUpdatePickupStatus({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListPickupsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); toast.success('Pickup status updated.'); }, onError: (error) => toast.error(getErrorMessage(error)) } });
  const items = pickups.data || [];
  const nextStatus: Record<string, 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED' | undefined> = { ASSIGNED: 'ACCEPTED', ACCEPTED: 'PICKED_UP', PICKED_UP: 'DELIVERED' };
  return <PageFrame><div className="pt-6"><p className="text-sm font-semibold text-[#779083]">Volunteer workspace</p><h1 className="mt-1 font-display text-4xl font-extrabold tracking-[-.06em]">Your pickup route.</h1><p className="mt-3 max-w-xl text-[#6c8579]">Every status update gives donors and community partners confidence that food is moving.</p></div>{pickups.isLoading ? <LoadingBlock /> : pickups.error ? <ErrorBlock message={getErrorMessage(pickups.error)} /> : items.length === 0 ? <EmptyBlock title="Your route is clear." copy="Assigned pickups will appear here when there is a delivery nearby." action={<Button onClick={() => navigate('/dashboard')}>Back to overview</Button>} /> : <div className="mt-8 space-y-3">{items.map((pickup) => <div key={pickup.id} className="rounded-2xl border border-[#e0e9de] bg-white p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf4e7] text-[#397356]"><Truck className="h-5 w-5" /></span><div><p className="font-display text-xl font-extrabold">{pickup.donation_title}</p><p className="mt-1 flex items-center gap-1 text-sm text-[#779083]"><MapPin className="h-3.5 w-3.5 text-[#df7a45]" /> {pickup.pickup_address}</p><p className="mt-2 text-xs font-bold text-[#9bb0a3]">{pickup.pickup_window} · For {pickup.recipient_name}</p></div></div><StatusPill status={pickup.status} /></div>{nextStatus[pickup.status] && <div className="mt-5 flex justify-end"><Button disabled={update.isPending} onClick={() => update.mutate({ pickupId: pickup.id, data: { status: nextStatus[pickup.status]! } })}>{nextStatus[pickup.status] === 'ACCEPTED' ? 'Accept pickup' : nextStatus[pickup.status] === 'PICKED_UP' ? 'Confirm pickup' : 'Confirm delivery'} <ArrowRight className="h-4 w-4" /></Button></div>}</div>)}</div>}</PageFrame>;
}

function LoadingBlock() {
  return <div className="mt-8 grid gap-4 sm:grid-cols-3"><div className="skeleton h-32 rounded-2xl" /><div className="skeleton h-32 rounded-2xl" /><div className="skeleton h-32 rounded-2xl" /></div>;
}

function ErrorBlock({ message }: { message: string }) {
  return <div className="mt-8 rounded-2xl border border-[#efc8c8] bg-[#fff7f7] p-6 text-sm text-[#a13e3e]"><p className="font-bold">We could not load this yet.</p><p className="mt-1">{message}</p></div>;
}

function EmptyBlock({ title, copy, action }: { title: string; copy: string; action?: ReactNode }) {
  return <div className="mt-8 rounded-3xl border border-dashed border-[#cbdccb] bg-white/65 px-6 py-16 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf4e7] text-[#397356]"><Leaf className="h-6 w-6" /></span><h2 className="mt-5 font-display text-2xl font-extrabold">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#779083]">{copy}</p>{action && <div className="mt-6">{action}</div>}</div>;
}

function AppContent() {
  const [location, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const me = useGetMe({ query: { queryKey: getGetMeQueryKey(), enabled: Boolean(user), staleTime: 60_000 } });
  useEffect(() => { if (me.data) { setUser(me.data); localStorage.setItem(userKey, JSON.stringify(me.data)); } }, [me.data]);
  const navigate = (path: string) => setLocation(path);
  const onSuccess = (nextUser: User, token: string) => { saveSession({ user: nextUser, access_token: token }); setUser(nextUser); navigate('/dashboard'); };
  const logout = () => { clearSession(); setUser(null); navigate('/'); toast.success('You have been logged out.'); };

  if (!user && location === '/') return <><Landing navigate={navigate} /><SonnerToaster position="top-right" richColors /></>;
  if (!user && location === '/about') return <><About navigate={navigate} /><SonnerToaster position="top-right" richColors /></>;
  if (!user && (location === '/login' || location === '/register')) return <><AuthPage mode={location === '/login' ? 'login' : 'register'} onSuccess={onSuccess} navigate={navigate} /><SonnerToaster position="top-right" richColors /></>;
  if (!user) { navigate('/'); return null; }
  const detailMatch = location.match(/^\/donations\/([^/]+)$/);
  let content: ReactNode;
  if (location === '/dashboard' || location === '/') content = <Dashboard user={user} navigate={navigate} />;
  else if (location === '/donations') content = <DonationsPage user={user} navigate={navigate} />;
  else if (location === '/donations/new') content = <DonationForm user={user} navigate={navigate} />;
  else if (detailMatch) content = <DonationDetail donationId={detailMatch[1]} user={user} navigate={navigate} />;
  else if (location === '/requests') content = <RequestsPage user={user} navigate={navigate} />;
  else if (location === '/pickups') content = <PickupsPage navigate={navigate} />;
  else content = <Dashboard user={user} navigate={navigate} />;
  return <><AppShell user={user} onLogout={logout} navigate={navigate}>{content}</AppShell><SonnerToaster position="top-right" richColors /></>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;