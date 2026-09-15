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
  photo_url: string | null;
  phone: string | null;
  is_mentor: boolean;
  seeking_mentorship: boolean;
  mentor_expertise: string[] | null;
  mentor_industries: string[] | null;
  mentor_availability: string | null;
  mentor_bio: string | null;
  max_mentees: number | null;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
};

// Sensitive contact fields — stored in a separate table (member_contacts) with
// strict RLS so they never leak through a profile row. See migration 0008.
export type MemberContact = {
  member_id: string;
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
