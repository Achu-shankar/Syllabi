import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;
  return (
    <Card className="overflow-hidden w-full max-w-4xl mx-auto">
      <CardContent className="grid p-0 md:grid-cols-2">
        <form className="p-6 md:p-8 space-y-6">
          <div className="flex flex-col items-center text-center space-y-1">
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-balance text-muted-foreground">
              Login to Syllabi.io
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" required />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="ml-auto text-sm underline underline-offset-2 hover:text-primary"
                >
                  Forgot your password?
                </Link>
              </div>
              <Input id="password" name="password" type="password" required />
            </div>
            <SubmitButton pendingText="Signing In..." formAction={signInAction} className="w-full">
              Login
            </SubmitButton>
          </div>

          <FormMessage message={searchParams} />

          <div className="text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="underline underline-offset-4 hover:text-primary">
              Sign up
            </Link>
          </div>
        </form>

        <div className="relative hidden bg-muted md:block">
           <Image 
             src="/signin-5.png" 
             alt="Sign In Image" 
             fill
             className="object-cover"
             priority
           />
        </div>
      </CardContent>
    </Card>
  );
}
