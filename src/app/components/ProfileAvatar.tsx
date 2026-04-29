import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./Avatar";

type ProfileAvatarProps = {
  name?: string | null;
  photoUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
  imageClassName?: string;
};

function getInitials(name?: string | null) {
  const value = String(name || "").trim();

  if (!value) return "U";

  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

export function ProfileAvatar({
  name,
  photoUrl,
  className = "size-10",
  fallbackClassName = "bg-gradient-to-br from-[#6C47FF] to-[#9E8BFF] text-white font-black",
  imageClassName = "object-cover",
}: ProfileAvatarProps) {
  const [imageError, setImageError] = React.useState(false);
  const cleanPhotoUrl = String(photoUrl || "").trim();
  const shouldShowImage = cleanPhotoUrl && !imageError;

  React.useEffect(() => {
    setImageError(false);
  }, [cleanPhotoUrl]);

  return (
    <Avatar className={className}>
      {shouldShowImage && (
        <AvatarImage
          src={cleanPhotoUrl}
          alt={name ? `Foto profil ${name}` : "Foto profil"}
          className={imageClassName}
          onError={() => setImageError(true)}
        />
      )}

      <AvatarFallback className={fallbackClassName}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}