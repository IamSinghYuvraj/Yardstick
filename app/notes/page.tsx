// app/notes/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Search, Edit, Trash2, FileText, Loader2, AlertCircle, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {DashboardLayout} from '@/components/dashboard/DashboardLayout';
import { useToast } from '@/hooks/use-toast';

import { ClientUser } from '@/types/index';

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

export default function NotesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<ClientUser | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(true);
  const [showUpgradeAlert, setShowUpgradeAlert] = useState(false);

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
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setNotes(data.notes);
      } else if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      } else {
        setError(data.error || 'Failed to load notes');
        toast({
          title: "Failed to load notes",
          description: data.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error loading notes:', err);
      setError('Failed to load notes. Please try again.');
      toast({
        title: "Connection Error",
        description: "Could not connect to the server to load notes.",
        variant: "destructive",
      });
    } finally {
      setNotesLoading(false);
    }
  }, [getAuthHeaders, router, toast]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData) as ClientUser;
      setCurrentUser(parsedUser);
      loadNotes();
    } catch (err) {
      console.error('Error parsing user data:', err);
      router.push('/login');
    }
  }, [router, loadNotes]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const filteredNotes = useMemo(() => {
    return notes.filter(note =>
      note.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [notes, debouncedSearchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Both title and content are required');
      return;
    }

    setLoading(true);
    setError('');
    setShowUpgradeAlert(false);

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
          toast({
            title: "Note updated!",
            description: "Your note has been successfully updated.",
          });
        } else {
          setNotes(prev => [data.note, ...prev]);
          toast({
            title: "Note created!",
            description: "Your new note has been successfully created.",
          });
        }
        setFormData({ title: '', content: '' });
        setIsCreateDialogOpen(false);
        setEditingNote(null);
      } else if (response.status === 403) {
        const errorMsg = data.error || 'Note limit reached.';
        setError(errorMsg);
        if (currentUser?.tenant.plan === 'Free' && errorMsg.includes('limit')) {
          setShowUpgradeAlert(true);
        }
        toast({
          title: "Cannot create note",
          description: errorMsg,
          variant: "destructive",
        });
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      } else {
        const errorMsg = data.error || 'Failed to save note';
        setError(errorMsg);
        toast({
          title: "Failed to save note",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error saving note:', err);
      const errorMsg = 'Failed to save note. Please try again.';
      setError(errorMsg);
      toast({
        title: "Connection Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setFormData({ title: note.title, content: note.content });
    setError('');
    setShowUpgradeAlert(false);
    setIsCreateDialogOpen(true);
  };

  const handleDelete = async (noteId: string) => {
    if (!currentUser) return;
    
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
          title: "Note deleted",
          description: "Your note has been successfully deleted.",
        });
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      } else {
        const errorMsg = data.error || 'Failed to delete note';
        toast({
          title: "Failed to delete note",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error deleting note:', err);
      toast({
        title: "Connection Error",
        description: "Could not connect to the server to delete note.",
        variant: "destructive",
      });
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

  const canUserEdit = (note: Note) => {
    if (!currentUser) return false;
    return note.author._id === currentUser.id || currentUser.role === 'Admin';
  };

  if (notesLoading || !currentUser) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading notes...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notes</h1>
            <p className="text-gray-500 mt-1">
              {currentUser.tenant.plan === 'Free' 
                ? `Manage your notes (${notes.length}/3 used)`
                : 'Manage your notes and ideas'
              }
            </p>
          </div>
          
          {currentUser.role !== 'Admin' && (
            <Dialog 
              open={isCreateDialogOpen} 
              onOpenChange={(open) => {
                setIsCreateDialogOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    if (currentUser.tenant.plan === 'Free' && notes.length >= 3) {
                      setShowUpgradeAlert(true);
                      setError('You have reached the 3-note limit for the Free plan. Please upgrade to Pro for unlimited notes.');
                    } else {
                      setIsCreateDialogOpen(true);
                    }
                  }}
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
                  {error && !showUpgradeAlert && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {showUpgradeAlert && (
                    <Alert className="border-orange-200 bg-orange-50">
                      <Zap className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        <div className="flex items-center justify-between">
                          <span>{error}</span>
                          <Button
                              size="sm"
                              onClick={() => router.push('/dashboard/settings')}
                              className="ml-2"
                            >
                              Upgrade to Pro
                            </Button>
                        </div>
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
          )}
        </div>

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

        {/* Plan Limit Warning for Free users */}
        {currentUser.tenant.plan === 'Free' && notes.length >= 3 && (
          <Alert className="border-orange-200 bg-orange-50">
            <Zap className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <div className="flex items-center justify-between">
                <span>You've reached the 3-note limit for the Free plan. Upgrade to Pro for unlimited notes.</span>
                {currentUser.role === 'Admin' && (
                  <Button
                    size="sm"
                    onClick={() => router.push('/dashboard/settings')}
                    className="ml-2"
                  >
                    Upgrade Now
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
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
                  : currentUser.role === 'Admin'
                    ? 'Your team members can create notes here'
                    : 'Create your first note to get started'
                }
              </p>
              {!searchTerm && currentUser.role !== 'Admin' && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Note
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map((note) => (
              <Card key={note._id} className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {note.title}
                    </CardTitle>
                    {canUserEdit(note) && (
                      <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(note);
                          }}
                          disabled={loading}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to delete this note?')) {
                              handleDelete(note._id);
                            }
                          }}
                          disabled={loading}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <CardDescription className="flex items-center justify-between">
                    <span>Updated {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</span>
                    {currentUser.role === 'Admin' && (
                      <Badge variant="outline" className="text-xs">
                        By {note.author._id === currentUser.id ? 'You' : note.author.email}
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
    </DashboardLayout>
  );
}