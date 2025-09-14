'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  Trash2,
  FileText,
  Building2,
  LogOut,
  Settings,
  User as UserIcon,
  Crown,
  Zap,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Define types for Note, User, Tenant based on your models
interface Note {
  _id: string;
  title: string;
  content: string;
  tenant: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

interface Tenant {
  _id: string;
  name: string;
  slug: string;
  plan: 'Free' | 'Pro';
  // Add other tenant properties if needed, like maxNotes if it's part of the client-side tenant object
}

export default function NotesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [notes, setNotes] = useState<Note[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user) {
      // Fetch tenant details if needed, or rely on session.user.tenant if it contains enough info
      // For now, let's assume session.user.tenant has the basic info needed
      // If you need more tenant details (like maxNotes), you'd fetch it from /api/tenants/:slug
      const userTenant = session.user.tenant as Tenant; // Cast to Tenant type
      setTenant(userTenant);
      loadNotes();
    }
  }, [session, status, router]);

  const loadNotes = async () => {
    setNotesLoading(true);
    try {
      const response = await fetch('/api/notes');
      const data = await response.json();

      if (response.ok && data.success) {
        setNotes(data.notes);
      } else if (response.status === 401) {
        signOut({ callbackUrl: '/login' }); // Redirect to login on unauthorized
      } else {
        setError(data.error || 'Failed to load notes');
      }
    } catch (err) {
      console.error('Error loading notes:', err);
      setError('Failed to load notes. Please try again.');
    } finally {
      setNotesLoading(false);
    }
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setNotes(prev => [data.note, ...prev]);
        setFormData({ title: '', content: '' });
        setIsCreateDialogOpen(false);
      } else if (response.status === 403) {
        setError(data.error || 'Note limit reached.');
      } else {
        setError(data.error || 'Failed to create note');
      }
    } catch (err) {
      console.error('Error creating note:', err);
      setError('Failed to create note. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setNotes(prev => prev.filter(n => n._id !== noteId));
      } else {
        setError(data.error || 'Failed to delete note');
      }
    } catch (err) {
      console.error('Error deleting note:', err);
      setError('Failed to delete note. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!tenant) return;

    setUpgrading(true);
    try {
      const response = await fetch(`/api/tenants/${tenant.slug}/upgrade`, {
        method: 'POST',
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setTenant(prev => (prev ? { ...prev, plan: 'Pro' } : null));
        // Optionally, re-fetch notes to ensure any limits are immediately reflected
        loadNotes();
        router.refresh(); // Refresh the session to get the new plan
      } else {
        setError(data.error || 'Failed to upgrade');
      }
    } catch (err) {
      console.error('Error upgrading tenant:', err);
      setError('Failed to upgrade. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  const resetForm = () => {
    setFormData({ title: '', content: '' });
    setError('');
  };

  // Show loading state for notes or initial session loading
  if (status === 'loading' || notesLoading || !session?.user || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Assuming tenant.maxNotes is available from the session or fetched tenant object
  // If not, you might need to fetch full tenant details or define a default maxNotes for Free plan
  const maxNotesForFreePlan = 3; // Define the limit for Free plan
  const currentMaxNotes = tenant.plan === 'Pro' ? -1 : maxNotesForFreePlan; // -1 for unlimited
  const canCreateNote = tenant.plan === 'Pro' || notes.length < currentMaxNotes;
  const shouldShowUpgrade = tenant.plan === 'Free' && notes.length >= currentMaxNotes;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-lg"
                style={{ backgroundColor: '#3B82F6' }} // Placeholder color, ideally from tenant object
              >
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{tenant.name}</h1>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={tenant.plan === 'Pro' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {tenant.plan === 'Pro' ? (
                      <><Crown className="w-3 h-3 mr-1" />Pro</>
                    ) : (
                      'Free'
                    )}
                  </Badge>
                  {tenant.plan === 'Free' && (
                    <span className="text-xs text-gray-500">
                      {notes.length}/{maxNotesForFreePlan} notes used
                    </span>
                  )}
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto p-2">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                        {session.user.name ? session.user.name.split(' ').map(n => n[0]).join('').toUpperCase() : session.user.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left hidden sm:block">
                      <p className="text-sm font-medium">{session.user.name || session.user.email}</p>
                      <p className="text-xs text-gray-500">{session.user.role}</p>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">{session.user.name || session.user.email}</p>
                    <p className="text-xs text-gray-500 font-normal">{session.user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Notes</h2>
              <p className="text-gray-500 mt-1">Create and manage your team's notes</p>
            </div>

            <div className="flex items-center space-x-3">
              {shouldShowUpgrade && (
                <Button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {upgrading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  Upgrade to Pro
                </Button>
              )}

              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={(open) => {
                  setIsCreateDialogOpen(open);
                  if (!open) resetForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
                    disabled={!canCreateNote}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Note
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Note</DialogTitle>
                    <DialogDescription>
                      Add a new note to your collection.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter note title"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Write your note content..."
                        rows={6}
                        required
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Note'
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Upgrade Banner */}
          {shouldShowUpgrade && (
            <Card className="border-2 border-dashed border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                      <Crown className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Note limit reached
                      </h3>
                      <p className="text-gray-600">
                        Upgrade to Pro plan for unlimited notes and advanced features.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleUpgrade}
                    disabled={upgrading}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {upgrading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    Upgrade Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes Grid */}
          {filteredNotes.length === 0 ? (
            <Card className="border-dashed border-2 border-gray-200">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'No notes found' : 'No notes yet'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm
                    ? 'Try adjusting your search terms'
                    : 'Create your first note to get started'
                  }
                </p>
                {!searchTerm && canCreateNote && (
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Note
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNotes.map((note) => (
                <Card key={note._id} className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {note.title}
                      </CardTitle>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(note._id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <CardDescription>
                      Updated {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 line-clamp-4">
                      {note.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
