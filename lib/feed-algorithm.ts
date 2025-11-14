/**
 * FEED ALGORITHM - TypeScript Implementation
 * Instagram-like feed scoring algoritması
 */

import { Post } from '@/types/database';

export interface UserContext {
  userId: string;
  followedUserIds: string[];
  interests: string[];
  preferredTags: Record<string, number>; // tag -> weight
}

export interface FeedPost extends Post {
  feed_score?: number;
  reel_score?: number;
}

/**
 * Feed post scoring function
 * Basit bir scoring algoritması - zamanla geliştirilebilir
 */
export function scoreFeedPost(
  post: Post,
  userContext: UserContext
): number {
  const now = Date.now();
  const postTime = new Date(post.created_at).getTime();
  const hoursSincePost = (now - postTime) / (1000 * 60 * 60);

  // 1. RECENCY SCORE (0-100)
  // Yeni post'lar daha yüksek skor alır
  let recencyScore = 0;
  if (hoursSincePost < 24) {
    recencyScore = 100 * Math.exp(-hoursSincePost / 24);
  } else if (hoursSincePost < 168) { // 1 hafta
    recencyScore = 50 * Math.exp(-(hoursSincePost - 24) / 144);
  } else {
    recencyScore = 10 * Math.exp(-(hoursSincePost - 168) / 720);
  }

  // 2. ENGAGEMENT SCORE (0-100)
  // Like, comment, save sayılarına göre normalize edilmiş skor
  const normalizeEngagement = (count: number, maxCount: number = 1000): number => {
    return (Math.log(1 + count) / Math.log(1 + maxCount)) * 100;
  };

  const engagementScore =
    normalizeEngagement(post.like_count || 0) * 0.4 +
    normalizeEngagement(post.comment_count || 0) * 0.3 +
    normalizeEngagement((post as any).save_count || 0) * 0.2 +
    normalizeEngagement((post as any).view_count || 0) * 0.1;

  // 3. RELATIONSHIP SCORE (0-50)
  // Takip edilen kullanıcıların post'ları daha yüksek skor alır
  let relationshipScore = 10;
  if (post.author_id === userContext.userId) {
    relationshipScore = 30; // Kendi post'ları
  } else if (userContext.followedUserIds.includes(post.author_id)) {
    relationshipScore = 50; // Takip edilen kullanıcılar
  }

  // 4. INTEREST SCORE (0-50)
  // Post tag'leri ile kullanıcı ilgi alanlarının eşleşmesi
  let interestScore = 0;
  if (post.hashtags && Array.isArray(post.hashtags)) {
    post.hashtags.forEach((tag: string) => {
      const weight = userContext.preferredTags[tag.toLowerCase()] || 0;
      interestScore += weight * 10;
    });
  }
  interestScore = Math.min(interestScore, 50); // Max 50 puan

  // Toplam skor
  return recencyScore + engagementScore + relationshipScore + interestScore;
}

/**
 * Reel scoring function
 * Reels için özel scoring algoritması
 */
export function scoreReel(
  post: Post,
  userContext: UserContext,
  metrics?: {
    avgCompletionRate?: number;
    avgLikeRate?: number;
    avgShareRate?: number;
  }
): number {
  const now = Date.now();
  const postTime = new Date(post.created_at).getTime();
  const hoursSincePost = (now - postTime) / (1000 * 60 * 60);

  // 1. RECENCY SCORE (0-40)
  let recencyScore = 0;
  if (hoursSincePost < 48) {
    recencyScore = 40 * Math.exp(-hoursSincePost / 48);
  } else if (hoursSincePost < 168) {
    recencyScore = 20 * Math.exp(-(hoursSincePost - 48) / 120);
  } else {
    recencyScore = 5;
  }

  // 2. ENGAGEMENT SCORE (0-30)
  // View count'a daha fazla ağırlık (Reels için önemli)
  const normalizeEngagement = (count: number, maxCount: number = 10000): number => {
    return (Math.log(1 + count) / Math.log(1 + maxCount)) * 30;
  };

  const engagementScore =
    normalizeEngagement((post as any).view_count || 0) * 0.5 +
    normalizeEngagement(post.like_count || 0) * 0.3 +
    normalizeEngagement(post.comment_count || 0) * 0.1 +
    normalizeEngagement(post.share_count || 0) * 0.1;

  // 3. RELATIONSHIP SCORE (0-15)
  let relationshipScore = 5;
  if (post.author_id === userContext.userId) {
    relationshipScore = 10;
  } else if (userContext.followedUserIds.includes(post.author_id)) {
    relationshipScore = 15;
  }

  // 4. QUALITY SCORE (0-15)
  // Completion rate, like rate, share rate'a göre
  const qualityScore =
    (metrics?.avgCompletionRate || 0) * 0.1 +
    (metrics?.avgLikeRate || 0) * 0.03 +
    (metrics?.avgShareRate || 0) * 0.02;

  return recencyScore + engagementScore + relationshipScore + qualityScore;
}

/**
 * Sort posts by feed score
 */
export function sortPostsByScore(
  posts: Post[],
  userContext: UserContext
): FeedPost[] {
  return posts
    .map((post) => ({
      ...post,
      feed_score: scoreFeedPost(post, userContext),
    }))
    .sort((a, b) => (b.feed_score || 0) - (a.feed_score || 0));
}

/**
 * Sort reels by reel score
 */
export function sortReelsByScore(
  reels: Post[],
  userContext: UserContext,
  metricsMap?: Map<string, {
    avgCompletionRate?: number;
    avgLikeRate?: number;
    avgShareRate?: number;
  }>
): FeedPost[] {
  return reels
    .map((reel) => {
      const metrics = metricsMap?.get(reel.id);
      return {
        ...reel,
        reel_score: scoreReel(reel, userContext, metrics),
      };
    })
    .sort((a, b) => (b.reel_score || 0) - (a.reel_score || 0));
}

