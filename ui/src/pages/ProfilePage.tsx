import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, BookOpen, Clock, Calendar, Award, ChevronRight,
  CreditCard, Heart, Ticket, Camera, Trash2, X, Upload, Check, LogOut
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  useMemberTags, useMemberStats, useReadingProgress,
} from '@/lib/hooks';
import { BrandPdfReaderModal } from '@/components/BrandPdfReaderModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { tags } = useMemberTags(profile?.id);
  const { stats } = useMemberStats(profile?.id);
  const { data: reading, refresh: refreshReading } = useReadingProgress(profile?.id);
  const [readingModalOpen, setReadingModalOpen] = useState(false);

  // Settings & Avatar upload modal state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [firstNameInput, setFirstNameInput] = useState(profile?.first_name || '');
  const [lastNameInput, setLastNameInput] = useState(profile?.last_name || '');
  const [bioInput, setBioInput] = useState(profile?.bio || '');
  const [previewImage, setPreviewImage] = useState<string | null>(profile?.profile_image || null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!profile) return null;

  const firstName = profile.first_name || '';
  const lastName = profile.last_name || '';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'SJ';
  
  const joinDate = profile.join_date ? new Date(profile.join_date) : new Date();
  const joinMonthYear = joinDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const statCards = [
    { label: 'COURSES', value: stats.courseCount, icon: BookOpen, color: 'text-blue-500', path: '/member/courses' },
    { label: 'HOURS WATCHED', value: stats.hoursWatched, icon: Clock, color: 'text-emerald-500', path: '/watch' },
    { label: 'EVENTS', value: stats.eventsAttended, icon: Calendar, color: 'text-purple-500', path: '/member/event-tickets' },
    { label: 'CERTIFICATES', value: stats.certificateCount, icon: Award, color: 'text-foreground/80 dark:text-muted-foreground', path: '/member/certificates' },
  ];

  const menuItems = [
    { label: 'Saved Messages', icon: Clock, path: '/member/saved-messages' },
    { label: 'My Downloads', icon: BookOpen, path: '/member/downloads' },
    { label: 'Giving History', icon: CreditCard, path: '/member/giving-history' },
    { label: 'Prayer Requests', icon: Heart, path: '/member/prayer-requests' },
    { label: 'Event Tickets', icon: Ticket, path: '/member/event-tickets' },
  ];

  const handleOpenSettings = () => {
    setFirstNameInput(profile.first_name || '');
    setLastNameInput(profile.last_name || '');
    setBioInput(profile.bio || '');
    setPreviewImage(profile.profile_image || null);
    setImageError(null);
    setSettingsOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setImageError('Please select a valid image file (JPEG, PNG, WebP, GIF).');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 400;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setPreviewImage(canvas.toDataURL('image/jpeg', 0.85));
          } else {
            setPreviewImage(reader.result as string);
          }
        };
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    setPreviewImage(null);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setImageError(null);
    try {
      if (previewImage === null && profile.profile_image) {
        await api.deleteMemberProfileImage();
      }
      await api.updateMemberProfile({
        firstName: firstNameInput,
        lastName: lastNameInput,
        bio: bioInput,
        profileImage: previewImage,
      });
      await refreshProfile();
      setSettingsOpen(false);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setImageError(err?.message || 'Failed to update profile details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-4 pb-24 md:p-8 md:pb-12 space-y-6">
      {/* ─── Profile Header (Matching Screenshot Exactly) ─── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-5">
          {/* Avatar Initials / Image Gold Circle */}
          <div
            onClick={handleOpenSettings}
            className="flex h-20 w-20 md:h-24 md:w-24 shrink-0 items-center justify-center rounded-full bg-[#C69A50] text-2xl md:text-3xl font-serif font-medium text-white shadow-sm overflow-hidden relative group cursor-pointer"
            title="Click to update profile photo"
          >
            {profile.profile_image ? (
              <img
                src={profile.profile_image}
                alt={`${firstName} ${lastName}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{initials}</span>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </div>

          {/* Name, Joined & Badges */}
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-serif tracking-tight">
              <span className="font-normal text-foreground">{firstName}</span>{' '}
              <span className="font-normal italic text-[#C69A50]">{lastName}</span>
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground font-light">
              Joined {joinMonthYear}
            </p>

            {/* Badges / Tags */}
            <div className="flex flex-wrap items-center gap-2 pt-1.5">
              {tags.length > 0 ? (
                tags.map((tag) => {
                  const isPrayer = tag.name.toLowerCase().includes('prayer');
                  return (
                    <span
                      key={tag.id}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-light ${
                        isPrayer
                          ? 'bg-[#FAF4EB] text-[#C69A50] border border-[#F0E4D2] dark:bg-primary/10 dark:text-primary dark:border-primary/20'
                          : 'bg-[#F1EFE9] text-foreground/80 dark:bg-muted dark:text-muted-foreground'
                      }`}
                    >
                      {isPrayer ? (
                        <Heart className="h-3 w-3 text-[#C69A50] dark:text-primary" />
                      ) : (
                        <Award className="h-3 w-3 text-muted-foreground" />
                      )}
                      {tag.name}
                    </span>
                  );
                })
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1EFE9] px-3 py-0.5 text-xs font-light text-foreground/80 dark:bg-muted dark:text-muted-foreground">
                    <Award className="h-3 w-3 text-muted-foreground" />
                    Faithful Member
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Settings Button */}
        <button
          onClick={handleOpenSettings}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-white text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:bg-card shadow-sm"
          title="Account Settings & Edit Profile"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* ─── Statistics Cards (4 Cards Grid) ─── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              onClick={() => stat.path && navigate(stat.path)}
              className="rounded-2xl border border-border/70 bg-white p-5 text-center shadow-sm dark:bg-card dark:border-border cursor-pointer hover:border-primary/60 hover:shadow-md transition-all active:scale-[0.98]"
            >
              <Icon className={`h-6 w-6 mx-auto mb-2 stroke-[1.6] ${stat.color}`} />
              <div className="text-3xl font-sans font-bold text-foreground">{stat.value}</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Monthly Reading Plan ─── */}
      {reading.plan && (
        <div
          onClick={() => setReadingModalOpen(true)}
          className="rounded-2xl border border-border/70 bg-white p-6 shadow-sm dark:bg-card dark:border-border space-y-4 cursor-pointer hover:border-[#C59B46]/50 hover:shadow-md transition-all active:scale-[0.99]"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-base text-foreground">Monthly Reading Plan</h3>
              <p className="text-xs text-muted-foreground font-light mt-0.5">{reading.plan.name}</p>
            </div>
            <span className="font-medium text-sm text-[#C59B46] dark:text-primary">
              Day {reading.completedDays}/{reading.totalDays}
            </span>
          </div>

          {/* Progress Bar matching reference image with light grey track & gold fill */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#EAE6DE] dark:bg-muted/70">
            <div
              className="h-full rounded-full bg-[#C59B46] transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, reading.percentage))}%` }}
            />
          </div>

          <p className="text-right text-xs text-muted-foreground font-light">
            {reading.percentage}% Complete
          </p>
        </div>
      )}

      {/* Brand PDF Reader Modal for Profile Reading Plan */}
      {reading.plan && (
        <BrandPdfReaderModal
          isOpen={readingModalOpen}
          onClose={() => setReadingModalOpen(false)}
          planData={reading.plan}
          initialDay={Math.max(1, Math.min(reading.totalDays || 30, reading.completedDays + 1))}
          onProgressUpdated={refreshReading}
        />
      )}

      {/* ─── Menu List (Matching Screenshot) ─── */}
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-white shadow-sm dark:bg-card dark:border-border divide-y divide-border/60">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex w-full items-center gap-4 py-4 px-5 text-left transition-colors hover:bg-muted/30"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FAF7F2] text-[#C69A50] dark:bg-muted dark:text-primary shrink-0">
                <Icon className="h-4 w-4 stroke-[1.6]" />
              </div>
              <span className="flex-1 text-sm font-normal text-foreground">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </button>
          );
        })}
      </div>

      {/* ─── Log Out Button ─── */}
      <button
        onClick={async () => {
          await signOut();
          navigate('/login');
        }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 py-3.5 px-5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 active:scale-[0.99]"
      >
        <LogOut className="h-4 w-4" />
        <span>Log Out</span>
      </button>

      {/* ─── Account Settings & Profile Image Edit Modal ─── */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-background border border-border shadow-2xl space-y-6 p-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-serif text-xl font-semibold text-foreground">Edit Account Profile</h3>
              <button
                onClick={() => setSettingsOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Avatar Upload & Preview */}
            <div className="flex flex-col items-center space-y-3">
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-[#C69A50] text-3xl font-serif font-medium text-white shadow-md overflow-hidden">
                {previewImage ? (
                  <img src={previewImage} alt="Profile Preview" className="h-full w-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5 text-xs"
                >
                  <Upload className="h-3.5 w-3.5" /> Upload Photo
                </Button>
                {previewImage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemovePhoto}
                    className="gap-1 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">Supported: JPG, PNG, WebP, GIF (Max 5MB)</p>
            </div>

            {imageError && (
              <p className="text-xs text-destructive text-center bg-destructive/10 p-2.5 rounded-xl">
                {imageError}
              </p>
            )}

            {/* Form Inputs */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">First Name</label>
                  <Input
                    value={firstNameInput}
                    onChange={(e) => setFirstNameInput(e.target.value)}
                    placeholder="First Name"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Last Name</label>
                  <Input
                    value={lastNameInput}
                    onChange={(e) => setLastNameInput(e.target.value)}
                    placeholder="Last Name"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Bio / Personal Quote</label>
                <textarea
                  rows={2}
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  placeholder="Share a short bio or reflection..."
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={() => setSettingsOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="bg-[#C59B46] hover:bg-[#b0843d] text-white gap-1.5"
              >
                {isSaving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
