import { useForm } from "@tanstack/react-form";
import { useNavigate, createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm({
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      if (value.password !== value.confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const user = await api.register(value.username, value.email, value.password);
        login(user);
        navigate({ to: "/" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Registration failed");
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-100 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full items-center gap-10 lg:grid-cols-2">
          <div className="hidden lg:block">
            <div className="max-w-xl space-y-6">
              <div className="inline-flex rounded-full border border-primary/20 bg-white/70 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur">
                Why should you join us?
              </div>

              <div className="space-y-4">
                <h1 className="text-5xl font-bold tracking-tight text-gray-900">
                  Join a live prediction market platform.
                </h1>
                <p className="text-lg leading-8 text-muted-foreground">
                  Create an account to start placing bets, following market
                  trends, and competing with other users in real time.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur">
                  <p className="text-sm font-semibold text-gray-900">
                    Real-time updates
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    See odds and market changes without refreshing the page.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur">
                  <p className="text-sm font-semibold text-gray-900">
                    Track your bets
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Follow active bets and review your resolved results anytime.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur">
                  <p className="text-sm font-semibold text-gray-900">
                    Compete smarter
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Manage your balance and climb the leaderboard with better picks.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Card className="w-full max-w-md border border-white/60 shadow-2xl backdrop-blur">
              <CardHeader className="space-y-3 text-center">
                <CardTitle className="text-3xl font-bold">
                  Create your account
                </CardTitle>
                <CardDescription className="text-base">
                  Sign up to start betting and exploring live markets.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    form.handleSubmit();
                  }}
                  className="space-y-4"
                >
                  <form.Field
                    name="username"
                    validators={{
                      onChange: ({ value }) => {
                        if (!value || value.length < 3) {
                          return "Username must be at least 3 characters";
                        }
                        return undefined;
                      },
                    }}
                  >
                    {(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          type="text"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          placeholder="your username"
                          disabled={isLoading}
                        />
                        {field.state.meta.errors && (
                          <p className="text-xs text-destructive">
                            {field.state.meta.errors.join(", ")}
                          </p>
                        )}
                      </div>
                    )}
                  </form.Field>

                  <form.Field
                    name="email"
                    validators={{
                      onChange: ({ value }) => {
                        if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                          return "Invalid email address";
                        }
                        return undefined;
                      },
                    }}
                  >
                    {(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          placeholder="you@example.com"
                          disabled={isLoading}
                        />
                        {field.state.meta.errors && (
                          <p className="text-xs text-destructive">
                            {field.state.meta.errors.join(", ")}
                          </p>
                        )}
                      </div>
                    )}
                  </form.Field>

                  <form.Field
                    name="password"
                    validators={{
                      onChange: ({ value }) => {
                        if (!value || value.length < 6) {
                          return "Password must be at least 6 characters";
                        }
                        return undefined;
                      },
                    }}
                  >
                    {(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>

                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="••••••••"
                            disabled={isLoading}
                            className="pr-10"
                          />

                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-black"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>

                        {field.state.meta.errors && (
                          <p className="text-xs text-destructive">
                            {field.state.meta.errors.join(", ")}
                          </p>
                        )}
                      </div>
                    )}
                  </form.Field>

                  <form.Field
                    name="confirmPassword"
                    validators={{
                      onChange: ({ value }) => {
                        const password = form.getFieldValue("password");
                        if (value && password && value !== password) {
                          return "Passwords do not match";
                        }
                        return undefined;
                      },
                    }}
                  >
                    {(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>

                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="••••••••"
                            disabled={isLoading}
                            className="pr-10"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword((prev) => !prev)
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-black"
                            aria-label={
                              showConfirmPassword
                                ? "Hide confirm password"
                                : "Show confirm password"
                            }
                          >
                            {showConfirmPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </div>

                        {field.state.meta.errors && (
                          <p className="text-xs text-destructive">
                            {field.state.meta.errors.join(", ")}
                          </p>
                        )}
                      </div>
                    )}
                  </form.Field>

                  {error && (
                    <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Sign Up"}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    to="/auth/login"
                    className="font-medium text-primary hover:underline"
                  >
                    Login
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/auth/register")({
  component: RegisterPage,
});