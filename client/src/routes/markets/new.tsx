import { useForm } from "@tanstack/react-form";
import { useNavigate, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

function CreateMarketPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isAuthenticated) {
    navigate({ to: "/auth/login" });
    return null;
  }

  const secondaryButtonClass =
    "rounded-xl border-2 !border-gray-800 !bg-indigo-100/90 !text-indigo-900 !shadow-lg hover:!bg-indigo-200/80 hover:!border-indigo-400";

  const primaryButtonClass =
    "rounded-xl bg-black text-white shadow-md hover:bg-black/90";

  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
      outcomes: ["", ""],
    },
    onSubmit: async (formData) => {
      const values = formData.value;

      if (!values.title.trim()) {
        setError("Market title is required");
        return;
      }

      const validOutcomes = values.outcomes.filter((o) => o.trim());
      if (validOutcomes.length < 2) {
        setError("At least 2 outcomes are required");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const market = await api.createMarket(
          values.title,
          values.description,
          validOutcomes
        );
        navigate({ to: `/markets/${market.id}` });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create market");
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-blue-50 to-pink-100 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Card className="border-white/60 bg-white/65 shadow-xl backdrop-blur">
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <div>
                  <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                    Create a Market
                  </h1>
                  <p className="mt-2 text-lg text-gray-600">
                    Set up a new prediction market, add context, and define the
                    possible outcomes users can bet on.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm text-gray-700 shadow-sm">
                    Minimum 2 outcomes required
                  </div>
                  <div className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-700 shadow-sm">
                    Live market updates supported
                  </div>
                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 shadow-sm">
                    Ready for betting after creation
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Button
                  variant="outline"
                  className={secondaryButtonClass}
                  onClick={() => navigate({ to: "/" })}
                >
                  Back to Markets
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/60 bg-white/65 shadow-lg backdrop-blur">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Market Details</CardTitle>
            <CardDescription>
              Fill in the market information and define the outcomes clearly so
              users can understand what they are betting on.
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
              <form.Field name="title">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="title">Market Title</Label>
                    <Input
                      id="title"
                      type="text"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="e.g., Will Bitcoin reach $100k by end of 2024?"
                      disabled={isLoading}
                      className="rounded-xl"
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="description">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Provide more context about this market..."
                      disabled={isLoading}
                      rows={4}
                      className="rounded-xl"
                    />
                  </div>
                )}
              </form.Field>

              <div className="space-y-4">
                <Label>Outcomes</Label>
                <form.Field name="outcomes">
                  {(field) => (
                    <div className="space-y-3">
                      {field.state.value.map((outcome, index) => (
                        <Input
                          key={index}
                          type="text"
                          value={outcome}
                          onChange={(e) => {
                            const newOutcomes = [...field.state.value];
                            newOutcomes[index] = e.target.value;
                            field.handleChange(newOutcomes);
                          }}
                          onBlur={field.handleBlur}
                          placeholder={`Outcome ${index + 1}`}
                          disabled={isLoading}
                          className="rounded-xl"
                        />
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          field.handleChange([...field.state.value, ""]);
                        }}
                        disabled={isLoading}
                        className={`w-full ${secondaryButtonClass}`}
                      >
                        + Add Outcome
                      </Button>
                    </div>
                  )}
                </form.Field>
              </div>

              {error && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-4 sm:flex-row">
                <Button
                  type="submit"
                  className={`flex-1 ${primaryButtonClass}`}
                  disabled={isLoading}
                >
                  {isLoading ? "Creating..." : "Create Market"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className={`flex-1 ${secondaryButtonClass}`}
                  onClick={() => navigate({ to: "/" })}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/markets/new")({
  component: CreateMarketPage,
});