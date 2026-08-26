import type { User } from "../types";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface UserAvatarProps {
  user: Pick<User, "name" | "profilePhotoUrl">;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-20 w-20 text-lg",
};

export function UserAvatar({ user, size = "md", className = "" }: UserAvatarProps) {
  const classes = `${sizeClasses[size]} ${className}`.trim();

  if (user.profilePhotoUrl) {
    return (
      <img
        src={user.profilePhotoUrl}
        alt={`${user.name}'s profile photo`}
        className={`rounded-full object-cover ${classes}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700 ${classes}`}
    >
      {initials(user.name)}
    </span>
  );
}
