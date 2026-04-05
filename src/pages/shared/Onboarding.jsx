import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Upload, Check } from "lucide-react";

export default function Onboarding() {
  const { user, setUser, setNeedsOnboarding } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [fullName, setFullName] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [selectedRole, setSelectedRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const uploadedFile = await base44.integrations.Core.UploadFile({ file });
      setProfileImage(uploadedFile.file_url);
    } catch (error) {
      toast({ title: "שגיאה", description: "שגיאה בהעלאת תמונה", variant: "destructive" });
    }
  };

  const handleComplete = async () => {
    if (!fullName.trim() || !selectedRole) {
      toast({ title: "שגיאה", description: "מלא שם ובחר תפקיד", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const updateData = {
        full_name: fullName,
        custom_role: selectedRole
      };
      if (profileImage) {
        updateData.profile_image = profileImage;
      }

      await base44.auth.updateMe(updateData);
      setUser({ ...user, ...updateData });
      setNeedsOnboarding(false);

      // Navigate based on role
      if (selectedRole === "doctor") {
        navigate("/dashboard");
      } else {
        navigate("/new-event");
      }

      toast({ title: "בדיוק!", description: "הרשמה הושלמה בהצלחה" });
    } catch (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg p-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">ברוכים הבאים</h1>
          <p className="text-muted-foreground">סיים את הרשמתך כדי להמשיך</p>
        </div>

        {/* Profile Image Upload */}
        <div className="space-y-3">
          <div className="flex justify-center">
            <div className="relative">
              <img
                src={profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
                alt="Profile"
                className="w-20 h-20 rounded-full border-2 border-border"
              />
              <Label className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer shadow-lg hover:bg-primary/90 transition">
                <Upload className="w-4 h-4" />
                <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
              </Label>
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground">(אופציונלי)</p>
        </div>

        {/* Full Name Input */}
        <div className="space-y-2">
          <Label htmlFor="fullName" className="font-semibold">שם מלא *</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="שם פרטי ושם משפחה"
            className="h-12 text-base"
          />
        </div>

        {/* Role Selection */}
        <div className="space-y-2">
          <Label className="font-semibold">בחר תפקיד *</Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "paramedic", label: "פראמדיק" },
              { value: "doctor", label: "רופא" }
            ].map((role) => (
              <button
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                className={`relative h-20 rounded-xl font-bold text-lg transition-all ${
                  selectedRole === role.value
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-secondary text-secondary-foreground border-2 border-border hover:border-primary"
                }`}
              >
                {role.label}
                {selectedRole === role.value && (
                  <Check className="absolute top-2 left-2 w-5 h-5" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Complete Button */}
        <Button
          onClick={handleComplete}
          disabled={isLoading || !fullName.trim() || !selectedRole}
          className="w-full h-12 text-base font-bold"
        >
          {isLoading ? "משלים..." : "סיום הרשמה"}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          התפקיד שתבחר לא ניתן לשינוי על ידך אחר כך
        </p>
      </div>
    </div>
  );
}