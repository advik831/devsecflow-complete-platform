import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useLogout() {
  const { toast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/logout");
      return response;
    },
    onSuccess: () => {
      // Clear all queries and refresh authentication state
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Goodbye!",
        description: "You have been logged out successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive", 
        title: "Logout failed",
        description: error.message,
      });
    },
  });

  return {
    logout: () => logoutMutation.mutate(),
    isLoggingOut: logoutMutation.isPending,
  };
}