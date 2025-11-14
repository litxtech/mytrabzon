// KTÜ (Karadeniz Teknik Üniversitesi) Type Definitions

export interface KTUStudent {
  id: string;
  student_number: string;
  faculty_id: string | null;
  department_id: string | null;
  class_year: number | null;
  ktu_email: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  verification_document_url: string | null;
  verified_at: string | null;
  verified_by: string | null;
  verification_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface KTUFaculty {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface KTUDepartment {
  id: string;
  faculty_id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface KTUAnnouncement {
  id: string;
  title: string;
  content: string;
  category: 'general' | 'faculty' | 'department' | 'club' | 'event' | 'exam' | 'academic';
  faculty_id: string | null;
  department_id: string | null;
  author_id: string;
  is_pinned: boolean;
  is_important: boolean;
  attachment_url: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  faculty?: KTUFaculty | null;
  department?: KTUDepartment | null;
}

export interface KTUEvent {
  id: string;
  title: string;
  description: string;
  event_type: 'seminar' | 'concert' | 'sports' | 'academic' | 'social' | 'club' | 'general';
  faculty_id: string | null;
  department_id: string | null;
  club_id: string | null;
  organizer_id: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  image_url: string | null;
  max_attendees: number | null;
  is_public: boolean;
  registration_required: boolean;
  attendee_count: number;
  created_at: string;
  updated_at: string;
  organizer?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  faculty?: KTUFaculty | null;
  department?: KTUDepartment | null;
  is_attending?: boolean;
}

export interface KTUClub {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  faculty_id: string | null;
  president_id: string | null;
  member_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  president?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  faculty?: KTUFaculty | null;
  is_member?: boolean;
  user_role?: 'member' | 'board' | 'president';
}

export interface KTUClubMember {
  id: string;
  club_id: string;
  user_id: string;
  role: 'member' | 'board' | 'president';
  joined_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

