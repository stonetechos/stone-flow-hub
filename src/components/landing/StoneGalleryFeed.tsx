/**
 * StoneGalleryFeed — Embedded Architectural Site Feed for Stone Tech OS.
 *
 * Displays executed stone installations in a soft-cornered rounded container
 * with smooth vertical scrolling like an authentic visual profile stream.
 *
 * STRICT REQUIREMENTS:
 * - NO category tabs
 * - ZERO mention of the word "Instagram" on the front page
 * - Connects to Behold JSON feed with fallback to high-res executed site posts
 */

import { useState, useEffect } from "react";
import { Heart, MessageCircle, MapPin, Sparkles, ChevronRight, Eye } from "lucide-react";
import { BEHOLD_FEED_ID, LIVE_BEHOLD_POSTS, type InstagramPost } from "@/lib/instagram/feed";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface StoneGalleryFeedProps {
  onSelectProduct?: (productName: string) => void;
  className?: string;
}

interface RawBeholdPost {
  id: string;
  caption?: string;
  prunedCaption?: string;
  permalink: string;
  timestamp: string;
  mediaUrl: string;
  likeCount?: number;
  commentsCount?: number;
  sizes?: {
    small?: { mediaUrl: string };
    medium?: { mediaUrl: string };
    large?: { mediaUrl: string };
  };
}

export function StoneGalleryFeed({ onSelectProduct, className }: StoneGalleryFeedProps) {
  const [posts, setPosts] = useState<InstagramPost[]>(LIVE_BEHOLD_POSTS);
  const [activeModalPost, setActiveModalPost] = useState<InstagramPost | null>(null);

  // Background fetch from Behold JSON feed (no external scripts or widgets)
  useEffect(() => {
    let active = true;
    async function fetchLatest() {
      try {
        const res = await fetch(`https://feeds.behold.so/${BEHOLD_FEED_ID}`);
        if (!res.ok) return;
        const data = await res.json();
        const rawPosts: RawBeholdPost[] = data?.posts || (Array.isArray(data) ? data : []);
        if (active && rawPosts.length > 0) {
          const mapped: InstagramPost[] = rawPosts.map((p, i) => {
            const caption = p.prunedCaption || p.caption || "Stone Tech executed site project";
            const postDate = p.timestamp
              ? new Date(p.timestamp).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                })
              : "Recent";

            return {
              id: p.id || `feed-${i}`,
              shortcode: p.permalink?.split("/p/")[1]?.replace(/\//g, "") || `feed-${i}`,
              permalink: p.permalink || "#",
              mediaUrl:
                p.sizes?.large?.mediaUrl ||
                p.sizes?.medium?.mediaUrl ||
                p.mediaUrl ||
                LIVE_BEHOLD_POSTS[i]?.mediaUrl ||
                "",
              caption,
              category: "cladding",
              categoryLabel: "Executed Project",
              productName: caption.split(".")[0]?.slice(0, 45) || "Bespoke Natural Stone",
              likes: p.likeCount ?? 15 + ((i * 7) % 30),
              comments: p.commentsCount ?? i % 3,
              mediaType: "IMAGE",
              location: "Ahmedabad • Live Site",
              date: postDate,
              isLivePost: true,
            };
          });
          setPosts(mapped);
        }
      } catch (err) {
        console.warn(
          "[StoneGalleryFeed] Falling back to pre-cached stone installation posts:",
          err,
        );
      }
    }

    void fetchLatest();
    return () => {
      active = false;
    };
  }, []);

  const handleInquire = (post: InstagramPost) => {
    setActiveModalPost(null);
    if (onSelectProduct) {
      onSelectProduct(post.productName);
    }
  };

  return (
    <>
      {/* Outer rounded container without sharp edges */}
      <div
        className={`rounded-3xl border border-border/80 bg-card/70 backdrop-blur-xs p-4 sm:p-5 shadow-md space-y-3.5 ${
          className ?? ""
        }`}
      >
        {/* Header strip */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Live Installations &amp; Executed Works
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">
            Scroll to explore recent work
          </span>
        </div>

        {/* Scrollable feed container styled like a mobile profile feed */}
        <div className="max-h-[460px] sm:max-h-[500px] overflow-y-auto pr-1 space-y-4 rounded-2xl scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 scroll-smooth">
          {posts.map((post) => (
            <div
              key={post.id}
              onClick={() => setActiveModalPost(post)}
              className="group cursor-pointer rounded-2xl border border-border/70 bg-background overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 hover:border-amber-500/40"
            >
              {/* Image Frame */}
              <div className="relative aspect-4/3 sm:aspect-16/10 overflow-hidden bg-stone-100 dark:bg-slate-900">
                <img
                  src={post.mediaUrl}
                  alt={post.caption}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-103"
                />

                {/* Subtle gradient vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                {/* Top Location Pill */}
                <div className="absolute top-3 left-3 z-10">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 text-white backdrop-blur-xs text-[10px] font-semibold">
                    <MapPin className="h-3 w-3 text-rose-400" />
                    <span>{post.location}</span>
                  </span>
                </div>

                {/* Quick Enlarge Action */}
                <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-stone-900 backdrop-blur-xs shadow-xs text-xs">
                    <Eye className="h-3.5 w-3.5" />
                  </span>
                </div>

                {/* Bottom Overlay Info */}
                <div className="absolute bottom-0 inset-x-0 p-3.5 z-10 text-white space-y-1.5">
                  <p className="text-xs font-semibold leading-snug line-clamp-2 text-white/95 drop-shadow-xs">
                    {post.caption}
                  </p>
                  <div className="flex items-center justify-between pt-1 text-[11px] text-white/80">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-bold">
                        <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                        <span>{post.likes}</span>
                      </span>
                      {post.comments > 0 && (
                        <span className="flex items-center gap-1 font-medium">
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>{post.comments}</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-white/70">{post.date}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Bar */}
              <div className="p-2.5 px-3.5 flex items-center justify-between bg-card text-xs border-t border-border/60">
                <span className="font-semibold text-foreground truncate max-w-[200px]">
                  {post.productName}
                </span>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>View Details</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox / Project Details Modal */}
      {activeModalPost && (
        <Dialog open={!!activeModalPost} onOpenChange={(open) => !open && setActiveModalPost(null)}>
          <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-3xl border-border">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Media View */}
              <div className="relative aspect-square md:aspect-auto bg-black flex items-center justify-center">
                <img
                  src={activeModalPost.mediaUrl}
                  alt={activeModalPost.caption}
                  className="w-full h-full object-cover max-h-[440px]"
                />
              </div>

              {/* Details & Inquire CTA */}
              <div className="p-6 flex flex-col justify-between space-y-4 bg-background">
                <DialogHeader className="space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className="text-[11px] border-amber-500/30 text-amber-700 dark:text-amber-300"
                    >
                      {activeModalPost.location}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{activeModalPost.date}</span>
                  </div>
                  <DialogTitle className="text-lg font-bold text-foreground leading-snug">
                    {activeModalPost.productName}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed max-h-[160px] overflow-y-auto">
                    {activeModalPost.caption}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 pt-3 border-t border-border/80">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                    <span>{activeModalPost.likes} Architectural Approvals</span>
                  </div>

                  <Button
                    onClick={() => handleInquire(activeModalPost)}
                    className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Request Estimate for this Finish</span>
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
