import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import UpgradeModal from "@/components/UpgradeModal";

const FREE_TEMPLATE_LIMIT = 3;

export default function TemplateNew() {
  const { workspace } = useWorkspace();
  const { isPro } = useSubscription();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [templateCount, setTemplateCount] = useState(0);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!workspace) return;
    supabase.from("templates").select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id).eq("status", "active")
      .then(({ count }) => setTemplateCount(count || 0));
  }, [workspace]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;

    if (!isPro && templateCount >= FREE_TEMPLATE_LIMIT) {
      setUpgradeOpen(true);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("templates")
      .insert({ workspace_id: workspace.id, title, description })
      .select()
      .single();
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      navigate(`/app/templates/${data.id}`);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create Template</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Website Redesign Intake" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this template for?" rows={3} />
            </div>
            {!isPro && templateCount >= FREE_TEMPLATE_LIMIT && (
              <p className="text-xs text-muted-foreground">Free plan is limited to {FREE_TEMPLATE_LIMIT} active templates. Upgrade to Pro for unlimited.</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating…" : "Create & Add Fields"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature="Unlimited Templates" />
    </div>
  );
}
