export function getRoleBadgeColor(role: string): string {
  switch (role) {
    case "super-admin":
      return "bg-emerald-800/50 text-emerald-100 border-emerald-600/40";
    case "admin":
      return "bg-emerald-700/50 text-emerald-100 border-emerald-500/40";
    default:
      return "bg-emerald-900/30 text-emerald-200 border-emerald-700/40";
  }
}

export function getUserInitials(displayName: string | null, email: string): string {
  if (displayName && displayName.trim()) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return displayName[0].toUpperCase();
  }
  
  const emailPart = email.split("@")[0];
  if (emailPart && emailPart.length > 0) {
    return emailPart.slice(0, 2).toUpperCase();
  }
  return "U";
}

export function getDisplayName(displayName: string | null, email: string): string {
  if (displayName && displayName.trim()) {
    return displayName;
  }
  
  const emailPart = email.split("@")[0];
  if (!emailPart) return "User";
  
  return emailPart
    .split(/[._-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}
