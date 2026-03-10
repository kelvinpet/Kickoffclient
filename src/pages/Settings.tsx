import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import UpgradeModal from "@/components/UpgradeModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { User, Palette, AlertTriangle, LogOut, Trash2, Lock, Eye, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NotifPrefs {
  notify_new_submission: boolean;
  notify_client_approval: boolean;
  notify_change_request: boolean;
  notify_deposit_paid: boolean;
}

export default function Settings() {
  const { workspace, refetch } = useWorkspace();
  const { isPro } = useSubscription();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [brandColor, setBrandColor] = useState("#6366f1");
  const [savingBranding, setSavingBranding] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    notify_new_submission: true,
    notify_client_approval: true,
    notify_change_request: true,
    notify_deposit_paid: true,
  });
  const [savingNotifs, setSavingNotifs] = useState(false);

  useEffect(() => {
    if (workspace) {
      setBusinessName(workspace.business_name);
      setBrandColor(workspace.brand_color || "#6366f1");
      fetchNotifPrefs();
    }
  }, [workspace]);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.name) setFullName(data.name);
        });
    }
  }, [user]);

  const fetchNotifPrefs = async () => {
    if (!workspace) return;
    const { data } = await supabase
      .from("notification_preferences" as any)
      .select("*")
      .eq("workspace_id", workspace.id)
      .single() as any;
    if (data) {
      setNotifPrefs({
        notify_new_submission: data.notify_new_submission,
        notify_client_approval: data.notify_client_approval,
        notify_change_request: data.notify_change_request,
        notify_deposit_paid: data.notify_deposit_paid,
      });
    }
  };

  const handleSaveNotifs = async () => {
    if (!workspace) return;
    setSavingNotifs(true);
    const { error } = await (supabase.from("notification_preferences" as any) as any).upsert({
      workspace_id: workspace.id,
      ...notifPrefs,
      updated_at: new Date().toISOString(),
    }, { onConflict: "workspace_id" });
    setSavingNotifs(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Notification preferences saved" });
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name: fullName })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile saved" });
    }
  };

  const handleSaveBranding = async () => {
    if (!workspace) return;
    setSavingBranding(true);
    const updateData: any = { business_name: businessName };
    if (isPro) updateData.brand_color = brandColor;
    const { error } = await supabase
      .from("workspaces")
      .update(updateData)
      .eq("id", workspace.id);
    setSavingBranding(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Branding saved" });
      refetch();
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!workspace) return;
    if (!isPro) {
      setUpgradeFeature("Custom Logo");
      setUpgradeOpen(true);
      return;
    }
    const path = `logos/${workspace.id}_${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("attachments").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }
    const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path);
    await supabase.from("workspaces").update({ logo_url: urlData.publicUrl }).eq("id", workspace.id);
    toast({ title: "Logo uploaded" });
    refetch();
  };

  const handleRemoveLogo = async () => {
    if (!workspace) return;
    await supabase.from("workspaces").update({ logo_url: null }).eq("id", workspace.id);
    toast({ title: "Logo removed" });
    refetch();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password reset email sent", description: "Check your inbox." });
    }
  };

  const notifOptions = [
    { key: "notify_new_submission" as const, label: "New submission received", desc: "When a client submits an intake form" },
    { key: "notify_client_approval" as const, label: "Client approves scope", desc: "When a client approves the kickoff pack" },
    { key: "notify_change_request" as const, label: "Changes requested", desc: "When a client requests changes" },
    { key: "notify_deposit_paid" as const, label: "Deposit paid", desc: "When a client pays a project deposit" },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="bg-muted" />
          </div>
          <button
            onClick={handleResetPassword}
            className="text-sm text-primary hover:underline flex items-center gap-1.5"
          >
            <Lock className="h-3.5 w-3.5" /> Change password
          </button>
          <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
            {saving ? "Saving…" : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {notifOptions.map((opt) => (
            <div key={opt.key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
              <Switch
                checked={notifPrefs[opt.key]}
                onCheckedChange={(checked) => setNotifPrefs((prev) => ({ ...prev, [opt.key]: checked }))}
              />
            </div>
          ))}
          <Button onClick={handleSaveNotifs} disabled={savingNotifs} className="w-full">
            {savingNotifs ? "Saving…" : "Save Preferences"}
          </Button>
        </CardContent>
      </Card>

      {/* Workspace Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" /> Workspace Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Business name</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Brand color {!isPro && <span className="text-xs text-muted-foreground">(Pro only)</span>}</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => {
                  if (!isPro) { setUpgradeFeature("Brand Color"); setUpgradeOpen(true); return; }
                  setBrandColor(e.target.value);
                }}
                className="h-10 w-10 rounded border border-border cursor-pointer"
              />
              <Input
                value={brandColor}
                onChange={(e) => {
                  if (!isPro) { setUpgradeFeature("Brand Color"); setUpgradeOpen(true); return; }
                  setBrandColor(e.target.value);
                }}
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Logo {!isPro && <span className="text-xs text-muted-foreground">(Pro only)</span>}</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
              }}
            />
            {workspace?.logo_url && (
              <div className="flex items-center gap-3 mt-2">
                <img src={workspace.logo_url} alt="Logo" className="h-12 rounded" />
                <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={handleRemoveLogo}>
                  Remove logo
                </Button>
              </div>
            )}
          </div>

          {/* Live Branding Preview */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> Portal Preview</Label>
            <div className="rounded-lg border border-border p-4 bg-background">
              <div className="flex items-center gap-3 mb-3">
                {workspace?.logo_url ? (
                  <img src={workspace.logo_url} alt="Logo" className="h-8 rounded" />
                ) : (
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: brandColor }}
                  >
                    {businessName?.charAt(0) || "K"}
                  </div>
                )}
                <span className="font-semibold text-foreground text-sm">{businessName || "Your Business"}</span>
              </div>
              <div className="rounded-md p-3 text-xs text-muted-foreground" style={{ backgroundColor: `${brandColor}10`, borderLeft: `3px solid ${brandColor}` }}>
                This is how your client portal header will look with current branding settings.
              </div>
            </div>
          </div>

          <Button onClick={handleSaveBranding} disabled={savingBranding} className="w-full">
            {savingBranding ? "Saving…" : "Save Branding"}
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" /> Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
          <Button variant="destructive" className="w-full justify-start gap-2" onClick={() => setDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4" /> Delete account
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All your data, templates, and submissions will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                toast({ title: "Contact support", description: "Please email support to delete your account." });
                setDeleteConfirm(false);
              }}
            >
              Delete account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
    </div>
  );
}
