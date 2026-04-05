import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCached, setCached } from "@/lib/localCache";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { Trash2, Plus, Send, CheckCircle, XCircle } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";

export default function Users() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [showRecipientForm, setShowRecipientForm] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientRole, setRecipientRole] = useState("doctor");
  const [testEmailStatus, setTestEmailStatus] = useState({});

  // Only admins can view this page
  if (user?.role !== "admin") {
    return (
      <div className="px-4 py-8 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-6 text-center text-destructive">
            <p>אין לך הרשאה לגשת לעמוד זה</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const cached = getCached("all-users");
      if (cached) return cached;
      const data = await base44.entities.User.list();
      setCached("all-users", data);
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const cached = getCached("sites");
      if (cached) return cached;
      const data = await base44.entities.Site.list();
      setCached("sites", data);
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: recipients = [] } = useQuery({
    queryKey: ["email-recipients"],
    queryFn: () => base44.entities.EmailRecipient.list(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }) => base44.entities.User.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      setEditingCell(null);
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (email) => {
      await base44.users.inviteUser(email, "paramedic");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      setNewUserEmail("");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => base44.entities.User.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
  });

  const addRecipientMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.EmailRecipient.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-recipients"] });
      setRecipientEmail("");
      setRecipientRole("doctor");
      setShowRecipientForm(false);
    },
  });

  const deleteRecipientMutation = useMutation({
    mutationFn: (recipientId) => base44.entities.EmailRecipient.delete(recipientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-recipients"] });
    },
  });

  const handleAddRecipient = () => {
    if (!recipientEmail.trim()) {
      return;
    }
    addRecipientMutation.mutate({ email: recipientEmail, role: recipientRole });
  };

  const handleEditCell = (userId, field, value) => {
    setEditingCell({ userId, field });
    setEditValue(value || "");
  };

  const handleSaveEdit = (userId) => {
    if (!editValue.trim()) {
      return;
    }
    updateUserMutation.mutate({
      userId,
      data: { [editingCell.field]: editValue },
    });
  };

  const handleInviteUser = () => {
    if (!newUserEmail.trim()) {
      return;
    }
    inviteUserMutation.mutate(newUserEmail);
  };

  const handleSendTestEmail = async (userEmail) => {
    setTestEmailStatus(prev => ({ ...prev, [userEmail]: "sending" }));
    try {
      await base44.integrations.Core.SendEmail({
        to: userEmail,
        subject: "בדיקת מייל - fortrAID",
        body: "<div dir='rtl' style='font-family:Arial,sans-serif;font-size:14px;'><p>מייל בדיקה ממערכת fortrAID. המערכת עובדת.</p></div>"
      });
      setTestEmailStatus(prev => ({ ...prev, [userEmail]: "success" }));
      setTimeout(() => {
        setTestEmailStatus(prev => ({ ...prev, [userEmail]: null }));
      }, 2000);
    } catch (error) {
      setTestEmailStatus(prev => ({ ...prev, [userEmail]: "failed" }));
      setTimeout(() => {
        setTestEmailStatus(prev => ({ ...prev, [userEmail]: null }));
      }, 2000);
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="ניהול משתמשים" />
        <div className="px-4 -mt-3 max-w-4xl mx-auto">
          <Card><CardContent className="p-4"><Skeleton className="h-64" /></CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="ניהול משתמשים" />
      <div className="px-4 -mt-3 max-w-4xl mx-auto space-y-4 pb-8">
        {/* Add User / Recipient Section */}
        <Card>
          <CardContent className="p-4 space-y-3">
            {!showRecipientForm ? (
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowRecipientForm(false)}
                  variant="default"
                  className="flex-1"
                >
                  משתמש חדש
                </Button>
                <Button
                  onClick={() => setShowRecipientForm(true)}
                  variant="outline"
                  className="flex-1"
                >
                  <Plus className="w-4 h-4" />
                  נמען אימייל
                </Button>
              </div>
            ) : null}

            {!showRecipientForm ? (
              <>
                <h3 className="font-bold text-sm">הוסף משתמש</h3>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="כתובת email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleInviteUser();
                    }}
                  />
                  <Button
                    onClick={handleInviteUser}
                    disabled={inviteUserMutation.isPending}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {inviteUserMutation.isPending ? "שולח..." : "הוסף"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-bold text-sm">הוסף נמען אימייל</h3>
                <Input
                  type="email"
                  placeholder="כתובת email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
                <Select value={recipientRole} onValueChange={setRecipientRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doctor">רופא</SelectItem>
                    <SelectItem value="paramedic">פראמדיק</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddRecipient}
                    disabled={addRecipientMutation.isPending}
                    className="flex-1"
                  >
                    {addRecipientMutation.isPending ? "מוסיף..." : "הוסף"}
                  </Button>
                  <Button
                    onClick={() => setShowRecipientForm(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    ביטול
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Users Table */}
        {users.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>אין משתמשים</p>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary border-b">
                <tr>
                  <th className="px-4 py-2 text-right font-semibold">שם</th>
                  <th className="px-4 py-2 text-right font-semibold">Email</th>
                  <th className="px-4 py-2 text-right font-semibold">Role</th>
                  <th className="px-4 py-2 text-right font-semibold">אתר</th>
                  <th className="px-4 py-2 text-center font-semibold">שמור</th>
                  <th className="px-4 py-2 text-center font-semibold">בדיקה</th>
                  <th className="px-4 py-2 text-center font-semibold">מחק</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-accent/50">
                    <td className="px-4 py-2 font-medium">
                      <div className="flex items-center gap-2">
                        {u.full_name}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {editingCell?.userId === u.id && editingCell?.field === "email" ? (
                        <Input
                          type="email"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleSaveEdit(u.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit(u.id);
                          }}
                          autoFocus
                          className="h-8"
                        />
                      ) : (
                        <span
                          onClick={() => handleEditCell(u.id, "email", u.email)}
                          className="cursor-pointer hover:bg-primary/10 px-2 py-1 rounded block"
                        >
                          {u.email}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingCell?.userId === u.id && editingCell?.field === "custom_role" ? (
                        <Select
                          value={editValue}
                          onValueChange={(value) => {
                            setEditValue(value);
                            handleSaveEdit(u.id);
                          }}
                          open
                        >
                          <SelectTrigger className="h-8 w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paramedic">paramedic</SelectItem>
                            <SelectItem value="doctor">doctor</SelectItem>
                            <SelectItem value="admin">admin</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span
                          onClick={() => handleEditCell(u.id, "custom_role", u.custom_role)}
                          className="cursor-pointer hover:bg-primary/10 px-2 py-1 rounded block text-xs bg-muted rounded"
                        >
                          {u.custom_role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {editingCell?.userId === u.id && editingCell?.field === "current_site" ? (
                        <Select
                          value={editValue}
                          onValueChange={(value) => {
                            setEditValue(value);
                            handleSaveEdit(u.id);
                          }}
                        >
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {sites.map((site) => (
                              <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span
                          onClick={() => handleEditCell(u.id, "current_site", u.current_site)}
                          className="cursor-pointer hover:bg-primary/10 px-2 py-1 rounded block"
                        >
                          {sites.find((s) => s.id === u.current_site)?.name || "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-8 text-xs"
                        onClick={() => handleSaveEdit(u.id)}
                        disabled={!editingCell || editingCell.userId !== u.id}
                      >
                        שמור
                      </Button>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {testEmailStatus[u.email] === "sending" ? (
                          <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" disabled>
                            <Send className="w-4 h-4 animate-pulse" />
                          </Button>
                        ) : testEmailStatus[u.email] === "success" ? (
                          <div className="text-green-600 text-xs font-medium">נשלח ✓</div>
                        ) : testEmailStatus[u.email] === "failed" ? (
                          <div className="text-red-600 text-xs font-medium">נכשל ✗</div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1"
                            onClick={() => handleSendTestEmail(u.email)}
                            title="שלח מייל בדיקה"
                          >
                            <Send className="w-3.5 h-3.5" />
                            בדיקה
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={u.id === user.id || deleteUserMutation.isPending}
                        title={u.id === user.id ? "לא ניתן למחוק את עצמך" : ""}
                        onClick={() => {
                          if (confirm(`מחק משתמש ${u.full_name}?`)) {
                            deleteUserMutation.mutate(u.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Email Recipients Section */}
        {recipients.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-bold text-sm">נמענות אימייל בלבד</h3>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary border-b">
                    <tr>
                      <th className="px-4 py-2 text-right font-semibold">Email</th>
                      <th className="px-4 py-2 text-right font-semibold">תפקיד</th>
                      <th className="px-4 py-2 text-right font-semibold">סטטוס</th>
                      <th className="px-4 py-2 text-center font-semibold">מחק</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.map((r) => (
                      <tr key={r.id} className="border-b hover:bg-accent/50">
                        <td className="px-4 py-2">{r.email}</td>
                        <td className="px-4 py-2 text-xs">
                          <span className="bg-muted px-2 py-1 rounded text-xs">
                            {r.role === "doctor" ? "רופא" : "פראמדיק"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs">
                          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">
                            נמען בלבד
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            disabled={deleteRecipientMutation.isPending}
                            onClick={() => {
                              if (confirm(`מחק נמען ${r.email}?`)) {
                                deleteRecipientMutation.mutate(r.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}