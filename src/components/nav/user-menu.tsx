"use client";

import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-9 w-9 cursor-pointer">
          <AvatarImage asChild>
            <Image src="/avatar-placeholder.png" alt="User" width={36} height={36} />
          </AvatarImage>
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Signed in</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>Profile (soon)</DropdownMenuItem>
        <DropdownMenuItem disabled>Settings (soon)</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>Sign out (auth later)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
