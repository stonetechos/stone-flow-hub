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
 * - Synced via GitHub Actions directly from Meta Instagram Graph API (300 authentic projects)
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Heart,
  MessageCircle,
  Sparkles,
  Eye,
  Layers,
  ChevronLeft,
  ChevronRight,
  Play,
} from "lucide-react";
import { INSTAGRAM_POSTS, type InstagramPost } from "@/lib/instagram/feed";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getLandingTexts } from "@/lib/i18n/landing-i18n";

interface StoneGalleryFeedProps {
  onSelectProduct?: (productName: string) => void;
  className?: string;
}

const INITIAL_BATCH = 18;
const BATCH_SIZE = 18;

export function StoneGalleryFeed({ onSelectProduct, className }: StoneGalleryFeedProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.substring(0, 2) || "en";
  const texts = getLandingTexts(currentLang);

  // Directly powered by authentic posts synced via GitHub Actions into src/data/instagram-posts.json
  const [allPosts] = useState<InstagramPost[]>(() => INSTAGRAM_POSTS);
  // Start with 18 items (6 rows) for instant, lightweight 60fps render
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_BATCH);
  const [activeModalPost, setActiveModalPost] = useState<InstagramPost | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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

  // High-performance infinite scroll: uses IntersectionObserver on bottom sentinel
  // instead of unthrottled onScroll event listeners to prevent layout recalculations & jank
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          setVisibleCount((prev) => {
            if (prev >= allPosts.length) return prev;
            return Math.min(prev + BATCH_SIZE, allPosts.length);
          });
        }
      },
      {
        root: container,
        rootMargin: "350px 0px", // Preload next batch before user reaches bottom
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [allPosts.length, visibleCount]);

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
              {texts.gallery.title}
            </span>
          </div>
        </div>

        {/* 2-Row Bounded Instagram Feed Box with Smooth In-Box Scroll */}
        <div
          ref={scrollContainerRef}
          aria-label="Instagram Live Feed Scrollable Box"
          className={cn(
            "relative w-full rounded-2xl border border-border/80 bg-card/40 p-2 sm:p-3 shadow-inner",
            "h-[420px] sm:h-[460px] md:h-[520px] lg:h-[580px]",
            "overflow-y-auto overscroll-contain",
            "touch-pan-y [-webkit-overflow-scrolling:touch]",
            "[scrollbar-width:thin] scrollbar-thumb-muted-foreground/30 hover:scrollbar-thumb-muted-foreground/60",
            "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-muted/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50",
          )}
          style={{ overscrollBehaviorY: "contain" }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2.5 sm:gap-3.5 pb-8">
            {visiblePosts.map((post, idx) => {
              const hasMultiplePhotos =
                (post.carouselImages && post.carouselImages.length > 1) ||
                post.mediaType === "CAROUSEL_ALBUM";
              const isVideo =
                post.mediaType === "VIDEO" ||
                Boolean(post.mediaUrl && post.mediaUrl.includes(".mp4"));

              return (
                <div
                  key={`${post.id}-${idx}`}
                  onClick={() => handleOpenPost(post)}
                  style={{
                    contentVisibility: idx >= INITIAL_BATCH ? "auto" : undefined,
                    containIntrinsicSize: idx >= INITIAL_BATCH ? "auto 120px" : undefined,
                  }}
                  className="group relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer bg-stone-100 dark:bg-stone-900 border border-border/60 hover:border-[#006788]/60 shadow-2xs hover:shadow-md transition-all duration-300"
                  title={post.productName}
                >
                  {/* Media: Video or Image */}
                  {isVideo ? (
                    <video
                      src={`${post.mediaUrl}#t=0.001`}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-108 pointer-events-none"
                    />
                  ) : (
                    <img
                      src={post.mediaUrl}
                      alt={post.caption}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-108"
                    />
                  )}

                  {/* Multi-photo indicator icon for carousels */}
                  {hasMultiplePhotos && (
                    <div
                      className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white p-1 rounded-md shadow-xs pointer-events-none z-10"
                      title={`${post.carouselImages?.length ?? "Multiple"} photos`}
                    >
                      <Layers className="h-3 w-3" />
                    </div>
                  )}

                  {/* Video indicator icon for reels */}
                  {isVideo && (
                    <div
                      className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur-xs text-white p-1 rounded-md shadow-xs pointer-events-none z-10 flex items-center justify-center"
                      title="Video Walkthrough"
                    >
                      <Play className="h-3 w-3 fill-white text-white" />
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

          {/* Load More Button — Manual control to prevent infinite scroll bounce & traps */}
          {visiblePosts.length < allPosts.length && (
            <div className="py-6 text-center flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, allPosts.length))
                }
                className="px-4 py-2 rounded-lg border border-[#006788]/30 bg-card hover:bg-[#e0f1f5]/50 dark:hover:bg-[#015474]/20 text-xs font-semibold text-[#015474] dark:text-[#67e8f9] cursor-pointer transition-all shadow-xs"
              >
                Load More Projects ({allPosts.length - visiblePosts.length} remaining)
              </button>
              <button
                type="button"
                onClick={() => setVisibleCount(allPosts.length)}
                className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Show All ({allPosts.length})
              </button>
            </div>
          )}
        </div>

        {/* Footer strip showing count and in-box scroll notice */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">
            {currentLang === "gu"
              ? `લાઇવ ઇન્સ્ટાગ્રામ સ્થાપિત કાર્યો (${allPosts.length}) · અંદર સ્ક્રોલ કરો`
              : currentLang === "hi"
                ? `लाइव इंस्टाग्राम निष्पादित कार्य (${allPosts.length}) · बॉक्स के अंदर स्क्रॉल करें`
                : `Live Instagram Executed Works (${allPosts.length} posts) · Scroll box to explore`}
          </span>
          <a
            href="https://www.instagram.com/stonetech.ahmedabad/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold tracking-wider text-[#015474] dark:text-[#67e8f9] hover:underline inline-flex items-center gap-1"
          >
            @stonetech.ahmedabad
          </a>
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
          const isCurrentVideo =
            activeModalPost.mediaType === "VIDEO" ||
            Boolean(currentImg && currentImg.includes(".mp4"));

          return (
            <Dialog
              open={!!activeModalPost}
              onOpenChange={(open) => !open && setActiveModalPost(null)}
            >
              <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-3xl border-border">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  {/* Media View / Carousel Viewer */}
                  <div className="relative aspect-square md:aspect-auto bg-black flex items-center justify-center select-none overflow-hidden group">
                    {isCurrentVideo ? (
                      <video
                        src={currentImg}
                        controls
                        autoPlay
                        playsInline
                        loop
                        className="w-full h-full object-contain max-h-[440px]"
                      />
                    ) : (
                      <img
                        src={currentImg}
                        alt={activeModalPost.caption}
                        className="w-full h-full object-cover max-h-[440px] transition-all duration-300"
                      />
                    )}

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
                          className="text-[11px] border-[#006788]/30 text-[#015474] dark:text-[#67e8f9] bg-[#e0f1f5]/50 dark:bg-[#015474]/20"
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
                        <span>
                          {activeModalPost.likes} {texts.gallery.approvals}
                        </span>
                      </div>

                      <Button
                        onClick={() => handleInquire(activeModalPost)}
                        className="w-full h-11 bg-[#015474] hover:bg-[#004863] text-white font-bold text-xs gap-1.5 shadow-sm"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>{texts.gallery.requestEstimate}</span>
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
