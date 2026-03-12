import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Workspace {
  id: string;
  owner_user_id: string;
  business_name: string;
  logo_url: string | null;
  brand_color: string;
  plan: string;
  monthly_submission_limit: number;
  created_at: string;
}

export function useWorkspace() {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkspace = async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("workspaces")
      .select("*")
      .eq("owner_user_id", user.id)
      .single();
    setWorkspace(data as Workspace | null);
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkspace();
  }, [user]);

  return { workspace, loading, refetch: fetchWorkspace };
}
