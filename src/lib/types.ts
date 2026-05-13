export type Trip = {
  id: string;
  user_id: string;
  title: string;
  location: string;
  start_date: string | null;
  end_date: string | null;
  group_hunt_id?: string | null;
  group_participant_id?: string | null;
  share_id?: string | null;
  is_public?: boolean;
  created_at: string;
};

export type GroupHunt = {
  id: string;
  host_user_id: string;
  title: string;
  location: string;
  start_date: string | null;
  end_date: string | null;
  invite_token: string;
  group_size: number;
  status: "open" | "active" | "completed" | "archived";
  created_at: string;
};

export type GroupHuntParticipant = {
  id: string;
  group_hunt_id: string;
  user_id: string | null;
  seat_index: number;
  assigned_color_name: string;
  assigned_color_hex: string;
  assigned_prompt: string;
  invite_token: string;
  status: "invited" | "joined" | "started" | "completed";
  joined_at: string | null;
  created_at: string;
};

export type Mission = {
  id: string;
  trip_id: string;
  color_name: string;
  color_hex: string;
  prompt: string;
  max_photos: number;
  created_at: string;
};

export type Photo = {
  id: string;
  trip_id: string;
  mission_id: string;
  user_id: string;
  image_url: string | null;
  storage_path: string;
  sort_order: number | null;
  caption: string | null;
  dominant_color: string | null;
  color_match_score: number | null;
  created_at: string;
};

export type PosterExport = {
  id: string;
  trip_id: string;
  format: "post" | "story" | "square";
  storage_path: string;
  image_url: string;
  generated_at: string;
};
