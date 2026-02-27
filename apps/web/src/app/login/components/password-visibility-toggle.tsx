import { IconEye, IconEyeClosed } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

interface PasswordVisibilityToggleProps {
  isVisible: boolean;
  onToggle: () => void;
}

export function PasswordVisibilityToggle({ isVisible, onToggle }: PasswordVisibilityToggleProps) {
  return (
    <Button
      type="button"
      variant="link"
      onClick={onToggle}
      className="absolute right-0 top-1/2 -translate-y-1/2 cursor-pointer"
    >
      {isVisible ? (
        <IconEye className="h-5 w-5 text-muted-foreground" />
      ) : (
        <IconEyeClosed className="h-5 w-5 text-muted-foreground" />
      )}
    </Button>
  );
}
