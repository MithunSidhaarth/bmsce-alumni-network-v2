export type UserType = "alumni" | "student";
export type Role = "member" | "admin";
export type VerificationStatus = "unverified" | "verified" | "rejected";

export type Profile = {
  id: string;
  user_type: UserType;
  role: Role;
  verification_status: VerificationStatus;
  rejection_reason: string | null;
  full_name: string | null;
  current_city: string | null;
  country: string | null;
  state: string | null;
  graduation_year: number | null;
  branch: string | null;
  company: string | null;
  job_title: string | null;
  industry: string | null;
  bio: string | null;
  linkedin_url: string | null;
  linkedin_verified: boolean;
  photo_url: string | null;
  is_mentor: boolean;
  seeking_mentorship: boolean;
  mentor_expertise: string[] | null;
  mentor_industries: string[] | null;
  mentor_availability: string | null;
  mentor_bio: string | null;
  max_mentees: number | null;
  onboarded: boolean;
  passing_out_date: string | null;
  lifecycle_hold: boolean;
  lifecycle_note: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  skills: string[];
  interests: string[];
  privacy: Privacy;
  /** The roll number printed on the member's college ID card. Optional. */
  usn: string | null;
  /** The member's BMSCE degree (BE, MTech...), if they chose to say. */
  degree: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

// Sensitive contact fields — stored in a separate table (member_contacts) with
// strict RLS so they never leak through a profile row. See migration 0008.
export type MemberContact = {
  member_id: string;
  phone: string | null;
  personal_email: string | null;
  college_email: string | null;
};

export type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  country: string | null;
  state: string | null;
  cover_image_url: string | null;
  rsvp_url: string | null;
  created_by: string | null;
  created_at: string;
};

export type SocialPost = {
  id: string;
  post_id: string | null;
  short_code: string | null;
  caption: string | null;
  image_url: string | null;
  video_url: string | null;
  post_type: string | null;
  posted_at: string | null;
  likes_count: number;
  comments_count: number;
  permalink: string | null;
  hashtags: string[] | null;
  created_at: string;
};

export type Newsletter = {
  id: string;
  year: number;
  title: string | null;
  pdf_url: string;
  uploaded_by: string | null;
  uploaded_at: string;
};

export type PostingType = "job" | "internship";

export type JobPosting = {
  id: string;
  posted_by: string | null;
  title: string;
  company: string;
  type: PostingType;
  location: string | null;
  remote: boolean;
  description: string;
  responsibilities: string | null;
  skills_required: string[] | null;
  experience_level: string | null;
  duration: string | null;
  stipend_or_salary: string | null;
  application_deadline: string | null;
  external_link: string | null;
  // Soft delete: non-null means the posting is removed from the careers board
  // but its applications are preserved. See migration 0006.
  closed_at: string | null;
  created_at: string;
};

export type ApplicationStatus =
  | "submitted"
  | "reviewed"
  | "accepted"
  | "rejected";

export type JobApplication = {
  id: string;
  job_id: string;
  applicant_id: string;
  cover_note: string | null;
  status: ApplicationStatus;
  resume_url: string | null;
  applicant_name: string | null;
  applicant_email: string | null;
  applicant_phone: string | null;
  created_at: string;
};

export type MentorshipStatus = "pending" | "accepted" | "declined";

export type MentorshipRequest = {
  id: string;
  mentee_id: string;
  mentor_id: string;
  message: string | null;
  status: MentorshipStatus;
  created_at: string;
  updated_at: string;
};

export type GalleryPhoto = {
  id: string;
  image_url: string; // medium, web-optimized — used in the lightbox
  thumbnail_url: string; // small, compressed — used in the grid
  caption: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
};

export type EducationEntry = {
  id: string;
  profile_id: string;
  degree: string;
  institution: string;
  year: number | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// v2
// ---------------------------------------------------------------------------
export type Privacy = {
  dm: "members" | "chapters" | "nobody";
  show_work: boolean;
  show_location: boolean;
  show_linkedin: boolean;
  /** Missing means on: other members see a green dot while this member is online. */
  show_online?: boolean;
};

export type PostKind = "post" | "discussion" | "announcement" | "achievement" | "memory" | "ask" | "offer";

/** Someone named in a post or reply with "@Full Name". The name is set by the database. */
export type Mention = { id: string; name: string };

/** A card for the first link in a post: text only, fetched once when it is posted. */
export type LinkPreview = { url: string; title: string; description?: string; site?: string };
export type ReactionKind = "like" | "cheer" | "nostalgia" | "insight";

export type PostAuthor = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  user_type: UserType;
  graduation_year: number | null;
  branch: string | null;
};

export type Post = {
  id: string;
  author_id: string | null;
  kind: PostKind;
  title: string | null;
  body: string;
  media: string[];
  tags: string[];
  chapter_id: string | null;
  event_id: string | null;
  is_pinned: boolean;
  is_hidden: boolean;
  comment_count: number;
  reaction_count: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string | null;
  /** A poll's options and how many votes each has; null when the post has no poll. */
  poll_options: string[] | null;
  poll_counts: number[] | null;
  link_preview: LinkPreview | null;
  mentions: Mention[];
  author: PostAuthor | null;
  chapter: { name: string; slug: string } | null;
};

export type Chapter = {
  id: string;
  slug: string;
  name: string;
  region: string;
  country: string | null;
  city: string | null;
  description: string | null;
  cover_url: string | null;
  lng: number | null;
  lat: number | null;
  join_policy: "open" | "request";
  whatsapp_url: string | null;
  status: "active" | "archived";
  created_at: string;
};

export type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_md: string;
  cover_url: string | null;
  category: string;
  tags: string[];
  author_id: string | null;
  author_name: string | null;
  author_title: string | null;
  status: "draft" | "published" | "archived";
  is_featured: boolean;
  published_at: string | null;
  reading_minutes: number;
  view_count: number;
  created_at: string;
  updated_at: string;
};

export type NoticeCard = {
  id: string;
  source: "instagram" | "post" | "event" | "photo" | "manual";
  origin: "auto" | "admin" | "member";
  pinned: boolean;
  date: string;
  title: string | null;
  body: string | null;
  image: string | null;
  link: string | null;
  instagram: {
    caption: string | null;
    image: string | null;
    permalink: string | null;
    posted_at: string | null;
    type: string | null;
    source: string;
  } | null;
  post: {
    id: string;
    kind: PostKind;
    title: string | null;
    body: string;
    media: string[];
    created_at: string;
    author_id: string | null;
    author: string | null;
    author_photo: string | null;
    chapter: string | null;
    chapter_slug: string | null;
  } | null;
  event: { id: string; title: string; date: string; location: string | null; image: string | null } | null;
  photo: { image: string; thumb: string; caption: string | null } | null;
};
