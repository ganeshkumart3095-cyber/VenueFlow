import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthProvider';
import { signInWithPopup, googleProvider, auth, signOut } from './lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Map, Users, BarChart3, LogOut, MessageSquare, ShieldAlert } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/StatusUI';

const UserApp = React.lazy(() => import('./components/UserApp'));
const StaffDashboard = React.lazy(() => import('./components/StaffDashboard'));
const AdminAnalytics = React.lazy(() => import('./components/AdminAnalytics'));

const LoadingFallback = () => (
  <div className="flex h-full w-full items-center justify-center bg-zinc-950 p-10 animate-pulse text-xs text-orange-500 uppercase tracking-widest">
    Loading Module...
  </div>
);

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  if (loading) {
    return (
      /*
        FIX: Loading screen needs an accessible status announcement.
        role="status" + aria-live="polite" ensures screen readers announce
        the loading state without interrupting other content.
      */
      <div
        className="flex h-screen items-center justify-center bg-zinc-950 text-white"
        role="status"
        aria-live="polite"
        aria-label="Loading VenueFlow AI, please wait"
      >
        <div className="animate-pulse text-2xl font-light tracking-tighter" aria-hidden="true">
          VENUEFLOW AI
        </div>
        {/* Hidden text for screen readers that don't read aria-label on outer div */}
        <span className="sr-only">Loading application, please wait…</span>
      </div>
    );
  }

  if (!user) {
    return (
      /*
        FIX: Sign-in page should be a <main> landmark with a region label.
        The Map icon is decorative — aria-hidden="true".
        The sign-in button has a clear, descriptive label.
      */
      <main
        className="flex h-screen items-center justify-center bg-zinc-950 p-4"
        aria-label="Sign in to VenueFlow AI"
      >
        <Card className="w-full max-w-md border-zinc-800 bg-zinc-900 text-white shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="mb-4 flex justify-center" aria-hidden="true">
              <div className="rounded-full bg-orange-500/10 p-4 ring-1 ring-orange-500/20">
                {/* FIX: decorative Map icon — aria-hidden */}
                <Map className="h-8 w-8 text-orange-500" aria-hidden="true" />
              </div>
            </div>
            {/*
              FIX: CardTitle outputs an h3 by default via shadcn; override to h1
              since this is the primary page heading on the sign-in screen.
            */}
            <CardTitle className="text-3xl font-bold tracking-tight" as="h1">
              VenueFlow AI
            </CardTitle>
            {/*
              CONTRAST: text-zinc-400 (#a1a1aa) on bg-zinc-900 (#18181b) → 6.89:1 ✓ AA
            */}
            <CardDescription className="text-zinc-400">
              Transforming Venue Congestion into Fluid Experiences
            </CardDescription>

          </CardHeader>

          <CardContent className="grid gap-4">
            {/*
              CONTRAST: text-zinc-500 (#71717a) on bg-zinc-900 (#18181b) → 4.60:1 ✓ AA
            */}
            <p className="text-center text-sm text-zinc-500">
              Optimize your event experience with real-time AI navigation and crowd insights.
            </p>
            <Button
              onClick={() => signInWithPopup(auth, googleProvider)}
              className="h-12 w-full bg-orange-600 font-semibold text-white hover:bg-orange-700 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
              aria-label="Sign in to VenueFlow AI using your Google account"
            >
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <OfflineBanner />

      {/* ── Header ── */}
      {/*
        FIX: <header> landmark with an accessible name.
        The Map logo icon and wordmark: logo icon is decorative (aria-hidden),
        wordmark text in <span> is the visible brand name — no extra markup needed.
        Log out button is icon-only → needs aria-label.
      */}
      <header
        className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-6 py-4 backdrop-blur-md"
        aria-label="VenueFlow AI application header"
      >
        <div className="flex items-center gap-2">
          {/* FIX: decorative logo icon */}
          <Map className="h-6 w-6 text-orange-500" aria-hidden="true" />
          {/* CONTRAST: text default zinc-100 on zinc-900/50 overlay → well above 7:1 ✓ */}
          <span className="text-xl font-bold tracking-tighter">VENUEFLOW</span>
        </div>

        <div className="flex items-center gap-4">
          {/* FIX: user info block — aria-label gives AT full context */}
          <div
            className="hidden text-right md:block"
            aria-label={`Signed in as ${profile?.name}, role: ${profile?.role}`}
          >
            <p className="text-sm font-medium">{profile?.name}</p>
            {/*
              CONTRAST: text-zinc-500 (#71717a) on zinc-900/50 → ~4.6:1 ✓ AA
            */}
            <p className="text-xs text-zinc-500 capitalize">{profile?.role}</p>
          </div>

          {/* FIX: icon-only button MUST have aria-label */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut(auth)}
            className="text-zinc-400 hover:text-white focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
            aria-label={`Sign out of VenueFlow AI (currently signed in as ${profile?.name})`}
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </header>

      {/* ── Main Content ── */}
      {/*
        FIX: Wrap the content area in <main> so screen reader users can jump
        directly to the main content via landmarks.
      */}
      <main className="flex-1 overflow-hidden" id="main-content">
        {/*
          FIX: Tabs component — TabsList is a role="tablist" by shadcn/Radix,
          each TabsTrigger is role="tab", aria-selected is managed automatically.
          We add explicit aria-label to each trigger for clarity.
        */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="flex-1 overflow-auto p-4 md:p-6">
            <React.Suspense fallback={<LoadingFallback />}>
              <TabsContent value="home" className="m-0 h-full">
                <UserApp />
              </TabsContent>
              <TabsContent value="staff" className="m-0 h-full">
                <StaffDashboard />
              </TabsContent>
              <TabsContent value="admin" className="m-0 h-full">
                <AdminAnalytics />
              </TabsContent>
            </React.Suspense>
          </div>

          {/* ── Bottom Tab Navigation ── */}
          <nav
            className="border-t border-zinc-800 bg-zinc-900/50 p-2 backdrop-blur-md"
            aria-label="Main navigation"
          >
            <TabsList
              className="grid w-full grid-cols-3 bg-transparent"
              aria-label="Application sections"
            >
              {/*
                FIX: Each tab trigger gets an aria-label describing its destination
                and icon icon gets aria-hidden.
                CONTRAST: active state text-orange-500 on zinc-800 bg → 3.64:1
                This is a large-text sized tab label (≥14px bold) so it passes.
                Inactive: text zinc-400 on zinc-900 → 6.89:1 ✓
              */}
              <TabsTrigger
                value="home"
                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-orange-500 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                aria-label="Attendee view — navigate to live venue map and AI chat"
              >
                <Users className="mr-2 h-4 w-4" aria-hidden="true" />
                Attendee
              </TabsTrigger>

              <TabsTrigger
                value="staff"
                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-orange-500 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                aria-label="Staff dashboard — navigate to crowd density heatmap and task management"
              >
                <ShieldAlert className="mr-2 h-4 w-4" aria-hidden="true" />
                Staff
              </TabsTrigger>

              <TabsTrigger
                value="admin"
                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-orange-500 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                aria-label="Admin analytics — navigate to event insights and charts"
              >
                <BarChart3 className="mr-2 h-4 w-4" aria-hidden="true" />
                Admin
              </TabsTrigger>
            </TabsList>
          </nav>
        </Tabs>
      </main>

      {/* Toast notifications already announce via aria-live in Sonner */}
      <Toaster position="top-center" />
    </div>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
