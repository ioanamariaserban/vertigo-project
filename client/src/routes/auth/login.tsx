import { useForm } from "@tanstack/react-form";
import { useNavigate, createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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
import { Eye, EyeOff } from "lucide-react";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      try {
        setIsLoading(true);
        setError(null);

        const user = await api.login(value.email, value.password);
        login(user);
        navigate({ to: "/" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed");
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
                Real-time odds • Live market updates • Competitive leaderboard
              </div>

              <div className="space-y-4">
                <h1 className="text-5xl font-bold tracking-tight text-gray-900">
                  Predict real-world outcomes.
                </h1>
                <p className="text-lg leading-8 text-muted-foreground">
                  Create markets, place bets, follow live odds, and compete on
                  the leaderboard in a real-time prediction market experience.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur">
                  <p className="text-sm font-semibold text-gray-900">Live Odds</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Track market changes in real time.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur">
                  <p className="text-sm font-semibold text-gray-900">Admin Tools</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Resolve or archive markets with payout handling.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur">
                  <p className="text-sm font-semibold text-gray-900">Leaderboard</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Compare winnings and compete with other users.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Card className="w-full max-w-md border border-white/60 shadow-2xl backdrop-blur">
              <CardHeader className="space-y-3 text-center">
                <CardTitle className="text-3xl font-bold">
                  Prediction Markets
                </CardTitle>
                <CardDescription className="text-base">
                  Sign in to place bets, track markets, and view live odds.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    form.handleSubmit();
                  }}
                  className="space-y-6"
                >
                  <form.Field name="email">
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

                  <form.Field name="password">
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
                            aria-label={
                              showPassword ? "Hide password" : "Show password"
                            }
                          >
                            {showPassword ? (
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
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link
                    to="/auth/register"
                    className="font-medium text-primary hover:underline"
                  >
                    Sign up
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

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});