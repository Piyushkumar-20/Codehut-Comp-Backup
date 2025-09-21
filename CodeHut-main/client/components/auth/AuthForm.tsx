import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";

export type AuthMode = "login" | "signup";

interface AuthFormProps {
  initialMode?: AuthMode;
  className?: string;
}

const emailSchema = z.string().email("Enter a valid email address");
const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .refine((val) => /[A-Z]/.test(val), {
    message: "One uppercase letter",
  })
  .refine((val) => /[a-z]/.test(val), {
    message: "One lowercase letter",
  })
  .refine((val) => /\d/.test(val), {
    message: "One number",
  })
  .refine((val) => /[!@#$%^&*(),.?":{}|<>]/.test(val), {
    message: "One special character",
  });

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

const signupSchema = z
  .object({
    username: z
      .string()
      .min(3, "Min 3 characters")
      .max(20, "Max 20 characters")
      .regex(/^[a-zA-Z0-9_-]+$/, "Letters, numbers, _ and - only"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
    bio: z.string().max(500).optional().or(z.literal("")),
    acceptTerms: z.boolean().refine((v) => v === true, {
      message: "You must accept the terms",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

export default function AuthForm({ initialMode = "login", className }: AuthFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [submitting, setSubmitting] = useState(false);

  // allow query param to set mode: ?mode=signup
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const m = params.get("mode");
    if (m === "login" || m === "signup") setMode(m);
  }, [location.search]);

  const form = useForm<LoginFormValues | SignupFormValues>({
    resolver: zodResolver(mode === "login" ? loginSchema : signupSchema),
    defaultValues:
      (mode === "login"
        ? { email: "", password: "", rememberMe: false }
        : {
            username: "",
            email: "",
            password: "",
            confirmPassword: "",
            bio: "",
            acceptTerms: false,
          }) as any,
    mode: "onChange",
  });

  useEffect(() => {
    // reset resolver when mode changes
    form.reset(undefined, { keepDefaultValues: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const onSubmit = async (values: LoginFormValues | SignupFormValues) => {
    try {
      setSubmitting(true);
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const payload: any = mode === "login" ? values : { ...values };
      if (mode === "signup") {
        delete payload.confirmPassword;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        if (!res.ok) throw new Error(`Unexpected server response (${res.status})`);
      }

      if (!res.ok) {
        throw new Error(data?.message || (mode === "login" ? "Invalid email or password" : "Signup failed"));
      }

      login(data.user, data.accessToken);

      const redirect = new URLSearchParams(location.search).get("redirect");
      navigate(redirect || "/dashboard", { replace: true });
    } catch (err: any) {
      toast({ title: mode === "login" ? "Login failed" : "Signup failed", description: err?.message || "Please try again", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuth = (provider: "google" | "facebook") => {
    // Backend endpoints are not implemented in this project yet
    toast({
      title: "Social login unavailable",
      description: `"${provider}" login is not configured. Please use email/password.`,
      variant: "destructive",
    });
  };

  const Title = useMemo(() => (mode === "login" ? "Welcome Back" : "Create your account"), [mode]);
  const Subtitle = useMemo(
    () => (mode === "login" ? "Sign in to your account to continue" : "It takes less than a minute"),
    [mode],
  );

  return (
    <div className={className}>
      <div className="rounded-2xl bg-background/90 shadow-xl border border-border backdrop-blur p-6 sm:p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">{Title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{Subtitle}</p>
        </div>

        <Form {...(form as any)}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
            {mode === "signup" && (
              <FormField
                control={form.control as any}
                name="username" as={undefined as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe" {...field} />
                    </FormControl>
                    <FormDescription>3–20 characters. Letters, numbers, _ and - only.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control as any}
              name="email" as={undefined as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="password" as={undefined as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={mode === "login" ? "Enter your password" : "Create a strong password"} autoComplete={mode === "login" ? "current-password" : "new-password"} {...field} />
                  </FormControl>
                  {mode === "signup" && (
                    <FormDescription>
                      Must include 8+ chars with upper, lower, number, and special character.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode === "signup" && (
              <>
                <FormField
                  control={form.control as any}
                  name="confirmPassword" as={undefined as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Re-enter your password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="bio" as={undefined as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Tell us about yourself..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="acceptTerms" as={undefined as any}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <input id="terms" type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                        <Label htmlFor="terms" className="text-sm">I agree to the Terms of Service and Privacy Policy</Label>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {mode === "login" && (
              <FormField
                control={form.control as any}
                name="rememberMe" as={undefined as any}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <input id="remember" type="checkbox" checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                      <Label htmlFor="remember" className="text-sm">Remember me</Label>
                    </div>
                  </FormItem>
                )}
              />
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (mode === "login" ? "Signing in..." : "Creating account...") : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
        </Form>

        <div className="my-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs text-muted-foreground">
              <span className="bg-background px-2">OR CONTINUE WITH</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button variant="outline" className="w-full justify-center" type="button" onClick={() => handleOAuth("google")}> 
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="ml-2">Google</span>
          </Button>

          <Button variant="outline" className="w-full justify-center" type="button" onClick={() => handleOAuth("facebook")}>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span className="ml-2">Facebook</span>
          </Button>
        </div>

        <div className="mt-6 text-center text-sm">
          {mode === "login" ? (
            <button className="text-muted-foreground hover:underline" type="button" onClick={() => setMode("signup")}>Don't have an account? Sign up</button>
          ) : (
            <button className="text-muted-foreground hover:underline" type="button" onClick={() => setMode("login")}>Already have an account? Sign in</button>
          )}
        </div>
      </div>
    </div>
  );
}
