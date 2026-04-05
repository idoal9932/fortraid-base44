import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getCached, setCached } from "@/lib/localCache";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

import { Save, MapPin, User, LogOut, Pencil, X } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { getSettingsPath } from "@/lib/settingsNavigation";

export default function Settings() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  // Redirect admin user to /admin/settings
  React.useEffect(() => {
    if (user?.email === "idoal9932@gmail.com") {
      navigate("/admin/settings", { replace: true });
    }
  }, [user, navigate]);
  const [selectedSite, setSelectedSite] = useState(user?.current_site || "");
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [firstName, setFirstName] = useState(user?.full_name?.split(" ")[0] || "");
  const [lastName, setLastName] = useState(user?.full_name?.split(" ").slice(1).join(" ") || "");
  const [profileImage, setProfileImage] = useState(user?.profile_image || "");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const cached = getCached("sites");
      if (cached) return cached;
      const data = await base44.entities.Site.filter({ active: true });
      setCached("sites", data);
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (user?.current_site) setSelectedSite(user.current_site);
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    const site = sites.find((s) => s.id === selectedSite);
    await base44.auth.updateMe({
      current_site: selectedSite,
      current_site_name: site?.name || ""
    });
    setUser({ ...user, current_site: selectedSite, current_site_name: site?.name || "" });
    setSaving(false);
  };

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploadedFile = await base44.integrations.Core.UploadFile({ file });
    setProfileImage(uploadedFile.file_url);
  };

  const handleSaveProfile = async () => {
    setUpdatingProfile(true);
    const fullName = `${firstName} ${lastName}`.trim();
    const updateData = { full_name: fullName };
    if (profileImage) {
      updateData.profile_image = profileImage;
    }
    await base44.auth.updateMe(updateData);
    setUser({ ...user, full_name: fullName, profile_image: profileImage });
    setEditingProfile(false);
    setUpdatingProfile(false);
  };

  const roleLabels = { paramedic: "פראמדיק", doctor: "רופא", admin: "מנהל" };

  return (
    <div>
      <PageHeader title="הגדרות" />
      <div className="px-4 -mt-3 max-w-2xl mx-auto space-y-4 pb-8">
        <Card>
          <CardContent className="p-4 space-y-4">
            {!editingProfile ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} alt="Profile" className="w-12 h-12 rounded-full bg-primary/10" />
                  <div>
                    <p className="font-bold">{user?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    <p className="text-xs text-primary font-medium">{roleLabels[user?.custom_role] || user?.custom_role}</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setEditingProfile(true)}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-end gap-3">
                  <img src={profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} alt="Profile" className="w-12 h-12 rounded-full" />
                  <Label className="flex-1 cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>שנה תמונה</span>
                    </Button>
                    <input type="file" accept="image/*" onChange={handleProfileImageUpload} hidden />
                  </Label>
                </div>
                <div>
                  <Label>שם פרטי</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="שם פרטי" />
                </div>
                <div>
                  <Label>שם משפחה</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="שם משפחה" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} disabled={updatingProfile} className="flex-1 gap-2">
                    <Save className="w-4 h-4" />
                    {updatingProfile ? "שומר..." : "שמור"}
                  </Button>
                  <Button onClick={() => setEditingProfile(false)} variant="outline" className="flex-1 gap-2">
                    <X className="w-4 h-4" />
                    ביטול
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {user?.custom_role !== "doctor" &&
        <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">אתר נוכחי</h3>
              </div>
              <div>
                <Label>בחר אתר</Label>
                <Select value={selectedSite} onValueChange={setSelectedSite}>
                  <SelectTrigger className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"><SelectValue placeholder="בחר אתר..." /></SelectTrigger>
                  <SelectContent>
                    {sites.map((site) =>
                  <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                  )}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                <Save className="w-4 h-4" />
                {saving ? "שומר..." : "שמור"}
              </Button>
            </CardContent>
          </Card>
        }

        <Button variant="outline" className="w-full gap-2 text-destructive" onClick={async () => {await base44.auth.logout();base44.auth.redirectToLogin();}}>
          <LogOut className="w-4 h-4" />
          התנתק
        </Button>
      </div>
    </div>);

}