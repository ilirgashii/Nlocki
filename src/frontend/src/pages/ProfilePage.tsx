import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Edit3,
  Flame,
  Lock,
  MessageCircle,
  Pencil,
  Save,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  useFollowUser,
  useGoals,
  useIsFollowing,
  useMyUserId,
  useProfile,
  useSaveGoals,
  useUnfollowUser,
  useUpdateProfile,
  useUpdateProfilePhoto,
  useUserPosts,
} from "../hooks/use-backend";
import { useCanMessage } from "../hooks/use-messages";
import type { Post } from "../types";

function FollowButton({ userId }: { userId: string }) {
  const { data: isFollowing } = useIsFollowing(userId);
  const follow = useFollowUser();
  const unfollow = useUnfollowUser();

  if (isFollowing) {
    return (
      <Button
        type="button"
        variant="outline"
        className="border-primary/40 text-primary hover:bg-primary/10 hover:border-primary transition-smooth"
        onClick={() => unfollow.mutate(userId)}
        disabled={unfollow.isPending}
        data-ocid="profile.unfollow_button"
      >
        Following
      </Button>
    );
  }
  return (
    <Button
      type="button"
      className="bg-primary text-primary-foreground hover:bg-primary/90 transition-smooth"
      onClick={() => follow.mutate(userId)}
      disabled={follow.isPending}
      data-ocid="profile.follow_button"
    >
      Follow
    </Button>
  );
}

function PostGrid({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return (
      <div
        className="col-span-3 py-12 flex flex-col items-center gap-2"
        data-ocid="profile.posts.empty_state"
      >
        <p className="text-sm text-muted-foreground">No posts yet.</p>
        <p className="text-xs text-muted-foreground/60">
          Share your first post in the People feed.
        </p>
      </div>
    );
  }
  return (
    <>
      {posts.map((post, i) => (
        <div
          key={post.id}
          className="aspect-square rounded-xl overflow-hidden bg-muted border border-border hover:border-primary/30 transition-smooth"
          data-ocid={`profile.post.item.${i + 1}`}
        >
          {post.photoUrl ? (
            <img
              src={post.photoUrl}
              alt="Post"
              className="w-full h-full object-cover hover:scale-105 transition-smooth"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-3">
              <p className="text-xs text-muted-foreground text-center line-clamp-4 leading-relaxed">
                {post.text}
              </p>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

// ---- Profile photo uploader (own profile only) ----
function PhotoUploadButton({
  currentAvatarUrl,
  username,
}: {
  currentAvatarUrl?: string;
  username: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updatePhoto = useUpdateProfilePhoto();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    try {
      await updatePhoto.mutateAsync(file);
      toast.success("Profile photo updated!");
    } catch {
      toast.error("Upload failed. Please try again.");
    }
    e.target.value = "";
  };

  return (
    <button
      type="button"
      className="relative group cursor-pointer"
      data-ocid="profile.photo_upload.dropzone"
      onClick={() => fileInputRef.current?.click()}
      aria-label="Upload profile photo"
    >
      <div
        className="rounded-full p-0.5"
        style={{
          background:
            "linear-gradient(135deg, oklch(var(--primary)) 0%, oklch(0.6 0.25 300) 100%)",
        }}
      >
        <div className="rounded-full p-0.5 bg-card">
          <Avatar className="w-20 h-20">
            <AvatarImage src={currentAvatarUrl} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-display font-bold">
              {username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
      {/* Pencil overlay on hover */}
      <div className="absolute inset-0 rounded-full bg-foreground/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-smooth pointer-events-none">
        <Pencil className="w-5 h-5 text-card" />
      </div>
      {updatePhoto.isPending && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none border-2 border-primary animate-pulse"
          data-ocid="profile.photo_upload.loading_state"
        />
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        data-ocid="profile.photo_upload.upload_button"
        aria-label="Upload profile photo"
      />
    </button>
  );
}

function GoalSettingsModal({ onClose }: { onClose: () => void }) {
  const { data: goals } = useGoals();
  const saveGoals = useSaveGoals();

  const [calories, setCalories] = useState(
    String(goals?.dailyCalorieTarget ?? 2000),
  );
  const [workouts, setWorkouts] = useState(
    String(goals?.weeklyMinWorkouts ?? 3),
  );

  const handleSave = () => {
    const dailyCalorieTarget = Math.max(
      1,
      Number.parseInt(calories, 10) || 2000,
    );
    const weeklyMinWorkouts = Math.max(1, Number.parseInt(workouts, 10) || 3);
    saveGoals.mutate(
      { dailyCalorieTarget, weeklyMinWorkouts },
      { onSuccess: onClose },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm"
      data-ocid="profile.goals.dialog"
    >
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm mx-4 shadow-elevated space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-foreground flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Goal Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-ocid="profile.goals.close_button"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-primary" />
              Daily Calorie Target
            </Label>
            <Input
              type="number"
              min={1}
              max={10000}
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="2000"
              className="bg-input border-border"
              data-ocid="profile.goals.calories_input"
            />
            <p className="text-xs text-muted-foreground">
              Recommended: 1800–2500 kcal/day
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-primary" />
              Weekly Workout Minimum
            </Label>
            <Input
              type="number"
              min={1}
              max={14}
              value={workouts}
              onChange={(e) => setWorkouts(e.target.value)}
              placeholder="3"
              className="bg-input border-border"
              data-ocid="profile.goals.workouts_input"
            />
            <p className="text-xs text-muted-foreground">
              Number of workout days per week (Mon–Sun)
            </p>
          </div>

          <div className="rounded-xl px-4 py-3 space-y-1 border border-primary/20 bg-primary/5">
            <p className="text-xs font-semibold text-primary">Preview</p>
            <p className="text-xs text-muted-foreground">
              Calorie bar:{" "}
              <span className="text-foreground font-medium">
                0 / {calories || "2000"} kcal
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Weekly badge:{" "}
              <span className="text-foreground font-medium">
                0 / {workouts || "3"} workouts this week
              </span>
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-border"
            onClick={onClose}
            data-ocid="profile.goals.cancel_button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
            onClick={handleSave}
            disabled={saveGoals.isPending}
            data-ocid="profile.goals.save_button"
          >
            <Save className="w-3.5 h-3.5" />
            Save Goals
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditProfileModal({ onClose }: { onClose: () => void }) {
  const myId = useMyUserId();
  const { data: profile } = useProfile(myId);
  const updateProfile = useUpdateProfile();

  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [isPublic, setIsPublic] = useState(profile?.isPublic ?? false);

  const handleSave = () => {
    updateProfile.mutate(
      {
        displayName: displayName.trim() || undefined,
        username: username.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        bio: bio.trim(),
        isPublic,
      },
      {
        onSuccess: () => {
          toast.success("Profile updated!");
          onClose();
        },
        onError: () => toast.error("Failed to update profile."),
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm overflow-y-auto py-8"
      data-ocid="profile.edit.dialog"
    >
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-elevated space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-foreground">
            Edit Profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-ocid="profile.edit.close_button"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Display Name
            </Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your full name"
              className="bg-input border-border"
              data-ocid="profile.edit.displayname_input"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Username
            </Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_username"
              className="bg-input border-border"
              data-ocid="profile.edit.username_input"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Email
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="bg-input border-border"
              data-ocid="profile.edit.email_input"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Phone Number
            </Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 8900"
              className="bg-input border-border"
              data-ocid="profile.edit.phone_input"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Bio
            </Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell people about yourself…"
              className="bg-input border-border resize-none min-h-[72px]"
              data-ocid="profile.edit.bio_input"
            />
          </div>
          <div className="flex items-center justify-between py-2 border-t border-border">
            <div>
              <p className="text-sm font-medium text-foreground">
                Public profile
              </p>
              <p className="text-xs text-muted-foreground">
                Others can see your posts and bio
              </p>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
              data-ocid="profile.edit.public_switch"
            />
          </div>
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            🔒 Weight, workouts, nutrition, and progress are always private and
            never shared publicly.
          </p>
        </div>

        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-border"
            onClick={onClose}
            data-ocid="profile.edit.cancel_button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
            onClick={handleSave}
            disabled={updateProfile.isPending || !username.trim()}
            data-ocid="profile.edit.save_button"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { userId } = useParams({ from: "/app/profile/$userId" });
  const myId = useMyUserId();
  const isOwn = userId === myId;
  const { data: profile, isLoading } = useProfile(userId);
  const { data: posts = [] } = useUserPosts(userId);
  const { data: isFollowing } = useIsFollowing(userId);
  const { data: canMessage } = useCanMessage(userId);
  const [editOpen, setEditOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const navigate = useNavigate();

  const canSeeContent = isOwn || profile?.isPublic || isFollowing;

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-[40vh]"
        data-ocid="profile.loading_state"
      >
        <p className="text-muted-foreground text-sm">Loading profile…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[40vh] gap-3"
        data-ocid="profile.error_state"
      >
        <p className="font-display font-semibold text-foreground">
          Profile not found
        </p>
        <Link to="/people" className="text-sm text-primary hover:underline">
          ← Back to People
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6" data-ocid="profile.page">
      {/* Back nav */}
      <Link
        to="/people"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-smooth"
        data-ocid="profile.back_link"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to People
      </Link>

      {/* Profile header card */}
      <Card className="bg-card border-border overflow-hidden">
        {/* Banner gradient */}
        <div
          className="h-24 relative"
          style={{
            background:
              "linear-gradient(135deg, oklch(var(--primary)/0.3) 0%, oklch(0.6 0.25 300 / 0.2) 100%)",
          }}
        />
        <CardContent className="px-5 pb-5 -mt-10 relative">
          <div className="flex items-end justify-between">
            {isOwn ? (
              <PhotoUploadButton
                currentAvatarUrl={profile.avatarUrl}
                username={profile.username}
              />
            ) : (
              <div
                className="rounded-full p-0.5"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(var(--primary)) 0%, oklch(0.6 0.25 300) 100%)",
                }}
              >
                <div className="rounded-full p-0.5 bg-card">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={profile.avatarUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-display font-bold">
                      {profile.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-2">
              {isOwn ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-border hover:border-primary/50 hover:text-primary transition-smooth"
                    onClick={() => setGoalsOpen(true)}
                    data-ocid="profile.goals.open_modal_button"
                  >
                    <Target className="w-3.5 h-3.5" />
                    Goals
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-border hover:border-primary/50 hover:text-primary transition-smooth"
                    onClick={() => setEditOpen(true)}
                    data-ocid="profile.edit_button"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-border hover:border-primary/50 hover:text-primary transition-smooth"
                    onClick={() =>
                      navigate({
                        to: "/messages/$userId",
                        params: { userId },
                      })
                    }
                    data-ocid="profile.message_button"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {canMessage ? "Message" : "Request"}
                  </Button>
                  <FollowButton userId={userId} />
                </div>
              )}
            </div>
          </div>

          {isOwn && (
            <p className="text-xs text-muted-foreground/60 mt-1.5 flex items-center gap-1">
              <Pencil className="w-3 h-3" />
              Tap your photo to change it
            </p>
          )}

          <div className="mt-3 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              {profile.displayName && (
                <h1 className="font-display font-bold text-xl text-foreground">
                  {profile.displayName}
                </h1>
              )}
              <h2
                className={`font-semibold text-foreground ${profile.displayName ? "text-base text-muted-foreground" : "font-display font-bold text-xl"}`}
              >
                @{profile.username}
              </h2>
              <Badge
                variant="outline"
                className={`text-xs ${profile.isPublic ? "border-primary/30 text-primary" : "border-border text-muted-foreground"}`}
              >
                {profile.isPublic ? "Public" : "Private"}
              </Badge>
            </div>

            {canSeeContent && profile.bio && (
              <p className="text-sm text-muted-foreground">{profile.bio}</p>
            )}

            {/* Unique user ID badge */}
            <p className="text-xs text-muted-foreground/40 font-mono pt-0.5">
              ID: {profile.userId.slice(0, 8)}
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-4">
            <div className="text-center">
              <p className="font-display font-bold text-lg text-foreground">
                {canSeeContent ? posts.length : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
            <div className="text-center">
              <p className="font-display font-bold text-lg text-foreground">
                {profile.followersCount}
              </p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="text-center">
              <p className="font-display font-bold text-lg text-foreground">
                {profile.followingCount}
              </p>
              <p className="text-xs text-muted-foreground">Following</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content area */}
      {canSeeContent ? (
        <div data-ocid="profile.posts.section">
          <h2 className="font-display font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full bg-primary"
              aria-hidden="true"
            />
            {isOwn ? "Your Posts" : "Posts"}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <PostGrid posts={posts} />
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col items-center py-16 gap-4 bg-card border border-border rounded-2xl"
          data-ocid="profile.private.section"
        >
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-7 h-7 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-display font-semibold text-foreground">
              This account is private
            </p>
            <p className="text-sm text-muted-foreground">
              Follow to see their posts and content.
            </p>
          </div>
          {!isOwn && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {profile.followersCount} followers
              </span>
            </div>
          )}
          {!isOwn && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 border-border hover:border-primary/50 hover:text-primary transition-smooth"
                onClick={() =>
                  navigate({ to: "/messages/$userId", params: { userId } })
                }
                data-ocid="profile.private.message_button"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                {canMessage ? "Message" : "Request"}
              </Button>
              <FollowButton userId={userId} />
            </div>
          )}
        </div>
      )}

      {editOpen && <EditProfileModal onClose={() => setEditOpen(false)} />}
      {goalsOpen && <GoalSettingsModal onClose={() => setGoalsOpen(false)} />}
    </div>
  );
}
