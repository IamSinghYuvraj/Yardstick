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
import { Plus, Search, Edit, Trash2, FileText, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

// Define types for Note and User based on your models and session structure
interface Author {
  _id: string;
  name?: string;
  email: string;
}

interface Note {
  _id: string;
  title: string;
  content: string;
  tenant: string;
  author: Author;
  createdAt: string;
  updatedAt: string;
}

interface SessionUser {
  id: string;
  email: string;
  name?: string;
  role: 'Admin' | 'Member';
  plan: 'Free' | 'Pro';
  tenant: {
    _id: string;
    name: string;
    slug: string;
  };
}

export function NotesManager() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(true);
  const [showUpgradeAlert, setShowUpgradeAlert] = useState(false);
  const [upgradeRequestStatus, setUpgradeRequestStatus] = useState(''); // '', 'loading', 'sent'

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
      const response = await fetch('/api/notes', { headers: getAuthHeaders() });
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
  }, [getAuthHeaders]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'user') {
        const userData = event.newValue;
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          if (parsedUser.plan !== user?.plan) {
            loadNotes();
          }
        } else {
          router.push('/login');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [router, user, loadNotes]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
      loadNotes();
    } else {
      router.push('/login');
    }
  }, [router, loadNotes]);

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNewNoteClick = () => {
    if (user?.plan === 'Free' && notes.length >= 3) {
      setShowUpgradeAlert(true);
      setError('You have reached the note limit for the Free plan.');
    } else {
      setIsCreateDialogOpen(true);
    }
  };

  const handleRequestUpgrade = async () => {
    setUpgradeRequestStatus('loading');
    try {
      const response = await fetch('/api/users/request-upgrade', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setUpgradeRequestStatus('sent');
        toast({
          title: 'Request Sent',
          description: 'Your request to upgrade to the Pro plan has been sent to the admin.',
        });
      } else {
        setUpgradeRequestStatus('');
        toast({
          title: 'Failed to send request',
          description: data.error || 'An unexpected error occurred.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setUpgradeRequestStatus('');
      console.error('Error requesting upgrade:', error);
      toast({
        title: 'Connection Error',
        description: 'Could not connect to the server to request an upgrade.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');
    setShowUpgradeAlert(false);

    try {
      let response;
      if (editingNote) {
        // Update existing note
        response = await fetch(`/api/notes/${editingNote._id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(formData),
        });
      } else {
        // Create new note
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
      } else if (response.status === 403) {
        setError(data.error || 'Note limit reached.');
        if (user?.plan === 'Free') {
          setShowUpgradeAlert(true);
        }
      } else {
        setError(data.error || 'Failed to save note');
      }
    } catch (err) {
      console.error('Error saving note:', err);
      setError('Failed to save note. Please try again.');
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

  const resetForm = () => {
    setFormData({ title: '', content: '' });
    setEditingNote(null);
    setError('');
    setShowUpgradeAlert(false);
  };

  if (notesLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading notes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notes</h1>
          <p className="text-gray-500 mt-1">Manage your notes and ideas</p>
        </div>
        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={handleNewNoteClick} className="bg-blue-600 hover:bg-blue-700">
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
              {error && !showUpgradeAlert && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {showUpgradeAlert && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription className="flex items-center justify-between">
                    <span>{error}</span>
                    <Button
                      size="sm"
                      onClick={handleRequestUpgrade}
                      disabled={upgradeRequestStatus === 'loading' || upgradeRequestStatus === 'sent'}
                    >
                      {upgradeRequestStatus === 'loading' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {upgradeRequestStatus === 'sent' ? 'Request Sent' : 'Upgrade to Pro'}
                    </Button>
                  </AlertDescription>
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
                      Saving...
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

      {showUpgradeAlert && user?.plan === 'Free' && (
        <Alert variant="default" className="mt-4 bg-yellow-100 border-yellow-400">
          <AlertDescription className="flex items-center justify-between">
            <span className="text-yellow-800">You've reached your note limit. Upgrade to Pro for unlimited notes.</span>
            <Button
              size="sm"
              onClick={handleRequestUpgrade}
              disabled={upgradeRequestStatus === 'loading' || upgradeRequestStatus === 'sent'}
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              {upgradeRequestStatus === 'loading' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {upgradeRequestStatus === 'sent' ? 'Request Sent' : 'Request Upgrade'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

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
            {!searchTerm && (
              <Button onClick={handleNewNoteClick}>
                <Plus className="w-4 h-4 mr-2" />
                Create Note
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note) => (
            <Card key={note._id} className="group hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {note.title}
                  </CardTitle>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(note);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(note._id);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="flex items-center space-x-2">
                  <span>Updated {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</span>
                  {user?.role === 'Admin' && (
                    <Badge variant="outline" className="text-xs">
                      {note.author._id === user.id ? 'Your note' : `By ${note.author.name || note.author.email}`}
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
  );
}
