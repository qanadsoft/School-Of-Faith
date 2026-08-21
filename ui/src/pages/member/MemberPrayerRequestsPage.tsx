import { useState } from 'react';
import { MemberDetailLayout } from '@/components/MemberDetailLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth';
import { usePrayerRequests } from '@/lib/hooks';
import { api } from '@/lib/api';
import { Heart, HeartHandshake, Sparkles, Check, Trash2 } from 'lucide-react';

export function MemberPrayerRequestsPage() {
  const { profile } = useAuth();
  const { requests, loading, refresh } = usePrayerRequests(profile?.id);
  const [showForm, setShowForm] = useState(false);
  const [requestType, setRequestType] = useState<'request' | 'praise'>('request');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!description.trim() || !profile) return;
    try {
      setSubmitting(true);
      await api.submitPrayerRequest({
        title: title.trim() || description.trim().slice(0, 50),
        description: description.trim(),
        type: requestType,
        isAnonymous: anonymous,
      });
      setTitle('');
      setDescription('');
      setShowForm(false);
      refresh();
    } catch (err) {
      console.error('Failed to submit prayer request:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const markAnswered = async (id: string) => {
    try {
      await api.markMyPrayerRequestAnswered(id);
      refresh();
    } catch (err) {
      console.error('Failed to mark answered:', err);
    }
  };

  const deleteRequest = async (id: string) => {
    try {
      await api.deleteMyPrayerRequest(id);
      refresh();
    } catch (err) {
      console.error('Failed to delete request:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">Approved (On Wall)</Badge>;
      case 'answered':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">Answered Praise</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-xs">Rejected</Badge>;
      case 'archived':
        return <Badge variant="outline" className="text-xs text-muted-foreground">Archived</Badge>;
      default:
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">Pending Review</Badge>;
    }
  };

  if (loading) {
    return (
      <MemberDetailLayout title="Prayer Requests">
        <p className="text-muted-foreground">Loading your prayer requests...</p>
      </MemberDetailLayout>
    );
  }

  return (
    <MemberDetailLayout title="Prayer Requests">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Track the status and prayers for your submitted needs and praise reports.
        </p>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'New Request'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="space-y-4 p-5">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={requestType === 'request' ? 'default' : 'outline'}
                onClick={() => setRequestType('request')}
                className="gap-1.5"
              >
                <HeartHandshake className="h-4 w-4" /> Prayer Request
              </Button>
              <Button
                type="button"
                size="sm"
                variant={requestType === 'praise' ? 'default' : 'outline'}
                onClick={() => setRequestType('praise')}
                className="gap-1.5"
              >
                <Sparkles className="h-4 w-4" /> Praise Report
              </Button>
            </div>

            <Input
              placeholder="Title or summary (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <Textarea
              placeholder={
                requestType === 'praise'
                  ? 'Share what God has done in your life...'
                  : 'Share your prayer need...'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Post anonymously
              </label>

              <Button onClick={submit} disabled={submitting || !description.trim()}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {requests.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
          <p className="mb-1 text-lg font-medium text-foreground">You have no prayer requests</p>
          <p className="text-sm font-light">Share your prayer needs or praise reports with the community.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-serif text-lg font-medium">{r.title || 'Prayer Request'}</h3>
                      <Badge variant={r.type === 'praise' ? 'default' : 'secondary'} className="text-[10px]">
                        {r.type === 'praise' ? 'Praise Report' : 'Prayer Request'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(r.created_at).toLocaleDateString()}
                      {r.is_anonymous && ' · Posted anonymously'}
                    </p>
                  </div>
                  <div>{getStatusBadge(r.status)}</div>
                </div>

                <p className="text-sm text-foreground/90 whitespace-pre-line">{r.description}</p>

                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 font-medium text-primary">
                    <Heart className="h-3.5 w-3.5 fill-primary" /> {r.prays ?? r.prayer_count ?? 0} Praying
                  </span>

                  <div className="flex items-center gap-2">
                    {r.status !== 'answered' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAnswered(r.id)}
                        className="h-8 gap-1 text-xs"
                      >
                        <Check className="h-3.5 w-3.5" /> Mark Answered
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRequest(r.id)}
                      className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </MemberDetailLayout>
  );
}
