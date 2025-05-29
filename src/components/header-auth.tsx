'use client'
import { signOutAction } from "@/app/actions";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { LogIn, LogOut, UserPlus, Settings as SettingsIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "./ui/separator";
import BoringAvatar from "boring-avatars";

export default function AuthButton() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();
      
      if (data?.user) {
        setUser(data.user );
      }
      
      setLoading(false);
    };

    fetchUser();
  }, []);

  if (!hasEnvVars) {
    return (
      <>
        <div className="flex gap-4 items-center">
          <div>
            <Badge
              variant={"default"}
              className="font-normal pointer-events-none"
            >
              Please update .env.local file with anon key and url
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              asChild
              size="sm"
              variant={"outline"}
              disabled
              className="opacity-75 cursor-none pointer-events-none"
            >
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant={"default"}
              disabled
              className="opacity-75 cursor-none pointer-events-none"
            >
              <Link href="/sign-up">Sign up</Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return user ? (
    <Popover>
      <PopoverTrigger asChild>
        <div className="cursor-pointer">
          <BoringAvatar
            size={36}
            name={user.email}
            colors={["#5b1d99","#0074b4","#00b34c","#ffd41f","#fc6e3d"]} variant="beam"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-56 mr-4" align="end">
        <div className="flex flex-col space-y-2">
          <div className="p-2">
            <p className="text-sm font-medium leading-none">{user.user_metadata?.full_name || user.email}</p>
            {/* <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p> */}
          </div>
          <Separator />
          <Button variant="ghost" className="w-full justify-start font-normal" asChild>
             <Link href="/">
                <SettingsIcon className="mr-2 h-4 w-4" />
                Settings
             </Link>
          </Button>
          <Separator />
          <form action={signOutAction} className="w-full">
            <Button type="submit" variant="ghost" className="w-full justify-start font-normal">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </form>
        </div>
      </PopoverContent>
    </Popover>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"ghost"}>
        <Link href="/sign-in">
          <LogIn className="h-4 w-4" /> Sign in
        </Link>
      </Button>
      <Button asChild size="sm" variant={"ghost"}>
        <Link href="/sign-up">
          <UserPlus className="h-4 w-4" /> Sign up
        </Link>
      </Button>
    </div>
  );
}