/**
 * StoneGalleryFeed — Embedded Architectural Site Feed for Stone Tech OS.
 *
 * Displays executed stone installations in a soft-cornered rounded container
 * with a 3-column grid and smooth unlimited infinite scrolling.
 *
 * STRICT REQUIREMENTS:
 * - 3 columns of posts in that scrollable box
 * - Unlimited scrolls (continuous infinite pagination & cycling)
 * - NO category tabs
 * - ZERO mention of the word "Instagram" on the front page
 * - Connects to Behold JSON feed merged seamlessly with the 300+ executed projects
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Heart, MessageCircle, MapPin, Sparkles, Eye } from "lucide-react";
import {
  BEHOLD_FEED_ID,
  LIVE_BEHOLD_POSTS,
  INSTAGRAM_POSTS_300,
  type InstagramPost,
} from "@/lib/instagram/feed";
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

const BATCH_SIZE = 24;

export function StoneGalleryFeed({ onSelectProduct, className }: StoneGalleryFeedProps) {
  // Initialize with full 300+ executed stone installation library
  const [allPosts, setAllPosts] = useState<InstagramPost[]>(() => INSTAGRAM_POSTS_300);
  const [visibleCount, setVisibleCount] = useState<number>(36);
  const [activeModalPost, setActiveModalPost] = useState<InstagramPost | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Background fetch from Behold JSON feed (prepends latest live site posts)
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
              id: p.id || `feed-live-${i}`,
              shortcode: p.permalink?.split("/p/")[1]?.replace(/\//g, "") || `feed-live-${i}`,
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

          // Merge live posts with the 300+ library without duplicates
          setAllPosts((prev) => {
            const mappedIds = new Set(mapped.map((m) => m.id));
            const existingFiltered = prev.filter((p) => !mappedIds.has(p.id));
            return [...mapped, ...existingFiltered];
          });
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

  // Infinite Scroll Handler: appends more posts as user scrolls down
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollTop + clientHeight >= scrollHeight - 350) {
      setVisibleCount((prev) => prev + BATCH_SIZE);
    }
  }, []);

  // Unlimited Posts Array: cycles continuously through the 300+ pool so it never ends
  const visiblePosts = useMemo(() => {
    if (allPosts.length === 0) return [];
    if (visibleCount <= allPosts.length) {
      return allPosts.slice(0, visibleCount);
    }
    const result: InstagramPost[] = [];
    while (result.length < visibleCount) {
      const remaining = visibleCount - result.length;
      result.push(...allPosts.slice(0, remaining));
    }
    return result;
  }, [allPosts, visibleCount]);

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
          <Badge
            variant="outline"
            className="text-[10px] font-semibold text-muted-foreground border-border/80"
          >
            300+ Finishes • Unlimited Scroll
          </Badge>
        </div>

        {/* 3-Column Scrollable Feed with Infinite Scroll */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="max-h-[460px] sm:max-h-[500px] overflow-y-auto pr-1 rounded-2xl scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 scroll-smooth"
        >
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pb-2">
            {visiblePosts.map((post, idx) => (
              <div
                key={`${post.id}-${idx}`}
                onClick={() => setActiveModalPost(post)}
                className="group relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer bg-stone-100 dark:bg-stone-900 border border-border/60 hover:border-amber-500/50 shadow-2xs hover:shadow-md transition-all duration-300"
                title={post.productName}
              >
                {/* Image */}
                <img
                  src={post.mediaUrl}
                  alt={post.caption}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-108"
                />

                {/* Subtle dark gradient overlay on hover */}
                <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2 text-white z-10">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold truncate max-w-[85%] drop-shadow-xs">
                      {post.productName}
                    </span>
                    <Eye className="h-3 w-3 shrink-0 opacity-80" />
                  </div>

                  <div className="flex items-center justify-around text-[11px] font-bold">
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
                      <span>{post.likes}</span>
                    </span>
                    {post.comments > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        <span>{post.comments}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom gentle indicator */}
          <div className="py-2 text-center text-[10px] text-muted-foreground font-medium">
            Scroll down to explore unlimited finishes...
          </div>
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
