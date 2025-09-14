// app/notes/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  Crown,
  Zap,
  Loader2,
  Edit
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast'; // Import useToast

interface Note {
  _id: string;
  title: string;
  content: string;
  tenant: string;
  author: {
    _id: string;
    name?: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
  role: 'Admin' | 'Member';
  tenant: {
    _id: string;
    name: string;
    slug: string;
    plan: 'Free' | 'Pro';
  };
}

export default function NotesPage() {
  const router = useRouter();
  const { toast } = useToast(); // Initialize useToast

  const [user, setUser] = useState<User | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [requestingUpgrade, setRequestingUpgrade] = useState(false);

  // Get auth headers for API requests
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }, []);

  const loadNotes = useCallback(async () => {
    setNotesLoading(true);
    try {
      const response = await fetch('/api/notes', {
        headers: getAuthHeaders()
      });

      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }

      const data = await response.json();

      if (response.ok && data.success) {
        setNotes(data.notes);
      } else {
        setError(data.error || 'Failed to load notes');
      }
    } catch (err) {
      console.error('Error loading notes:', err);
      setError('Failed to load notes. Please try again.');
    } finally {
      setNotesLoading(false);
    }
  }, [getAuthHeaders, router]);

  useEffect(() => {
    // Check authentication on component mount
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData) as User;
      setUser(parsedUser);
      loadNotes();
    } catch (err) {
      console.error('Error parsing user data:', err);
      router.push('/login');
    }
  }, [router, loadNotes]);

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      let response;
      if (editingNote) {
        response = await fetch(`/api/notes/${editingNote._id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(formData),
        });
      } else {
        response = await fetch('/api/notes', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(formData),
        });
      }

      const data = await response.json();

      if (response.ok && data.success) {
        if (editingNote) {
          setNotes(prev => prev.map(n => n._id === data.note._id ? data.note : n));
        } else {
          setNotes(prev => [data.note, ...prev]);
        }
        setFormData({ title: '', content: '' });
        setIsCreateDialogOpen(false);
        setEditingNote(null);
        toast({
          title: editingNote ? "Note updated!" : "Note created!",
          description: editingNote ? "Your note has been updated." : "Your new note has been saved.",
        });
      } else if (response.status === 403) {
        setError(data.error || 'Note limit reached. Please upgrade to Pro plan.');
        toast({
          title: "Note Limit Reached",
          description: data.error || "You have reached the maximum number of notes for your Free plan. Please upgrade to Pro.",
          variant: "destructive",
        });
      } else {
        setError(data.error || 'Failed to save note');
        toast({
          title: "Error",
          description: data.error || 'Failed to save note.',
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error saving note:', err);
      setError('Failed to save note. Please try again.');
      toast({
        title: "Error",
        description: "Could not connect to the server to save note.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setFormData({ title: note.title, content: note.content });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = async (noteId: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setNotes(prev => prev.filter(n => n._id !== noteId));
        toast({
          title: "Note deleted!",
          description: "The note has been successfully deleted.",
        });
      } else {
        setError(data.error || 'Failed to delete note');
        toast({
          title: "Error",
          description: data.error || 'Failed to delete note.',
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error deleting note:', err);
      setError('Failed to delete note. Please try again.');
      toast({
        title: "Error",
        description: "Could not connect to the server to delete note.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Admin-only direct upgrade
  const handleAdminUpgrade = async () => {
    if (!user || user.role !== 'Admin' || !user.tenant?.slug) return;

    setUpgrading(true);
    try {
      const response = await fetch(`/api/tenants/${user.tenant.slug}/upgrade`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const updatedUser = {
          ...user,
          tenant: { ...user.tenant, plan: 'Pro' as const }
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        loadNotes(); // Reload notes to reflect new limits
        toast({
          title: "Tenant Upgraded!",
          description: "Your tenant has been successfully upgraded to the Pro plan.",
        });
      } else {
        setError(data.error || 'Failed to upgrade tenant');
        toast({
          title: "Upgrade Failed",
          description: data.error || 'Failed to upgrade tenant.',
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error upgrading tenant:', err);
      setError('Failed to upgrade. Please try again.');
      toast({
        title: "Error",
        description: "Could not connect to the server to upgrade tenant.",
        variant: "destructive",
      });
    } finally {
      setUpgrading(false);
    }
  };

  // User-initiated upgrade request
  const handleRequestUpgrade = async () => {
    if (!user || !user.tenant?.slug) return;

    setRequestingUpgrade(true);
    try {
      const response = await fetch(`/api/tenants/${user.tenant.slug}/request-upgrade`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Upgrade Request Sent!",
          description: "Your upgrade request has been sent to the admin.",
        });
      } else {
        toast({
          title: "Request Failed",
          description: data.error || 'Failed to send upgrade request.',
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error requesting upgrade:', err);
      toast({
        title: "Error",
        description: "Could not connect to the server to send upgrade request.",
        variant: "destructive",
      });
    } finally {
      setRequestingUpgrade(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const resetForm = () => {
    setFormData({ title: '', content: '' });
    setEditingNote(null);
    setError('');
  };

  if (notesLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  const maxNotesForFreePlan = 3;
  const canCreateNote = user.tenant.plan === 'Pro' || notes.length < maxNotesForFreePlan;
  const shouldShowUpgradeUI = user.tenant.plan === 'Free' && notes.length >= maxNotesForFreePlan;

  const upgradeButtonHandler = user.role === 'Admin' ? handleAdminUpgrade : handleRequestUpgrade;
  const upgradeButtonLoading = user.role === 'Admin' ? upgrading : requestingUpgrade;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-lg bg-blue-600"
              >
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{user.tenant.name}</h1>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={user.tenant.plan === 'Pro' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {user.tenant.plan === 'Pro' ? (
                      <><Crown className="w-3 h-3 mr-1" />Pro</>
                    ) : (
                      'Free'
                    )}
                  </Badge>
                  {user.tenant.plan === 'Free' && (
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
                        {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : user.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left hidden sm:block">
                      <p className="text-sm font-medium">{user.name || user.email}</p>
                      <p className="text-xs text-gray-500">{user.role}</p>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">{user.name || user.email}</p>
                    <p className="text-xs text-gray-500 font-normal">{user.email}</p>
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
              {shouldShowUpgradeUI && (
                <Button
                  onClick={upgradeButtonHandler}
                  disabled={upgradeButtonLoading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {upgradeButtonLoading ? (
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
                    <DialogTitle>{editingNote ? 'Edit Note' : 'Create New Note'}</DialogTitle>
                    <DialogDescription>
                      {editingNote ? 'Update your note details.' : 'Add a new note to your collection.'}
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
                            {editingNote ? 'Updating...' : 'Creating...'}
                          </>
                        ) : (
                          editingNote ? 'Update Note' : 'Create Note'
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
          {shouldShowUpgradeUI && (
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
                    onClick={upgradeButtonHandler}
                    disabled={upgradeButtonLoading}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {upgradeButtonLoading ? (
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
                      <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(note)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(note._id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription className="flex items-center justify-between">
                      <span>Updated {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</span>
                      {user.role === 'Admin' && (
                        <Badge variant="outline" className="text-xs">
                          {note.author && note.author._id === user.id ? 'Your note' : `By ${note.author?.name || note.author?.email}`}
                        </Badge>
                      )}
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
