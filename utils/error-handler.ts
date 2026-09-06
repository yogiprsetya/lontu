import { toast } from '~/components/ui/toast';

export const errorHandler = (err: unknown): void => {
  let message = err instanceof Error ? err.message : 'An error occurred';

  // Check if the error has an error property with a message
  if (typeof err === 'object' && err !== null && 'error' in err) {
    const errorObj = err as { error?: { message?: string } };
    if (errorObj.error?.message) {
      message = errorObj.error.message;
    }
  }

  toast.add({
    title: 'Error occurred',
    description: message,
    type: 'destructive',
  });
};
