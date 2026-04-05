import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";

import { Eye, Users, LogOut, RotateCcw, Pencil, X, Save, FileText } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { getSettingsPath } from "@/lib/settingsNavigation";

export default function AdminSettings() {
  const { user, setUser, viewAsRole, setViewAsRole } = useAuth();
  const navigate = useNavigate();
  const [editingProfile, setEditingProfile] = useState(false);
  const [firstName, setFirstName] = useState(user?.full_name?.split(" ")[0] || "");
  const [lastName, setLastName] = useState(user?.full_name?.split(" ").slice(1).join(" ") || "");
  const [profileImage, setProfileImage] = useState(user?.profile_image || "");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const roleLabels = { paramedic: "פראמדיק", doctor: "רופא", admin: "מנהל" };

  const handleViewAs = (role) => {
    setViewAsRole(role);
    if (role === "paramedic") {
      navigate("/new-event");
    } else if (role === "doctor") {
      navigate("/dashboard");
    }

  };

  const handleBackToAdmin = () => {
    setViewAsRole(null);
    navigate("/inventory-admin");

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

  return (
    <div>
      <PageHeader title="הגדרות מנהל" />
      <div className="px-4 -mt-3 max-w-2xl mx-auto space-y-4 pb-8">
        <Card>
          <CardContent className="p-4 space-y-4">
            {!editingProfile ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} alt="Profile" className="w-12 h-12 rounded-full" />
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

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">צפייה כתפקיד</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={viewAsRole === "paramedic" ? "default" : "outline"}
                className="gap-2"
                onClick={() => handleViewAs("paramedic")}
              >
                צפה כפראמדיק
              </Button>
              <Button
                variant={viewAsRole === "doctor" ? "default" : "outline"}
                className="gap-2"
                onClick={() => handleViewAs("doctor")}
              >
                צפה כרופא
              </Button>
            </div>
            {viewAsRole && (
              <Button
                variant="secondary"
                className="w-full gap-2"
                onClick={handleBackToAdmin}
              >
                <RotateCcw className="w-4 h-4" />
                חזור למנהל
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-2">
            <Link to="/admin/users" className="flex items-center gap-2 text-primary hover:underline font-semibold">
              <Users className="w-4 h-4" />
              ניהול משתמשים
            </Link>
            <Link to="/admin/patients" className="flex items-center gap-2 text-primary hover:underline font-semibold">
              <FileText className="w-4 h-4" />
              רשימת מטופלים
            </Link>
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full gap-2 text-destructive" onClick={async () => {await base44.auth.logout();base44.auth.redirectToLogin();}}>
          <LogOut className="w-4 h-4" />
          התנתק
        </Button>
      </div>
    </div>
  );
}