import { useState, useEffect } from "react";
import { ExternalLink, Heart, MessageCircle, Instagram } from "lucide-react";
import { BEHOLD_FEED_ID, LIVE_BEHOLD_POSTS, type InstagramPost } from "@/lib/instagram/feed";

interface BeholdWidgetProps {
  feedId?: string;
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

export function BeholdWidget({ feedId = BEHOLD_FEED_ID, className }: BeholdWidgetProps) {
  const [posts, setPosts] = useState<InstagramPost[]>(LIVE_BEHOLD_POSTS);

  // Background revalidation: fetch newest posts from Behold JSON feed without any external script
  useEffect(() => {
    let active = true;
    async function fetchLatest() {
      try {
        const res = await fetch(`https://feeds.behold.so/${feedId}`);
        if (!res.ok) return;
        const data = await res.json();
        const rawPosts: RawBeholdPost[] = data?.posts || (Array.isArray(data) ? data : []);
        if (active && rawPosts.length > 0) {
          const mapped: InstagramPost[] = rawPosts.slice(0, 6).map((p, i) => {
            const caption = p.prunedCaption || p.caption || "Stone Tech executed site project";
            const postDate = p.timestamp
              ? new Date(p.timestamp).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Recent";

            return {
              id: p.id || `live-${i}`,
              shortcode: p.permalink?.split("/p/")[1]?.replace(/\//g, "") || `live-${i}`,
              permalink: p.permalink || "https://www.instagram.com/stonetech.ahmedabad/",
              mediaUrl:
                p.sizes?.medium?.mediaUrl ||
                p.sizes?.large?.mediaUrl ||
                p.mediaUrl ||
                LIVE_BEHOLD_POSTS[i]?.mediaUrl ||
                "",
              caption,
              category: "cladding",
              categoryLabel: "Executed Project",
              productName: caption.split(".")[0]?.slice(0, 40) || "Natural Stone Project",
              likes: p.likeCount ?? 12,
              comments: p.commentsCount ?? 0,
              mediaType: "IMAGE",
              location: "Ahmedabad",
              date: postDate,
              isLivePost: true,
            };
          });
          setPosts(mapped);
        }
      } catch (err) {
        console.warn("[BeholdWidget] Falling back to pre-cached live posts:", err);
      }
    }

    void fetchLatest();
    return () => {
      active = false;
    };
  }, [feedId]);

  return (
    <div className={className ?? "w-full"}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {posts.map((post) => (
          <a
            key={post.id}
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative aspect-square overflow-hidden rounded-xl border border-border/70 bg-card shadow-2xs hover:shadow-md transition-all duration-300"
          >
            {/* Image */}
            <img
              src={post.mediaUrl}
              alt={post.caption}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />

            {/* Subtle Gradient & Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />

            {/* Instagram Badge (Top Right) */}
            <div className="absolute top-2.5 right-2.5 z-10">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs shadow-xs group-hover:bg-pink-600 transition-colors">
                <Instagram className="h-3.5 w-3.5" />
              </span>
            </div>

            {/* Caption snippet & metrics at bottom */}
            <div className="absolute bottom-0 inset-x-0 p-3 z-10 text-white space-y-1">
              <p className="text-[11px] font-medium leading-tight line-clamp-2 text-white/95">
                {post.caption}
              </p>
              <div className="flex items-center justify-between text-[10px] font-bold text-white/80 pt-0.5">
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3 fill-pink-500 text-pink-500" />
                  <span>{post.likes}</span>
                </span>
                <span className="flex items-center gap-1 group-hover:text-pink-300 transition-colors">
                  <span>View on Instagram</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
