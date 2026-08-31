import { useState, useRef, useEffect } from "react";
import { useWorkspaceStore } from "@/store/workspace.store";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Upload, Copy, Check, Hash, Image as ImageIcon } from "lucide-react";
import { API_URL } from "@/lib/api";
import { Textarea } from "../ui/textarea";

interface CreateChannelWizardProps {
  onClose: () => void;
}

export default function CreateChannelWizard({
  onClose,
}: CreateChannelWizardProps) {
  const { workspaces, setWorkspaces, setActiveWorkspace } = useWorkspaceStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 State
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState("");
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());

  // Fetch users when step 2 is active
  useEffect(() => {
    if (step === 2) {
      api.get('/users').then((res) => {
        setUsers(res.data.data.users);
      }).catch(console.error);
    }
  }, [step]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      setError("");

      let logoUrl = "";
      if (logoFile) {
        const formData = new FormData();
        formData.append("file", logoFile);
        const uploadRes = await fetch(`${API_URL}/api/upload/image`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          body: formData,
        });

        if (!uploadRes.ok) throw new Error("Failed to upload logo");
        const uploadData = await uploadRes.json();
        logoUrl = uploadData.data.url;
      }

      const res = await api.post("/workspaces", {
        name,
        description,
        ...(logoUrl && { logoUrl }),
      });

      const newWorkspace = res.data.data.workspace;
      setCreatedWorkspaceId(newWorkspace.id);
      setWorkspaces([...workspaces, newWorkspace]);
      setActiveWorkspace(newWorkspace);

      // Generate generic invite link
      const inviteRes = await api.post(
        `/workspaces/${newWorkspace.id}/invite-link`,
      );
      setInviteLink(inviteRes.data.data.link);

      setStep(2);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to create channel",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDirectInvite = async (email: string, id: string) => {
    try {
      await api.post(`/workspaces/${createdWorkspaceId}/invite`, { email });
      setInvitedUsers((prev) => new Set(prev).add(id));
    } catch (err) {
      console.error('Failed to invite user', err);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-popover text-popover-foreground w-full max-w-xl rounded-xl shadow-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold">
              {step === 1 ? "Create a Channel" : "Channel Created!"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {step === 1
                ? "Set up a new space for your team to collaborate."
                : "Invite people to join your new channel."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-2 bg-accent/50 hover:bg-accent rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg mb-6 border border-destructive/20 font-medium">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleCreate} className="space-y-6">
              {/* Logo Upload */}
              <div className="flex flex-col items-center justify-center">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleLogoChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group w-24 h-24 rounded-2xl border-2 border-dashed border-border hover:border-whatsapp-teal transition-colors flex items-center justify-center bg-accent/30 overflow-hidden"
                >
                  {logoPreview ? (
                    <>
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Upload size={24} className="text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground group-hover:text-whatsapp-teal transition-colors">
                      <ImageIcon size={28} className="mb-2" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Upload Logo
                      </span>
                    </div>
                  )}
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                    Channel Name
                  </Label>
                  <div className="relative">
                    <Hash
                      size={16}
                      className="absolute left-3 top-3 text-muted-foreground"
                    />
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Marketing Team"
                      className="pl-10 h-11"
                      required
                      minLength={2}
                      maxLength={50}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                    Description <span className="opacity-50">(Optional)</span>
                  </Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this channel about?"
                    className="resize-none h-20"
                    maxLength={200}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="bg-whatsapp-teal hover:bg-whatsapp-teal/90 text-white min-w-[120px]"
                >
                  {loading ? "Creating..." : "Create Channel"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-8 py-4">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-whatsapp-teal/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-whatsapp-teal/20">
                  <Check size={32} className="text-whatsapp-teal" />
                </div>
                <h3 className="text-lg font-bold">
                  Anyone with the link can join
                </h3>
                <p className="text-sm text-muted-foreground">
                  This invitation link will automatically expire in 1 hour.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="font-mono text-xs bg-accent/30 h-11"
                />
                <Button
                  onClick={handleCopy}
                  variant={copied ? "default" : "secondary"}
                  className={`h-11 px-4 min-w-[100px] transition-all ${copied ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
                >
                  {copied ? (
                    <>
                      <Check size={16} className="mr-2" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={16} className="mr-2" /> Copy
                    </>
                  )}
                </Button>
              </div>

              {users.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Invite from your contacts</h4>
                  <div className="max-h-[160px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                    {users.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors border border-transparent hover:border-border">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-whatsapp-teal/20 text-whatsapp-teal flex items-center justify-center font-bold text-xs uppercase">
                            {u.name.substring(0, 2)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">{u.name}</span>
                            <span className="text-[10px] text-muted-foreground">{u.email}</span>
                          </div>
                        </div>
                        <Button 
                          size="sm"
                          variant={invitedUsers.has(u.id) ? "secondary" : "outline"}
                          onClick={() => handleDirectInvite(u.email, u.id)}
                          disabled={invitedUsers.has(u.id)}
                          className={`h-8 text-xs ${invitedUsers.has(u.id) ? 'bg-accent text-muted-foreground' : 'hover:bg-whatsapp-teal hover:text-white hover:border-whatsapp-teal'}`}
                        >
                          {invitedUsers.has(u.id) ? 'Invited' : 'Invite'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button
                  onClick={onClose}
                  className="w-full h-11 bg-whatsapp-teal hover:bg-whatsapp-teal/90 text-white text-base font-bold shadow-md"
                >
                  Go to Channel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
