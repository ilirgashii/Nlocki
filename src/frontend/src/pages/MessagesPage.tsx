import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Archive,
  ArrowLeft,
  Check,
  Inbox,
  MessageCircle,
  MoreVertical,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  useAcceptRequest,
  useArchiveConversation,
  useDeclineRequest,
  useDeleteConversation,
  useInbox,
  usePendingRequests,
} from "../hooks/use-messages";
import type { ConversationSummary, MessageRequest } from "../types";

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ---- Conversation row ----
function ConversationRow({
  convo,
  index,
}: {
  convo: ConversationSummary;
  index: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const deleteConvo = useDeleteConversation();
  const archiveConvo = useArchiveConversation();
  const navigate = useNavigate();
  const initials = convo.otherUsername.slice(0, 2).toUpperCase();
  const preview =
    convo.lastMessagePreview.length > 50
      ? `${convo.lastMessagePreview.slice(0, 50)}…`
      : convo.lastMessagePreview;

  return (
    <>
      <div
        className="relative flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-smooth group cursor-pointer"
        data-ocid={`messages.convo.item.${index + 1}`}
      >
        {/* Clickable area */}
        <button
          type="button"
          className="absolute inset-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={() =>
            navigate({
              to: "/messages/$userId",
              params: { userId: convo.otherUserId },
            })
          }
          aria-label={`Open conversation with @${convo.otherUsername}`}
        />

        {/* Avatar + unread dot */}
        <div className="relative shrink-0">
          <Avatar className="w-12 h-12 ring-2 ring-border">
            <AvatarImage src={convo.otherAvatarUrl} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          {convo.unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`font-semibold text-sm truncate ${
                convo.unreadCount > 0 ? "text-foreground" : "text-foreground/80"
              }`}
            >
              @{convo.otherUsername}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-muted-foreground">
                {relativeTime(convo.lastTimestamp)}
              </span>
              {convo.unreadCount > 0 && (
                <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0 min-w-[20px] justify-center">
                  {convo.unreadCount}
                </Badge>
              )}
            </div>
          </div>
          <p
            className={`text-xs truncate mt-0.5 ${
              convo.unreadCount > 0
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            }`}
          >
            {preview}
          </p>
        </div>

        {/* 3-dot menu */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="relative z-10 opacity-0 group-hover:opacity-100 shrink-0 p-1 text-muted-foreground hover:text-foreground transition-smooth"
          aria-label="Conversation options"
          data-ocid={`messages.convo.more_button.${index + 1}`}
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
          <div className="absolute right-2 top-12 z-30 bg-card border border-border rounded-xl shadow-elevated py-1 w-44">
            <button
              type="button"
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted/50 transition-smooth"
              onClick={() => {
                archiveConvo.mutate(convo.otherUserId);
                setMenuOpen(false);
              }}
              data-ocid={`messages.convo.archive_button.${index + 1}`}
            >
              <Archive className="w-3.5 h-3.5" />
              {convo.isArchived ? "Unarchive" : "Archive"}
            </button>
            <button
              type="button"
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-smooth"
              onClick={() => {
                setMenuOpen(false);
                setDeleteConfirm(true);
              }}
              data-ocid={`messages.convo.delete_button.${index + 1}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent data-ocid="messages.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove all messages with @
              {convo.otherUsername}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="messages.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConvo.mutate(convo.otherUserId)}
              data-ocid="messages.delete.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---- Request row ----
function RequestRow({
  request,
  index,
}: {
  request: MessageRequest;
  index: number;
}) {
  const accept = useAcceptRequest();
  const decline = useDeclineRequest();
  const navigate = useNavigate();
  const initials = request.senderUsername.slice(0, 2).toUpperCase();

  const handleAccept = () => {
    accept.mutate(request.id, {
      onSuccess: () => {
        navigate({
          to: "/messages/$userId",
          params: { userId: request.senderId },
        });
      },
    });
  };

  return (
    <div
      className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/20 transition-smooth"
      data-ocid={`messages.request.item.${index + 1}`}
    >
      <Link to="/profile/$userId" params={{ userId: request.senderId }}>
        <Avatar className="w-12 h-12 ring-2 ring-border shrink-0">
          <AvatarImage src={request.senderAvatarUrl} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <Link
            to="/profile/$userId"
            params={{ userId: request.senderId }}
            className="font-semibold text-sm text-foreground hover:text-primary transition-smooth"
          >
            @{request.senderUsername}
          </Link>
          <span className="text-xs text-muted-foreground">
            {relativeTime(request.timestamp)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/30 rounded-lg px-2.5 py-1.5 border border-border/50">
          {request.previewText}
        </p>
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
            onClick={handleAccept}
            disabled={accept.isPending}
            data-ocid={`messages.request.accept_button.${index + 1}`}
          >
            <Check className="w-3 h-3" />
            Accept
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs border-border hover:border-destructive/50 hover:text-destructive"
            onClick={() => decline.mutate(request.id)}
            disabled={decline.isPending}
            data-ocid={`messages.request.decline_button.${index + 1}`}
          >
            <X className="w-3 h-3" />
            Decline
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---- Main MessagesPage ----
export default function MessagesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("conversations");
  const { data: inbox = [] } = useInbox();
  const { data: requests = [] } = usePendingRequests();

  const activeConvos = inbox.filter((c) => !c.isArchived);
  const archivedConvos = inbox.filter((c) => c.isArchived);
  const totalUnread = activeConvos.reduce((s, c) => s + c.unreadCount, 0);

  const q = searchQuery.toLowerCase();
  const filteredConvos = activeConvos.filter((c) =>
    c.otherUsername.toLowerCase().includes(q),
  );
  const filteredArchived = archivedConvos.filter((c) =>
    c.otherUsername.toLowerCase().includes(q),
  );
  const filteredRequests = requests.filter((r) =>
    r.senderUsername.toLowerCase().includes(q),
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5" data-ocid="messages.page">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/people"
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-smooth"
          aria-label="Back to People"
          data-ocid="messages.back_link"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="font-display font-bold text-xl text-foreground flex items-center gap-2">
            Messages
            {totalUnread > 0 && (
              <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5">
                {totalUnread}
              </Badge>
            )}
          </h1>
          <p className="text-xs text-muted-foreground">
            Your conversations and requests
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative" data-ocid="messages.search.section">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search messages…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-card border-border focus:border-primary/50"
          data-ocid="messages.search_input"
        />
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        data-ocid="messages.tabs"
      >
        <TabsList className="grid grid-cols-2 bg-muted/40 border border-border rounded-xl p-1">
          <TabsTrigger
            value="conversations"
            className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-subtle text-sm"
            data-ocid="messages.conversations.tab"
          >
            <Inbox className="w-3.5 h-3.5 mr-1.5" />
            Chats
            {totalUnread > 0 && (
              <Badge className="ml-1.5 bg-primary text-primary-foreground text-xs px-1.5 py-0">
                {totalUnread}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="requests"
            className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-subtle text-sm"
            data-ocid="messages.requests.tab"
          >
            <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
            Requests
            {requests.length > 0 && (
              <Badge className="ml-1.5 bg-primary text-primary-foreground text-xs px-1.5 py-0">
                {requests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Conversations tab */}
        <TabsContent value="conversations" className="space-y-3 mt-4">
          {filteredConvos.length === 0 && filteredArchived.length === 0 ? (
            <div
              className="flex flex-col items-center py-16 gap-4 bg-card border border-border rounded-2xl"
              data-ocid="messages.conversations.empty_state"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-7 h-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-display font-semibold text-foreground">
                  No conversations yet
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Find people to follow and start messaging them
                </p>
              </div>
              <Link to="/people">
                <Button
                  type="button"
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  data-ocid="messages.find_people.button"
                >
                  Find People
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {filteredConvos.length > 0 && (
                <div className="space-y-2">
                  {filteredConvos.map((c, i) => (
                    <ConversationRow key={c.otherUserId} convo={c} index={i} />
                  ))}
                </div>
              )}

              {/* Archived section */}
              {filteredArchived.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 pt-2">
                    Archived
                  </p>
                  {filteredArchived.map((c, i) => (
                    <div key={c.otherUserId} className="opacity-60">
                      <ConversationRow
                        convo={c}
                        index={filteredConvos.length + i}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Requests tab */}
        <TabsContent value="requests" className="space-y-3 mt-4">
          {filteredRequests.length === 0 ? (
            <div
              className="flex flex-col items-center py-16 gap-4 bg-card border border-border rounded-2xl"
              data-ocid="messages.requests.empty_state"
            >
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <MessageCircle className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="font-display font-semibold text-foreground">
                No pending requests
              </p>
              <p className="text-sm text-muted-foreground">
                Message requests from non-followers appear here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRequests.map((r, i) => (
                <RequestRow key={r.id} request={r} index={i} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
