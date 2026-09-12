import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Heart,
  ImageIcon,
  MessageCircle,
  Plus,
  Search,
  Send,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  useAddComment,
  useComments,
  useCreatePost,
  useCreateStory,
  useDeleteComment,
  useDeletePost,
  useFeed,
  useFollowUser,
  useFollowing,
  useIsFollowing,
  useLikePost,
  useMyProfile,
  useMyUserId,
  useSearchUsers,
  useStories,
  useUnfollowUser,
  useUnlikePost,
} from "../hooks/use-backend";
import { useUnreadCount } from "../hooks/use-messages";
import type { Post, Story } from "../types";

// ---- Story viewer (full-screen overlay) ----
function StoryViewer({
  story,
  onClose,
}: {
  story: Story;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 backdrop-blur-md"
      data-ocid="people.story_viewer"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      aria-label="Story viewer"
      tabIndex={-1}
    >
      <div
        className="relative max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-10 right-0 text-card hover:text-primary transition-smooth z-10"
          aria-label="Close story"
          data-ocid="people.story_viewer.close_button"
        >
          <X className="w-7 h-7" />
        </button>
        <div className="rounded-2xl overflow-hidden shadow-elevated relative">
          <img
            src={story.photoUrl}
            alt={`Story by ${story.authorUsername}`}
            className="w-full object-cover max-h-[72vh]"
          />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-foreground/80 to-transparent">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-card">
                @{story.authorUsername}
              </span>
            </div>
            {story.text && <p className="text-sm text-card/90">{story.text}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Story circle ----
function StoryCircle({
  story,
  onClick,
}: {
  story: Story;
  onClick: () => void;
}) {
  const initials = story.authorUsername.slice(0, 2).toUpperCase();
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 shrink-0 group"
      data-ocid="people.story.item"
    >
      <div className="rounded-full p-[2px] bg-gradient-to-tr from-primary to-primary/60 ring-offset-2 ring-offset-background group-hover:shadow-md transition-smooth">
        <Avatar className="w-14 h-14 border-2 border-card">
          <AvatarImage src={story.photoUrl} />
          <AvatarFallback className="bg-muted text-foreground text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
      <span className="text-xs text-foreground max-w-[56px] truncate">
        {story.authorUsername}
      </span>
    </button>
  );
}

// ---- Add Story form ----
function AddStoryButton() {
  const [open, setOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [text, setText] = useState("");
  const createStory = useCreateStory();

  const handleSubmit = () => {
    if (!photoUrl.trim()) return;
    createStory.mutate(
      { photoUrl: photoUrl.trim(), text: text.trim() || undefined },
      {
        onSuccess: () => {
          setOpen(false);
          setPhotoUrl("");
          setText("");
        },
      },
    );
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-col items-center gap-1.5 shrink-0"
        data-ocid="people.add_story.open_modal_button"
      >
        <div
          className="rounded-full border-2 border-dashed border-primary flex items-center justify-center bg-primary/5 hover:bg-primary/10 transition-smooth"
          style={{ width: 60, height: 60 }}
        >
          <Plus className="w-6 h-6 text-primary" />
        </div>
        <span className="text-xs text-primary font-medium">Add story</span>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-foreground/50 backdrop-blur-sm"
      data-ocid="people.add_story.dialog"
    >
      <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm mx-4 shadow-elevated space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-foreground">
            Add Story
          </h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            data-ocid="people.add_story.close_button"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <Input
          placeholder="Photo URL"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          className="bg-input border-border"
          data-ocid="people.add_story.photo_input"
        />
        <Input
          placeholder="Caption (optional)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="bg-input border-border"
          data-ocid="people.add_story.caption_input"
        />
        <Button
          type="button"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleSubmit}
          disabled={!photoUrl.trim() || createStory.isPending}
          data-ocid="people.add_story.submit_button"
        >
          Share Story
        </Button>
      </div>
    </div>
  );
}

// ---- Inline follow toggle (compact, for post headers) ----
function PostFollowButton({ userId }: { userId: string }) {
  const { data: isFollowing } = useIsFollowing(userId);
  const follow = useFollowUser();
  const unfollow = useUnfollowUser();

  if (isFollowing) {
    return (
      <button
        type="button"
        className="text-xs font-medium text-primary hover:text-primary/70 transition-smooth"
        onClick={() => unfollow.mutate(userId)}
        disabled={unfollow.isPending}
        data-ocid="people.post.unfollow_toggle"
      >
        Following
      </button>
    );
  }
  return (
    <button
      type="button"
      className="text-xs font-medium text-primary hover:text-primary/80 transition-smooth flex items-center gap-1"
      onClick={() => follow.mutate(userId)}
      disabled={follow.isPending}
      data-ocid="people.post.follow_toggle"
    >
      <UserPlus className="w-3 h-3" />
      Follow
    </button>
  );
}

// ---- Full-size follow button for search results ----
function FollowButton({ userId }: { userId: string }) {
  const { data: isFollowing } = useIsFollowing(userId);
  const follow = useFollowUser();
  const unfollow = useUnfollowUser();

  if (isFollowing) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-primary/40 text-primary hover:bg-primary/10 hover:border-primary transition-smooth text-xs"
        onClick={() => unfollow.mutate(userId)}
        disabled={unfollow.isPending}
        data-ocid="people.unfollow_button"
      >
        Following
      </Button>
    );
  }
  return (
    <Button
      type="button"
      size="sm"
      className="bg-primary text-primary-foreground hover:bg-primary/90 transition-smooth text-xs"
      onClick={() => follow.mutate(userId)}
      disabled={follow.isPending}
      data-ocid="people.follow_button"
    >
      Follow
    </Button>
  );
}

// ---- Comments section ----
function CommentsSection({ post }: { post: Post }) {
  const myId = useMyUserId();
  const { data: comments = [] } = useComments(post.id);
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!text.trim()) return;
    addComment.mutate(
      { postId: post.id, text: text.trim() },
      { onSuccess: () => setText("") },
    );
  };

  return (
    <div className="border-t border-border mt-3 pt-3 space-y-2">
      {comments.length === 0 && (
        <p className="text-xs text-muted-foreground/60 py-1">
          No comments yet — be the first!
        </p>
      )}
      {comments.map((c, i) => (
        <div
          key={c.id}
          className="flex items-start gap-2 group"
          data-ocid={`people.comment.item.${i + 1}`}
        >
          <Avatar className="w-6 h-6 shrink-0">
            <AvatarFallback className="bg-muted text-foreground text-xs">
              {c.authorUsername.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 bg-muted/40 rounded-lg px-2.5 py-1.5">
            <span className="text-xs font-semibold text-foreground mr-1.5">
              @{c.authorUsername}
            </span>
            <span className="text-xs text-foreground/80 break-words">
              {c.text}
            </span>
          </div>
          {c.authorId === myId && (
            <button
              type="button"
              onClick={() =>
                deleteComment.mutate({ commentId: c.id, postId: post.id })
              }
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-smooth shrink-0 mt-1.5"
              aria-label="Delete comment"
              data-ocid={`people.comment.delete_button.${i + 1}`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <Input
          ref={inputRef}
          placeholder="Add a comment…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="h-8 text-xs bg-input border-border"
          data-ocid="people.comment.input"
        />
        <Button
          type="button"
          size="sm"
          className="h-8 px-2.5 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
          onClick={handleSubmit}
          disabled={!text.trim() || addComment.isPending}
          data-ocid="people.comment.submit_button"
        >
          <Send className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ---- Post card ----
function PostCard({ post, index }: { post: Post; index: number }) {
  const myId = useMyUserId();
  const [showComments, setShowComments] = useState(false);
  const likePost = useLikePost();
  const unlikePost = useUnlikePost();
  const deletePost = useDeletePost();
  const isOwn = post.authorId === myId;

  const relativeTime = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <Card
      className="bg-card border-border hover:shadow-subtle transition-smooth"
      data-ocid={`people.post.item.${index + 1}`}
    >
      <CardContent className="p-4 space-y-3">
        {/* Author header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link to="/profile/$userId" params={{ userId: post.authorId }}>
              <Avatar className="w-9 h-9 ring-2 ring-primary/20 shrink-0">
                <AvatarImage src={post.authorAvatarUrl} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {post.authorUsername.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to="/profile/$userId"
                  params={{ userId: post.authorId }}
                  className="font-semibold text-sm text-foreground hover:text-primary transition-smooth truncate"
                >
                  @{post.authorUsername}
                </Link>
                {!isOwn && <PostFollowButton userId={post.authorId} />}
              </div>
              <p className="text-xs text-muted-foreground">
                {relativeTime(post.timestamp)}
              </p>
            </div>
          </div>
          {isOwn && (
            <button
              type="button"
              onClick={() => deletePost.mutate(post.id)}
              className="text-muted-foreground hover:text-destructive transition-smooth p-1 shrink-0"
              aria-label="Delete post"
              data-ocid={`people.post.delete_button.${index + 1}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Post text */}
        <p className="text-sm text-foreground leading-relaxed">{post.text}</p>

        {/* Post photo */}
        {post.photoUrl && (
          <div className="rounded-xl overflow-hidden">
            <img
              src={post.photoUrl}
              alt="Post"
              className="w-full object-cover max-h-72"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-1">
          <button
            type="button"
            onClick={() =>
              post.isLikedByMe
                ? unlikePost.mutate(post.id)
                : likePost.mutate(post.id)
            }
            className={`flex items-center gap-1.5 text-sm transition-smooth ${
              post.isLikedByMe
                ? "text-primary"
                : "text-muted-foreground hover:text-primary"
            }`}
            data-ocid={`people.post.like_button.${index + 1}`}
          >
            <Heart
              className={`w-4 h-4 transition-smooth ${post.isLikedByMe ? "fill-primary" : ""}`}
            />
            <span>{post.likeCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            className={`flex items-center gap-1.5 text-sm transition-smooth ${showComments ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            data-ocid={`people.post.comment_toggle.${index + 1}`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>{post.commentCount}</span>
          </button>
        </div>

        {/* Comments */}
        {showComments && <CommentsSection post={post} />}
      </CardContent>
    </Card>
  );
}

// ---- Create post form ----
function CreatePostForm() {
  const { data: myProfile } = useMyProfile();
  const createPost = useCreatePost();
  const [text, setText] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [showPhoto, setShowPhoto] = useState(false);

  const handleSubmit = () => {
    if (!text.trim()) return;
    createPost.mutate(
      { text: text.trim(), photoUrl: photoUrl.trim() || undefined },
      {
        onSuccess: () => {
          setText("");
          setPhotoUrl("");
          setShowPhoto(false);
        },
      },
    );
  };

  return (
    <Card className="bg-card border-border" data-ocid="people.create_post.card">
      <CardContent className="p-4 space-y-3">
        <div className="flex gap-3">
          <Avatar className="w-9 h-9 shrink-0">
            <AvatarImage src={myProfile?.avatarUrl} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {(myProfile?.username ?? "Me").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Textarea
            placeholder="Share something with your people…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[60px] resize-none bg-input border-border text-sm"
            data-ocid="people.create_post.textarea"
          />
        </div>
        {showPhoto && (
          <Input
            placeholder="Photo URL (optional)"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            className="bg-input border-border text-sm"
            data-ocid="people.create_post.photo_input"
          />
        )}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowPhoto((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-smooth"
            data-ocid="people.create_post.photo_toggle"
          >
            <ImageIcon className="w-4 h-4" />
            {showPhoto ? "Remove photo" : "Add photo"}
          </button>
          <Button
            type="button"
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
            onClick={handleSubmit}
            disabled={!text.trim() || createPost.isPending}
            data-ocid="people.create_post.submit_button"
          >
            <Send className="w-3.5 h-3.5" />
            Post
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Messages nav button with unread badge ----
function MessagesNavButton() {
  const { data: unreadCount = 0 } = useUnreadCount();
  return (
    <Link
      to="/messages"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-smooth relative"
      data-ocid="people.messages.link"
    >
      <MessageCircle className="w-4 h-4" />
      Messages
      {unreadCount > 0 && (
        <Badge className="absolute -top-2 -right-3 bg-primary text-primary-foreground text-xs px-1.5 py-0 min-w-[18px] justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </Badge>
      )}
    </Link>
  );
}

// ---- Main PeoplePage ----
export default function PeoplePage() {
  const { data: stories = [] } = useStories();
  const { data: feed = [] } = useFeed();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const { data: searchResults = [] } = useSearchUsers(searchQuery);
  const { data: following = [] } = useFollowing();
  const navigate = useNavigate();

  const suggestedUsers =
    following.length === 0 ? searchResults.slice(0, 4) : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6" data-ocid="people.page">
      {/* Top nav: back + messages */}
      <div className="flex items-center justify-between -mb-2">
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth"
          data-ocid="people.back_to_dashboard.button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <MessagesNavButton />
      </div>

      {/* Stories carousel */}
      <div
        className="bg-card border border-border rounded-2xl p-4"
        data-ocid="people.stories.section"
      >
        <h2 className="font-display font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full bg-primary"
            aria-hidden="true"
          />
          Stories
        </h2>
        <div
          className="flex gap-4 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          <AddStoryButton />
          {stories.map((story) => (
            <StoryCircle
              key={story.id}
              story={story}
              onClick={() => setActiveStory(story)}
            />
          ))}
          {stories.length === 0 && (
            <p className="text-xs text-muted-foreground self-center pl-2">
              Follow people to see their stories here.
            </p>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative" data-ocid="people.search.section">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search people by username…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-card border-border focus:border-primary/50"
          data-ocid="people.search.search_input"
        />
      </div>

      {/* Search results */}
      {searchQuery.trim().length > 0 && (
        <div className="space-y-2" data-ocid="people.search.results">
          {searchResults.length === 0 ? (
            <p
              className="text-sm text-muted-foreground text-center py-4"
              data-ocid="people.search.empty_state"
            >
              No users found for &ldquo;{searchQuery}&rdquo;
            </p>
          ) : (
            searchResults.map((u, i) => (
              <div
                key={u.userId}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-smooth"
                data-ocid={`people.search.item.${i + 1}`}
              >
                <Link to="/profile/$userId" params={{ userId: u.userId }}>
                  <Avatar className="w-10 h-10 ring-2 ring-border">
                    <AvatarImage src={u.avatarUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {u.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to="/profile/$userId"
                      params={{ userId: u.userId }}
                      className="font-semibold text-sm text-foreground hover:text-primary transition-smooth truncate"
                    >
                      @{u.username}
                    </Link>
                    <Badge
                      variant="outline"
                      className={`text-xs shrink-0 ${u.isPublic ? "border-primary/30 text-primary" : "border-border text-muted-foreground"}`}
                    >
                      {u.isPublic ? "Public" : "Private"}
                    </Badge>
                  </div>
                  {u.bio && (
                    <p className="text-xs text-muted-foreground truncate">
                      {u.bio}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/40 font-mono">
                    {u.userId.slice(0, 8)}
                  </p>
                </div>
                <FollowButton userId={u.userId} />
              </div>
            ))
          )}
        </div>
      )}

      {/* Suggested (when following no one and no search) */}
      {suggestedUsers.length > 0 && searchQuery.trim().length === 0 && (
        <div data-ocid="people.suggested.section">
          <h3 className="font-display font-semibold text-sm text-foreground mb-3">
            Suggested People
          </h3>
          <div className="space-y-2">
            {suggestedUsers.map((u, i) => (
              <div
                key={u.userId}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-smooth"
                data-ocid={`people.suggested.item.${i + 1}`}
              >
                <Link to="/profile/$userId" params={{ userId: u.userId }}>
                  <Avatar className="w-10 h-10 ring-2 ring-border">
                    <AvatarImage src={u.avatarUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {u.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to="/profile/$userId"
                    params={{ userId: u.userId }}
                    className="font-semibold text-sm text-foreground hover:text-primary transition-smooth"
                  >
                    @{u.username}
                  </Link>
                  {u.bio && (
                    <p className="text-xs text-muted-foreground truncate">
                      {u.bio}
                    </p>
                  )}
                </div>
                <FollowButton userId={u.userId} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create post */}
      <CreatePostForm />

      {/* Feed */}
      <div className="space-y-4" data-ocid="people.feed.section">
        <h3 className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full bg-primary"
            aria-hidden="true"
          />
          Your Feed
        </h3>
        {feed.length === 0 ? (
          <div
            className="flex flex-col items-center py-12 gap-3 bg-card border border-border rounded-2xl"
            data-ocid="people.feed.empty_state"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <p className="font-display font-semibold text-foreground">
              No posts yet
            </p>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Follow people to see their posts here, or share your first post
              above.
            </p>
          </div>
        ) : (
          feed.map((post, i) => (
            <PostCard key={post.id} post={post} index={i} />
          ))
        )}
      </div>

      {/* Story viewer overlay */}
      {activeStory && (
        <StoryViewer story={activeStory} onClose={() => setActiveStory(null)} />
      )}
    </div>
  );
}
