"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export function PasswordInput(props: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        {...props}
        className="pr-10"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-1 top-1/2 -translate-y-1/2"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
}
