export type District = 
  | 'Ortahisar'
  | 'Akçaabat'
  | 'Araklı'
  | 'Arsin'
  | 'Beşikdüzü'
  | 'Çarşıbaşı'
  | 'Çaykara'
  | 'Dernekpazarı'
  | 'Düzköy'
  | 'Hayrat'
  | 'Köprübaşı'
  | 'Maçka'
  | 'Of'
  | 'Sürmene'
  | 'Şalpazarı'
  | 'Tonya'
  | 'Vakfıkebir'
  | 'Yomra'
  | 'Alucra'
  | 'Bulancak'
  | 'Çamoluk'
  | 'Çanakçı'
  | 'Dereli'
  | 'Doğankent'
  | 'Espiye'
  | 'Eynesil'
  | 'Görele'
  | 'Güce'
  | 'Keşap'
  | 'Merkez'
  | 'Piraziz'
  | 'Şebinkarahisar'
  | 'Tirebolu'
  | 'Yağlıdere';

export type City = 'Trabzon' | 'Giresun';
export type Gender = 'male' | 'female' | 'other';

export interface SocialMedia {
  instagram?: string;
  twitter?: string;
  facebook?: string;
  linkedin?: string;
  tiktok?: string;
  youtube?: string;
}

export interface PrivacySettings {
  show_age: boolean;
  show_gender: boolean;
  show_phone: boolean;
  show_email: boolean;
  show_address: boolean;
  show_height: boolean;
  show_weight: boolean;
  show_social_media: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  district: District;
  city: City | null;
  age: number | null;
  gender: Gender | null;
  phone: string | null;
  address: string | null;
  height: number | null;
  weight: number | null;
  social_media: SocialMedia;
  privacy_settings: PrivacySettings;
  show_address: boolean;
  show_in_directory: boolean;
  verified: boolean;
  selfie_verified: boolean;
  points: number;
  deletion_requested_at: string | null;
  deletion_scheduled_at: string | null;
  supporter_badge: boolean;
  supporter_badge_color: 'yellow' | 'green' | 'blue' | 'red' | null;
  supporter_badge_visible: boolean;
  supporter_badge_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  post_type?: 'image' | 'video' | 'reel';
  type?: 'image' | 'video' | 'reel'; // Reels için
  video_url?: string; // Reels için
  thumbnail_url?: string; // Reels için
  width?: number; // Reels için
  height?: number; // Reels için
  duration_seconds?: number; // Reels için
  tags?: string[]; // Reels için
  video_metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    video_url?: string;
    thumbnail_url?: string;
  };
  save_count?: number;
  view_count?: number;
  id: string;
  author_id: string;
  content: string;
  media: { type: 'image' | 'video'; path: string }[] | null;
  district: District;
  hashtags: string[] | null;
  mentions: string[] | null;
  visibility: 'public' | 'friends' | 'private';
  like_count: number;
  comment_count: number;
  share_count: number;
  views_count: number;
  is_pinned: boolean;
  edited: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
  author?: UserProfile;
  is_liked?: boolean;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  likes_count: number;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
}

export interface CommentLike {
  id: string;
  comment_id: string;
  user_id: string;
  created_at: string;
}

export interface ChatRoom {
  id: string;
  name: string | null;
  avatar_url: string | null;
  type: 'direct' | 'group' | 'district';
  district: District | null;
  last_message_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ChatMember {
  id: string;
  room_id: string;
  user_id: string;
  role: 'admin' | 'member';
  unread_count: number;
  last_read_at: string | null;
  joined_at: string;
}

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  media_type: 'image' | 'video' | 'audio' | 'file' | null;
  reply_to: string | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
  reply_to_message?: {
    id: string;
    content: string;
    user?: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  reactions?: MessageReaction[];
}

export interface Notification {
  id: string;
  user_id: string | null;
  district: District | null;
  title: string;
  message: string;
  type: 'general' | 'district' | 'emergency' | 'post' | 'comment' | 'like' | 'follow' | 'message';
  reference_id: string | null;
  reference_type: string | null;
  image_url: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}


export interface Event {
  id: string;
  user_id: string;
  title: string;
  description: string;
  image_url: string | null;
  district: District;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  start_date: string;
  end_date: string | null;
  capacity: number | null;
  attendees_count: number;
  category: string | null;
  tags: string[] | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  status: 'going' | 'interested' | 'not_going';
  created_at: string;
}

export interface HelpRequest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: 'blood' | 'lost' | 'found' | 'volunteer' | 'other';
  district: District;
  contact_info: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  image_url: string | null;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'closed';
  helpers_count: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
}

export interface HelpResponse {
  id: string;
  request_id: string;
  user_id: string;
  message: string;
  created_at: string;
  user?: UserProfile;
}

export interface Business {
  id: string;
  user_id: string;
  name: string;
  description: string;
  category: string;
  district: District;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  cover_url: string | null;
  location_lat: number | null;
  location_lng: number | null;
  rating: number;
  reviews_count: number;
  is_verified: boolean;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  images: string[] | null;
  category: string | null;
  stock: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessReview {
  id: string;
  business_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user?: UserProfile;
}

export interface Campaign {
  id: string;
  user_id: string;
  title: string;
  description: string;
  goal_amount: number;
  current_amount: number;
  currency: string;
  district: District | null;
  category: string | null;
  image_url: string | null;
  end_date: string | null;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  stripe_account_id: string | null;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
}

export interface Donation {
  id: string;
  campaign_id: string;
  user_id: string | null;
  amount: number;
  currency: string;
  is_anonymous: boolean;
  message: string | null;
  stripe_payment_id: string | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  content_type: 'post' | 'comment' | 'message' | 'user' | 'business';
  content_id: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  role: 'super_admin' | 'admin' | 'moderator';
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  points: number;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

export interface AppSettings {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

export interface AnalyticsEvent {
  id: string;
  user_id: string | null;
  event_type: string;
  event_data: Record<string, unknown> | null;
  district: District | null;
  created_at: string;
}

export interface UserStats {
  posts_count: number;
  followers_count: number;
  following_count: number;
  points: number;
}

export interface FeedPost extends Post {
  is_liked: boolean;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface TypingIndicator {
  room_id: string;
  user_id: string;
  user_name: string;
  timestamp: number;
}

export interface OnlineStatus {
  user_id: string;
  is_online: boolean;
  last_seen: string;
}

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface ChatRoomWithDetails extends ChatRoom {
  last_message: Message | null;
  members: (ChatMember & { user: UserProfile })[];
  other_user?: UserProfile | null;
  unread_count: number;
}
