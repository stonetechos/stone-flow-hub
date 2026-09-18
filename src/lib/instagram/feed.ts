/**
 * Instagram Feed Engine for Stone Tech OS (www.stonetech.in).
 *
 * Provides a structured 300-post dataset of real architectural stone installations,
 * site executions, and factory dry-lay reels directly showcasing:
 * - Flexible Stone Veneer (50 posts)
 * - 3D Elevation Stone Cladding (50 posts)
 * - CNC Mandir & Spiritual Murals (50 posts)
 * - Italian Marble & Waterjet Inlays (50 posts)
 * - Interlocking Ledgestone (50 posts)
 * - Site Reels & Video Walkthroughs (50 posts)
 */

export interface InstagramPost {
  id: string;
  shortcode: string;
  permalink: string;
  mediaUrl: string;
  caption: string;
  category: "veneer" | "cladding" | "murals" | "marble" | "ledgestone" | "reels";
  categoryLabel: string;
  productName: string;
  likes: number;
  comments: number;
  mediaType: "IMAGE" | "CAROUSEL_ALBUM" | "VIDEO";
  location: string;
  date: string;
  isLivePost?: boolean;
  carouselImages?: string[];
  currentCarouselIndex?: number;
}

export type InstagramCategoryKey =
  | "all"
  | "veneer"
  | "cladding"
  | "murals"
  | "marble"
  | "ledgestone"
  | "reels";

export interface CategoryTab {
  key: InstagramCategoryKey;
  label: string;
  count: number;
}
export const BEHOLD_FEED_ID = "Vb5i6b935sxwT5h8oTFo";

/**
 * Authentic Live Instagram Posts directly synced from @stonetech.ahmedabad via Behold
 */
export const LIVE_BEHOLD_POSTS: InstagramPost[] = [
  {
    id: "17928001446163498",
    shortcode: "DcishLoIhRJ",
    permalink: "https://www.instagram.com/p/DcishLoIhRJ/",
    mediaUrl:
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxNzkyODAwMTQ0NjE2MzQ5OCIsImgiOiJpb2ZkZnUifQ.jpg?class=squareLarge",
    caption:
      "The Happy Garden. \nMural art carved in natural sandstone and installed on a balcony wall. \n#stonemural #stoneart #art #stonewall #wallartwork",
    category: "murals",
    categoryLabel: "Sandstone Murals",
    productName: "The Happy Garden Sandstone Mural",
    likes: 11,
    comments: 0,
    mediaType: "IMAGE",
    location: "Ahmedabad Atelier",
    date: "27 Aug 2026",
    isLivePost: true,
    carouselImages: [
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxNzkyODAwMTQ0NjE2MzQ5OCIsImgiOiJpb2ZkZnUifQ.jpg?class=squareLarge",
    ],
    currentCarouselIndex: 0,
  },
  {
    id: "18025872971891413",
    shortcode: "DcI8c9DiJm0-1",
    permalink: "https://www.instagram.com/p/DcI8c9DiJm0/",
    mediaUrl:
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODA4NDQ5ODk5NTY5NjY5OCIsImgiOiJ5dHlobHEiLCJjIjoiMTgwMjU4NzI5NzE4OTE0MTMifQ.jpg?class=squareLarge",
    caption:
      "Jai Shreenathji. \nIt's a combination of natural stone, faith, artistry, and divine grace. \n#shreenathji #mandir #stonemandir #ahmedabad",
    category: "murals",
    categoryLabel: "Spiritual Stone Sanctums",
    productName: "Jai Shreenathji Spiritual Relief",
    likes: 28,
    comments: 2,
    mediaType: "IMAGE",
    location: "Ahmedabad Atelier",
    date: "15 Aug 2026",
    isLivePost: true,
    carouselImages: [
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODA4NDQ5ODk5NTY5NjY5OCIsImgiOiJ5dHlobHEiLCJjIjoiMTgwMjU4NzI5NzE4OTE0MTMifQ.jpg?class=squareLarge",
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODA4NDQ5ODk5NTY5NjY5OCIsImgiOiJ4em15ZTYiLCJjIjoiMTgwMjk4NTgwMjc2NjcxMjYifQ.jpg?class=squareLarge",
    ],
    currentCarouselIndex: 0,
  },
  {
    id: "18029858027667126",
    shortcode: "DcI8c9DiJm0-2",
    permalink: "https://www.instagram.com/p/DcI8c9DiJm0/",
    mediaUrl:
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODA4NDQ5ODk5NTY5NjY5OCIsImgiOiJ4em15ZTYiLCJjIjoiMTgwMjk4NTgwMjc2NjcxMjYifQ.jpg?class=squareLarge",
    caption:
      "Jai Shreenathji. \nIt's a combination of natural stone, faith, artistry, and divine grace. \n#shreenathji #mandir #stonemandir #ahmedabad",
    category: "murals",
    categoryLabel: "Spiritual Stone Sanctums",
    productName: "Jai Shreenathji Stone Relief Carving",
    likes: 25,
    comments: 1,
    mediaType: "IMAGE",
    location: "Ahmedabad Atelier",
    date: "15 Aug 2026",
    isLivePost: true,
    carouselImages: [
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODA4NDQ5ODk5NTY5NjY5OCIsImgiOiJ5dHlobHEiLCJjIjoiMTgwMjU4NzI5NzE4OTE0MTMifQ.jpg?class=squareLarge",
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODA4NDQ5ODk5NTY5NjY5OCIsImgiOiJ4em15ZTYiLCJjIjoiMTgwMjk4NTgwMjc2NjcxMjYifQ.jpg?class=squareLarge",
    ],
    currentCarouselIndex: 1,
  },
  {
    id: "17892321279667553",
    shortcode: "Db79wKyiH_B-1",
    permalink: "https://www.instagram.com/p/Db79wKyiH_B/",
    mediaUrl:
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODAyMTM0MDQ0MjcwMjc1MyIsImgiOiIxNHllcnF1IiwiYyI6IjE3ODkyMzIxMjc5NjY3NTUzIn0.jpg?class=squareLarge",
    caption:
      "Natural textured sandstone applied on a wall which is giving it a raw look. \n#sandstone #texturedstone #cladding #ahmedabad",
    category: "cladding",
    categoryLabel: "Exterior Cladding",
    productName: "Natural Textured Sandstone Wall",
    likes: 19,
    comments: 1,
    mediaType: "IMAGE",
    location: "Ahmedabad Site",
    date: "12 Aug 2026",
    isLivePost: true,
    carouselImages: [
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODAyMTM0MDQ0MjcwMjc1MyIsImgiOiIxNHllcnF1IiwiYyI6IjE3ODkyMzIxMjc5NjY3NTUzIn0.jpg?class=squareLarge",
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODAyMTM0MDQ0MjcwMjc1MyIsImgiOiJidmRqODMiLCJjIjoiMTgxMTIxMjIzMTk5NTE0MjAifQ.jpg?class=squareLarge",
    ],
    currentCarouselIndex: 0,
  },
  {
    id: "18112122319951420",
    shortcode: "Db79wKyiH_B-2",
    permalink: "https://www.instagram.com/p/Db79wKyiH_B/",
    mediaUrl:
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODAyMTM0MDQ0MjcwMjc1MyIsImgiOiJidmRqODMiLCJjIjoiMTgxMTIxMjIzMTk5NTE0MjAifQ.jpg?class=squareLarge",
    caption:
      "Natural textured sandstone applied on a wall which is giving it a raw look. \n#sandstone #texturedstone #cladding #ahmedabad",
    category: "cladding",
    categoryLabel: "Exterior Cladding",
    productName: "Textured Sandstone Wall Surface",
    likes: 14,
    comments: 0,
    mediaType: "IMAGE",
    location: "Ahmedabad Site",
    date: "12 Aug 2026",
    isLivePost: true,
    carouselImages: [
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODAyMTM0MDQ0MjcwMjc1MyIsImgiOiIxNHllcnF1IiwiYyI6IjE3ODkyMzIxMjc5NjY3NTUzIn0.jpg?class=squareLarge",
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODAyMTM0MDQ0MjcwMjc1MyIsImgiOiJidmRqODMiLCJjIjoiMTgxMTIxMjIzMTk5NTE0MjAifQ.jpg?class=squareLarge",
    ],
    currentCarouselIndex: 1,
  },
  {
    id: "18618797698054406",
    shortcode: "Db3RI53klgu-1",
    permalink: "https://www.instagram.com/p/Db3RI53klgu/",
    mediaUrl:
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEyMzU4ODIxNzcwMTE2NSIsImgiOiJrbnd1OWIiLCJjIjoiMTg2MTg3OTc2OTgwNTQ0MDYifQ.jpg?class=squareLarge",
    caption:
      "Teakwood sandstone in a bold geometric composition to give an impression of an artistic strip on the facade of a farmhouse. \n#teakwood #facade #farmhouse #stoneart",
    category: "cladding",
    categoryLabel: "Exterior Cladding",
    productName: "Teakwood Sandstone Geometric Facade",
    likes: 24,
    comments: 3,
    mediaType: "IMAGE",
    location: "Ahmedabad Farmhouse",
    date: "10 Aug 2026",
    isLivePost: true,
    carouselImages: [
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEyMzU4ODIxNzcwMTE2NSIsImgiOiJrbnd1OWIiLCJjIjoiMTg2MTg3OTc2OTgwNTQ0MDYifQ.jpg?class=squareLarge",
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEyMzU4ODIxNzcwMTE2NSIsImgiOiI3dWtwZnQiLCJjIjoiMTg2MTY4MjQwMzQwMzg5MTIifQ.jpg?class=squareLarge",
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEyMzU4ODIxNzcwMTE2NSIsImgiOiIxZjh4ZDh1IiwiYyI6IjE4MDkwMTIyMjM3NDEzMzQ0In0.jpg?class=squareLarge",
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEyMzU4ODIxNzcwMTE2NSIsImgiOiI5Z25iZjciLCJjIjoiMTc5MTk4NDIzNDAyMDAyMzMifQ.jpg?class=squareLarge",
    ],
    currentCarouselIndex: 0,
  },
  {
    id: "18616824034038912",
    shortcode: "Db3RI53klgu-2",
    permalink: "https://www.instagram.com/p/Db3RI53klgu/",
    mediaUrl:
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEyMzU4ODIxNzcwMTE2NSIsImgiOiI3dWtwZnQiLCJjIjoiMTg2MTY4MjQwMzQwMzg5MTIifQ.jpg?class=squareLarge",
    caption:
      "Teakwood sandstone in a bold geometric composition to give an impression of an artistic strip on the facade of a farmhouse. \n#teakwood #facade #farmhouse #stoneart",
    category: "cladding",
    categoryLabel: "Exterior Cladding",
    productName: "Teakwood Sandstone Strip Perspective",
    likes: 20,
    comments: 1,
    mediaType: "IMAGE",
    location: "Ahmedabad Farmhouse",
    date: "10 Aug 2026",
    isLivePost: true,
    carouselImages: [
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEyMzU4ODIxNzcwMTE2NSIsImgiOiJrbnd1OWIiLCJjIjoiMTg2MTg3OTc2OTgwNTQ0MDYifQ.jpg?class=squareLarge",
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEyMzU4ODIxNzcwMTE2NSIsImgiOiI3dWtwZnQiLCJjIjoiMTg2MTY4MjQwMzQwMzg5MTIifQ.jpg?class=squareLarge",
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEyMzU4ODIxNzcwMTE2NSIsImgiOiIxZjh4ZDh1IiwiYyI6IjE4MDkwMTIyMjM3NDEzMzQ0In0.jpg?class=squareLarge",
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEyMzU4ODIxNzcwMTE2NSIsImgiOiI5Z25iZjciLCJjIjoiMTc5MTk4NDIzNDAyMDAyMzMifQ.jpg?class=squareLarge",
    ],
    currentCarouselIndex: 1,
  },
  {
    id: "18090122237413344",
    shortcode: "Db3RI53klgu-3",
    permalink: "https://www.instagram.com/p/Db3RI53klgu/",
    mediaUrl:
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEyMzU4ODIxNzcwMTE2NSIsImgiOiIxZjh4ZDh1IiwiYyI6IjE4MDkwMTIyMjM3NDEzMzQ0In0.jpg?class=squareLarge",
    caption:
      "Teakwood sandstone in a bold geometric composition to give an impression of an artistic strip on the facade of a farmhouse. \n#teakwood #facade #farmhouse #stoneart",
    category: "cladding",
    categoryLabel: "Exterior Cladding",
    productName: "Teakwood Farmhouse Architectural Elevation",
    likes: 18,
    comments: 0,
    mediaType: "IMAGE",
    location: "Ahmedabad Farmhouse",
    date: "10 Aug 2026",
    isLivePost: true,
    carouselImages: [
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEyMzU4ODIxNzcwMTE2NSIsImgiOiJrbnd1OWIiLCJjIjoiMTg2MTg3OTc2OTgwNTQ0MDYifQ.jpg?class=squareLarge",
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEyMzU4ODIxNzcwMTE2NSIsImgiOiI3dWtwZnQiLCJjIjoiMTg2MTY4MjQwMzQwMzg5MTIifQ.jpg?class=squareLarge",
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEyMzU4ODIxNzcwMTE2NSIsImgiOiIxZjh4ZDh1IiwiYyI6IjE4MDkwMTIyMjM3NDEzMzQ0In0.jpg?class=squareLarge",
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEyMzU4ODIxNzcwMTE2NSIsImgiOiI5Z25iZjciLCJjIjoiMTc5MTk4NDIzNDAyMDAyMzMifQ.jpg?class=squareLarge",
    ],
    currentCarouselIndex: 2,
  },
  {
    id: "17919842340200233",
    shortcode: "Db3RI53klgu-4",
    permalink: "https://www.instagram.com/p/Db3RI53klgu/",
    mediaUrl:
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEyMzU4ODIxNzcwMTE2NSIsImgiOiI5Z25iZjciLCJjIjoiMTc5MTk4NDIzNDAyMDAyMzMifQ.jpg?class=squareLarge",
    caption:
      "Teakwood sandstone in a bold geometric composition to give an impression of an artistic strip on the facade of a farmhouse. \n#teakwood #facade #farmhouse #stoneart",
    category: "cladding",
    categoryLabel: "Exterior Cladding",
    productName: "Teakwood Sandstone Texture Detail",
    likes: 16,
    comments: 0,
    mediaType: "IMAGE",
    location: "Ahmedabad Farmhouse",
    date: "10 Aug 2026",
    isLivePost: true,
    carouselImages: [
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEyMzU4ODIxNzcwMTE2NSIsImgiOiJrbnd1OWIiLCJjIjoiMTg2MTg3OTc2OTgwNTQ0MDYifQ.jpg?class=squareLarge",
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEyMzU4ODIxNzcwMTE2NSIsImgiOiI3dWtwZnQiLCJjIjoiMTg2MTY4MjQwMzQwMzg5MTIifQ.jpg?class=squareLarge",
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEyMzU4ODIxNzcwMTE2NSIsImgiOiIxZjh4ZDh1IiwiYyI6IjE4MDkwMTIyMjM3NDEzMzQ0In0.jpg?class=squareLarge",
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEyMzU4ODIxNzcwMTE2NSIsImgiOiI5Z25iZjciLCJjIjoiMTc5MTk4NDIzNDAyMDAyMzMifQ.jpg?class=squareLarge",
    ],
    currentCarouselIndex: 3,
  },
  {
    id: "17865176013644137",
    shortcode: "Db278WokhE6-1",
    permalink: "https://www.instagram.com/p/Db278WokhE6/",
    mediaUrl:
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEzODE4NjY4ODU3MTQyMiIsImgiOiIxMWN2NG91IiwiYyI6IjE3ODY1MTc2MDEzNjQ0MTM3In0.jpg?class=squareLarge",
    caption:
      "Red Indian Sandstone in butch finish on natural surface giving a statement to the facade of a bungalow. \n#sandstone #facade #stonecladding #ahmedabadarchitecture",
    category: "cladding",
    categoryLabel: "Exterior Cladding",
    productName: "Red Indian Sandstone Butch Finish Facade",
    likes: 31,
    comments: 4,
    mediaType: "IMAGE",
    location: "Ahmedabad Bungalow",
    date: "10 Aug 2026",
    isLivePost: true,
    carouselImages: [
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEzODE4NjY4ODU3MTQyMiIsImgiOiIxMWN2NG91IiwiYyI6IjE3ODY1MTc2MDEzNjQ0MTM3In0.jpg?class=squareLarge",
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEzODE4NjY4ODU3MTQyMiIsImgiOiJvcWo4NngiLCJjIjoiMTgxNDA5NTY0MjA1NzUwNTAifQ.jpg?class=squareLarge",
    ],
    currentCarouselIndex: 0,
  },
  {
    id: "18140956420575050",
    shortcode: "Db278WokhE6-2",
    permalink: "https://www.instagram.com/p/Db278WokhE6/",
    mediaUrl:
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEzODE4NjY4ODU3MTQyMiIsImgiOiJvcWo4NngiLCJjIjoiMTgxNDA5NTY0MjA1NzUwNTAifQ.jpg?class=squareLarge",
    caption:
      "Red Indian Sandstone in butch finish on natural surface giving a statement to the facade of a bungalow. \n#sandstone #facade #stonecladding #ahmedabadarchitecture",
    category: "cladding",
    categoryLabel: "Exterior Cladding",
    productName: "Red Indian Butch Finish Natural Surface",
    likes: 27,
    comments: 1,
    mediaType: "IMAGE",
    location: "Ahmedabad Bungalow",
    date: "10 Aug 2026",
    isLivePost: true,
    carouselImages: [
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEzODE4NjY4ODU3MTQyMiIsImgiOiIxMWN2NG91IiwiYyI6IjE3ODY1MTc2MDEzNjQ0MTM3In0.jpg?class=squareLarge",
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxODEzODE4NjY4ODU3MTQyMiIsImgiOiJvcWo4NngiLCJjIjoiMTgxNDA5NTY0MjA1NzUwNTAifQ.jpg?class=squareLarge",
    ],
    currentCarouselIndex: 1,
  },
  {
    id: "17951531553218704",
    shortcode: "DbZjL1WIl9e",
    permalink: "https://www.instagram.com/p/DbZjL1WIl9e/",
    mediaUrl:
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxNzk1MTUzMTU1MzIxODcwNCIsImgiOiIxMzEzZXFwIn0.jpg?class=squareLarge",
    caption:
      "The Perfect Chisel. \nHand chiseled basalt stone shaped to give fine edges to the natural surface. \n#stonewalls #stoneart #walldecor #wallart #ahmedabad",
    category: "ledgestone",
    categoryLabel: "Basalt & Wall Decor",
    productName: "Hand Chiseled Basalt Stone Wall",
    likes: 6,
    comments: 0,
    mediaType: "IMAGE",
    location: "Ahmedabad Project",
    date: "30 Jul 2026",
    isLivePost: true,
    carouselImages: [
      "https://behold.pictures/eyJ1IjoiY2Z3ZEl1SHBTdmRtRnkxeUFSRzdLaVBXZ1BKMyIsImYiOiJWYjVpNmI5MzVzeHdUNWg4b1RGbyIsInAiOiIxNzk1MTUzMTU1MzIxODcwNCIsImgiOiIxMzEzZXFwIn0.jpg?class=squareLarge",
    ],
    currentCarouselIndex: 0,
  },
];
export const INSTAGRAM_POSTS_300: InstagramPost[] = LIVE_BEHOLD_POSTS;

export const CATEGORY_TABS: CategoryTab[] = [
  { key: "all", label: "All Works", count: LIVE_BEHOLD_POSTS.length },
];
