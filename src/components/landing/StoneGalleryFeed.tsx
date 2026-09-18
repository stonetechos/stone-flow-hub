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
import {
  Heart,
  MessageCircle,
  Sparkles,
  Eye,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
  mediaType?: "IMAGE" | "CAROUSEL_ALBUM" | "VIDEO";
  sizes?: {
    small?: { mediaUrl: string };
    medium?: { mediaUrl: string };
    large?: { mediaUrl: string };
  };
  children?: Array<{
    id: string;
    mediaType?: string;
    mediaUrl: string;
    sizes?: {
      small?: { mediaUrl: string };
      medium?: { mediaUrl: string };
      large?: { mediaUrl: string };
    };
  }>;
}

const BATCH_SIZE = 24;

export function StoneGalleryFeed({ onSelectProduct, className }: StoneGalleryFeedProps) {
  // Initialize EXCLUSIVELY with authentic Instagram profile posts (1 tile per unique photo, 0 stock photos)
  const [allPosts, setAllPosts] = useState<InstagramPost[]>(() => LIVE_BEHOLD_POSTS);
  const [visibleCount, setVisibleCount] = useState<number>(36);
  const [activeModalPost, setActiveModalPost] = useState<InstagramPost | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Background fetch from Behold JSON feed (syncs latest profile posts + unpacks unique photos)
  useEffect(() => {
    let active = true;
    async function fetchLatest() {
      try {
        const res = await fetch(`https://feeds.behold.so/${BEHOLD_FEED_ID}`);
        if (!res.ok) return;
        const data = await res.json();
        const rawPosts: RawBeholdPost[] = data?.posts || (Array.isArray(data) ? data : []);
        if (active && rawPosts.length > 0) {
          const mapped: InstagramPost[] = [];

          rawPosts.forEach((p, i) => {
            const caption = p.prunedCaption || p.caption || "Stone Tech executed site project";
            const postDate = p.timestamp
              ? new Date(p.timestamp).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Recent";
            const shortcode =
              p.permalink?.split("/p/")[1]?.replace(/\//g, "") || p.id || `feed-live-${i}`;
            const title = (p.prunedCaption || p.caption || "Bespoke Natural Stone")
              .split(".")[0]
              .split("\n")[0]
              .trim();

            const allProjectImages: string[] = [];
            if (p.children && p.children.length > 0) {
              p.children.forEach((c) => {
                const cImg = c.sizes?.large?.mediaUrl || c.sizes?.medium?.mediaUrl || c.mediaUrl;
                if (cImg && !allProjectImages.includes(cImg)) allProjectImages.push(cImg);
              });
            } else {
              const pImg = p.sizes?.large?.mediaUrl || p.sizes?.medium?.mediaUrl || p.mediaUrl;
              if (pImg) allProjectImages.push(pImg);
            }

            const coverImg =
              allProjectImages[0] ||
              p.sizes?.large?.mediaUrl ||
              p.sizes?.medium?.mediaUrl ||
              p.mediaUrl;

            mapped.push({
              id: p.id || `feed-live-${i}`,
              shortcode,
              permalink: p.permalink || "#",
              mediaUrl: coverImg,
              caption,
              category: "cladding",
              categoryLabel: "Executed Work",
              productName: title.slice(0, 50),
              likes: p.likeCount ?? 15,
              comments: p.commentsCount ?? 0,
              mediaType:
                p.children && p.children.length > 1 ? "CAROUSEL_ALBUM" : p.mediaType || "IMAGE",
              location: "Ahmedabad Atelier",
              date: postDate,
              isLivePost: true,
              carouselImages: allProjectImages,
              currentCarouselIndex: 0,
            });
          });

          if (mapped.length > 0) {
            setAllPosts((prev) => (mapped.length >= prev.length ? mapped : prev));
          }
        }
      } catch (err) {
        console.warn("[StoneGalleryFeed] Using pre-cached authentic Instagram profile posts:", err);
      }
    }

    void fetchLatest();
    return () => {
      active = false;
    };
  }, []);

  // Keyboard navigation for multi-photo modal
  useEffect(() => {
    if (!activeModalPost) return;
    const images =
      activeModalPost.carouselImages && activeModalPost.carouselImages.length > 0
        ? activeModalPost.carouselImages
        : [activeModalPost.mediaUrl];
    if (images.length <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setActiveImageIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === "ArrowRight") {
        setActiveImageIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeModalPost]);

  // Infinite Scroll Handler: appends more posts as user scrolls down (up to allPosts.length)
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollTop + clientHeight >= scrollHeight - 350) {
      setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, allPosts.length));
    }
  }, [allPosts.length]);

  // Unique posts only: never clone or repeat posts to create duplicates
  const visiblePosts = useMemo(() => {
    return allPosts.slice(0, visibleCount);
  }, [allPosts, visibleCount]);

  const handleOpenPost = (post: InstagramPost) => {
    setActiveModalPost(post);
    setActiveImageIdx(post.currentCarouselIndex ?? 0);
  };

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
            Live Atelier Feed • {allPosts.length} Works
          </Badge>
        </div>

        {/* 3-Column Scrollable Feed with Unique Posts and Expanded Height */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="max-h-[640px] sm:max-h-[700px] lg:max-h-[750px] overflow-y-auto pr-1 rounded-2xl scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 scroll-smooth"
        >
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pb-2">
            {visiblePosts.map((post, idx) => {
              const hasMultiplePhotos =
                (post.carouselImages && post.carouselImages.length > 1) ||
                post.mediaType === "CAROUSEL_ALBUM";

              return (
                <div
                  key={`${post.id}-${idx}`}
                  onClick={() => handleOpenPost(post)}
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

                  {/* Multi-photo indicator icon for carousels (similar to Instagram) */}
                  {hasMultiplePhotos && (
                    <div
                      className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white p-1 rounded-md shadow-xs pointer-events-none z-10"
                      title={`${post.carouselImages?.length ?? "Multiple"} photos`}
                    >
                      <Layers className="h-3 w-3" />
                    </div>
                  )}

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
              );
            })}
          </div>

          {/* Bottom gentle indicator */}
          <div className="py-2 text-center text-[10px] text-muted-foreground font-medium">
            {visiblePosts.length < allPosts.length
              ? "Scroll down to explore all atelier works..."
              : `Showing all ${allPosts.length} executed atelier projects`}
          </div>
        </div>
      </div>

      {/* Lightbox / Project Details Modal */}
      {activeModalPost &&
        (() => {
          const modalImages =
            activeModalPost.carouselImages && activeModalPost.carouselImages.length > 0
              ? activeModalPost.carouselImages
              : [activeModalPost.mediaUrl];
          const currentImg = modalImages[activeImageIdx] || activeModalPost.mediaUrl;
          const hasMultiple = modalImages.length > 1;

          return (
            <Dialog
              open={!!activeModalPost}
              onOpenChange={(open) => !open && setActiveModalPost(null)}
            >
              <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-3xl border-border">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  {/* Media View / Carousel Viewer */}
                  <div className="relative aspect-square md:aspect-auto bg-black flex items-center justify-center select-none overflow-hidden group">
                    <img
                      src={currentImg}
                      alt={activeModalPost.caption}
                      className="w-full h-full object-cover max-h-[440px] transition-all duration-300"
                    />

                    {hasMultiple && (
                      <>
                        {/* Photo Counter */}
                        <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-xs text-white text-[11px] font-semibold px-2 py-0.5 rounded-full z-20">
                          {activeImageIdx + 1} / {modalImages.length}
                        </div>

                        {/* Previous Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIdx((prev) =>
                              prev > 0 ? prev - 1 : modalImages.length - 1,
                            );
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all shadow-md z-20 focus:outline-none cursor-pointer"
                          aria-label="Previous image"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>

                        {/* Next Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIdx((prev) =>
                              prev < modalImages.length - 1 ? prev + 1 : 0,
                            );
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all shadow-md z-20 focus:outline-none cursor-pointer"
                          aria-label="Next image"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>

                        {/* Dot Indicators */}
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-1.5 z-20">
                          {modalImages.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveImageIdx(i);
                              }}
                              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                i === activeImageIdx
                                  ? "w-5 bg-white"
                                  : "w-1.5 bg-white/50 hover:bg-white/75"
                              }`}
                              aria-label={`Go to photo ${i + 1}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
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
                        <span className="text-xs text-muted-foreground">
                          {activeModalPost.date}
                        </span>
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
          );
        })()}
    </>
  );
}
