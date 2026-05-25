import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';

interface Props {
  onClose: () => void;
}

export default function ProfileModal({ onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);

  const [name, setName] = useState(user?.name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  async function handleSaveProfile() {
    if (!name.trim()) return;
    setSavingProfile(true);
    setProfileMsg('');
    try {
      const res = await api.patch('/auth/profile', { name: name.trim() });
      const updatedUser = res.data.data.user;
      const accessToken = localStorage.getItem('accessToken') ?? '';
      const refreshToken = localStorage.getItem('refreshToken') ?? '';
      setAuth(updatedUser, accessToken, refreshToken);
      setProfileMsg('Profile updated.');
    } catch (err: any) {
      setProfileMsg(err.response?.data?.message ?? 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSavePassword() {
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      setPasswordMsg('Passwords do not match.');
      return;
    }
    setSavingPassword(true);
    setPasswordMsg('');
    try {
      await api.patch('/auth/password', { currentPassword, newPassword });
      setPasswordMsg('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg(err.response?.data?.message ?? 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-base">Profile settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Profile section */}
        <div className="space-y-3 pb-5 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Profile
          </p>
          <div>
            <Label className="text-xs mb-1">Email</Label>
            <Input value={user?.email ?? ''} disabled className="h-8 text-sm opacity-60" />
          </div>
          <div>
            <Label className="text-xs mb-1">Display name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          {profileMsg && (
            <p className={`text-xs ${profileMsg.includes('updated') ? 'text-green-500' : 'text-destructive'}`}>
              {profileMsg}
            </p>
          )}
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={!name.trim() || savingProfile}
              onClick={handleSaveProfile}
            >
              {savingProfile ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
        </div>

        {/* Password section */}
        <div className="space-y-3 pt-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Change password
          </p>
          <div>
            <Label className="text-xs mb-1">Current password</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs mb-1">New password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs mb-1">Confirm new password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          {passwordMsg && (
            <p className={`text-xs ${passwordMsg.includes('updated') ? 'text-green-500' : 'text-destructive'}`}>
              {passwordMsg}
            </p>
          )}
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={!currentPassword || !newPassword || savingPassword}
              onClick={handleSavePassword}
            >
              {savingPassword ? 'Saving…' : 'Change password'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
